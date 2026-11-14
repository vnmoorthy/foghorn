import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { initLlm, llmStats, llmAvailable } from './lib/llm.js';
import { initContext, contextStats, contextAvailable, createMonitor } from './lib/context.js';
import { initBoat, boatStats, boatAvailable, createSandbox, waitReady, desktopUrl, stopSandbox } from './lib/boat.js';
import { createScan, getScan, listScans, bus, pastEvents, emit, evidence, verifyChain, persist, SHOTS_DIR, newId, Scan } from './engine/store.js';
import { runScan } from './engine/scan.js';
import { runBlindAgent } from './engine/agent.js';
import { buildPatchScript, aiFix } from './engine/fixes.js';

const PORT = Number(process.env.PORT || 8787);
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const providers = () => ({ compute: boatStats.provider, web: contextStats.provider, llm: llmStats.provider });
initLlm(); initContext(); initBoat();
const startedAt = Date.now();

// ---------- demo targets (served by Foghorn itself so the live demo never depends on venue wifi) ----------
const DEMO_DIR = path.resolve(process.cwd(), 'server/demo');
let regression = false;
function regress(html: string) {
  let out = html;
  let n = 0;
  out = out.replace(/<img([^>]*?)\salt="[^"]+"/g, (m, a) => (n++ === 1 ? `<img${a}` : m)); // drop one product alt
  out = out.replace(/aria-label="([^"]*cart[^"]*)"/i, ''); // unlabel the cart button
  out = out.replace('</head>', '<style>*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}</style></head>');
  return out;
}
app.get(['/demo/driftwood', '/demo/driftwood.html'], (_req, res) => res.type('html').send(fs.readFileSync(path.join(DEMO_DIR, 'driftwood.html'), 'utf8')));
app.get(['/demo/driftwood-fixed', '/demo/driftwood-fixed.html'], (_req, res) => {
  const html = fs.readFileSync(path.join(DEMO_DIR, 'driftwood-fixed.html'), 'utf8');
  res.type('html').send(regression ? regress(html) : html);
});
app.post('/api/demo/regress', (req, res) => { regression = !!req.body?.on; res.json({ regression }); });
app.get('/api/demo/regress', (_req, res) => res.json({ regression }));

app.use('/shots', express.static(SHOTS_DIR, { maxAge: '1h' }));

// ---------- status ----------
app.get('/api/status', (_req, res) => {
  res.json({
    ok: true, uptime: Math.round((Date.now() - startedAt) / 1000),
    providers: providers(),
    keys: { nyte: llmAvailable() && llmStats.provider === 'NY Token Exchange', llm: llmAvailable(), context: contextAvailable(), boat: boatAvailable() },
    llm: { ...llmStats, costUsd: +(llmStats.costMicro / 1e6).toFixed(5), privacy: llmStats.provider === 'NY Token Exchange' ? (process.env.NYTE_PRIVACY || 'zdr') : 'n/a' },
    context: contextStats, boat: boatStats,
    scans: listScans().length,
  });
});

// ---------- scans ----------
function summary(s: Scan) {
  return {
    id: s.id, url: s.url, label: s.label, status: s.status, createdAt: s.createdAt, finishedAt: s.finishedAt, score: s.score, grade: s.grade,
    risk: s.risk?.level, title: s.pages[0]?.title, screenshot: s.pages[0]?.screenshot, violations: s.pages.reduce((n, p) => n + p.violations.length, 0),
    verifiedFrom: s.verifiedFrom, patched: s.patched, agent: s.agentRuns.at(-1)?.status,
  };
}
app.get('/api/scans', (_req, res) => res.json(listScans().map(summary)));
app.get('/api/scans/:id', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json(s);
});

function normalizeUrl(u: string, req: express.Request) {
  u = (u || '').trim();
  if (u.startsWith('/demo/')) return `http://localhost:${PORT}${u}`; // the server scans its own demo store locally (works behind boat.dev's proxy)
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return new URL(u).toString();
}

async function attachVm(scan: Scan) {
  if (!boatAvailable()) return;
  try {
    const t0 = Date.now();
    emit(scan.id, { type: 'vm', vm: { status: 'provisioning' } });
    const id = await createSandbox(1800);
    scan.vm = { id, startedAt: Date.now(), ratePerHour: 0.036, status: 'provisioning' };
    evidence(scan, 'vm.create', { provider: 'boat.dev', sandbox: id });
    emit(scan.id, { type: 'vm', vm: scan.vm });
    await waitReady(id);
    scan.vm.status = 'ready';
    const url = await desktopUrl(id);
    scan.vm.desktopUrl = url;
    // Open the audited site on the VM's desktop so the audience can watch the agent's machine live.
    await fetch(`${process.env.BOAT_API_BASE || 'https://boat.dev/api/v1'}/sandboxes/${id}/commands`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.BOAT_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: `export DISPLAY=\${DISPLAY:-:0}; (google-chrome --no-first-run --start-maximized '${scan.url.replace(/'/g, '')}' >/dev/null 2>&1 &) ; echo ok`, detached: true }),
    }).catch(() => {});
    emit(scan.id, { type: 'vm', vm: scan.vm });
    evidence(scan, 'vm.ready', { sandbox: id, bootMs: Date.now() - t0 });
    persist();
  } catch (e) {
    emit(scan.id, { type: 'log', msg: `boat.dev VM unavailable: ${(e as Error).message.slice(0, 120)}` });
    if (scan.vm) scan.vm.status = 'error';
  }
}

app.post('/api/scans', async (req, res) => {
  let url: string;
  try { url = normalizeUrl(req.body?.url, req); } catch { return res.status(400).json({ error: 'Enter a valid URL' }); }
  const scan = createScan(url, providers(), { label: req.body?.label });
  res.json({ id: scan.id });
  const goal: string | undefined = req.body?.goal;
  attachVm(scan);
  await runScan(scan, { maxPages: Number(req.body?.maxPages ?? 3) });
  if (goal && scan.status === 'done') await runBlindAgent(scan, goal);
});

app.get('/api/scans/:id/events', (req, res) => {
  const id = req.params.id;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = (e: any) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  for (const e of pastEvents(id)) send(e);
  const on = (e: any) => send(e);
  bus.on(id, on);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => { bus.off(id, on); clearInterval(ping); });
});

app.post('/api/scans/:id/agent', async (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  const goal = String(req.body?.goal || 'Add the Yellow Storm Raincoat to the cart and check out').slice(0, 300);
  const patch = req.body?.patched ? buildPatchScript(s.fixes) : undefined;
  res.json({ ok: true });
  await runBlindAgent(s, goal, { patch });
});

app.post('/api/scans/:id/fixes/:fixId/approve', (req, res) => {
  const s = getScan(req.params.id);
  const f = s?.fixes.find((x) => x.id === req.params.fixId);
  if (!s || !f) return res.status(404).json({ error: 'not found' });
  f.approved = req.body?.approved !== false;
  evidence(s, f.approved ? 'fix.approve' : 'fix.reject', { fix: f.id, rule: f.rule, selector: f.selector, by: 'human reviewer' });
  persist();
  res.json(f);
});
app.post('/api/scans/:id/fixes/approve-all', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  for (const f of s.fixes) f.approved = true;
  evidence(s, 'fix.approve-all', { count: s.fixes.length, by: 'human reviewer' });
  persist();
  res.json({ ok: true, count: s.fixes.length });
});
app.post('/api/scans/:id/fixes/:fixId/ai', async (req, res) => {
  const s = getScan(req.params.id);
  const f = s?.fixes.find((x) => x.id === req.params.fixId);
  if (!s || !f) return res.status(404).json({ error: 'not found' });
  const before = llmStats.costMicro;
  const r = await aiFix(s, f);
  if (!r) return res.status(503).json({ error: llmAvailable() ? 'The model call failed — try again.' : 'Add NYTE_API_KEY to enable AI fixes (deterministic fix shown).' });
  f.after = r.after || f.after;
  f.explanation = r.explanation || f.explanation;
  (f as any).react = r.react;
  (f as any).affected = r.who_is_affected;
  f.source = 'ai';
  evidence(s, 'fix.ai', { fix: f.id, provider: llmStats.provider });
  persist();
  res.json({ fix: f, costUsd: +((llmStats.costMicro - before) / 1e6).toFixed(6) });
});

// Verify fixes: re-run the full audit + blind agent with the approved fixes applied in an isolated sandbox.
app.post('/api/scans/:id/verify', async (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  const approved = s.fixes.filter((f) => f.approved);
  if (!approved.length) for (const f of s.fixes) f.approved = true;
  const patch = buildPatchScript(s.fixes);
  const v = createScan(s.url, providers(), { verifiedFrom: s.id, patched: true, label: 'Verification' });
  evidence(s, 'verify.start', { verificationScan: v.id, fixes: s.fixes.filter((f) => f.approved).length, patchSha256: createHash('sha256').update(patch).digest('hex') });
  res.json({ id: v.id });
  attachVm(v);
  await runScan(v, { patch, maxPages: 1 });
  const goal = s.agentRuns.at(-1)?.goal;
  if (goal && v.status === 'done') await runBlindAgent(v, goal, { patch });
  evidence(s, 'verify.done', { verificationScan: v.id, before: s.score, after: v.score });
  persist();
});

// ---------- exports ----------
app.get('/api/scans/:id/patch.js', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).end();
  res.type('application/javascript').attachment(`foghorn-verify-patch-${s.id}.js`).send('// Foghorn sandbox verification patch — for testing fixes only. Ship the source diff, never an overlay.\n' + buildPatchScript(s.fixes));
});
app.get('/api/scans/:id/fixes.diff', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).end();
  const body = s.fixes.filter((f) => f.before !== f.after).map((f) => `# ${f.title}\n# WCAG ${f.wcag.join(', ')} · ${f.impact} · selector: ${f.selector}\n--- before\n+++ after\n${f.before.split('\n').map((l) => '- ' + l).join('\n')}\n${f.after.split('\n').map((l) => '+ ' + l).join('\n')}\n`).join('\n');
  res.type('text/plain').attachment(`foghorn-fixes-${s.id}.diff`).send(body);
});
app.get('/api/scans/:id/evidence.json', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).end();
  res.attachment(`foghorn-evidence-${s.id}.json`).json({ scan: s.id, url: s.url, generatedAt: new Date().toISOString(), chain: verifyChain(s.evidence), entries: s.evidence });
});
app.get('/api/scans/:id/evidence/verify', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).end();
  res.json(verifyChain(s.evidence));
});
app.get('/api/scans/:id/report.md', (req, res) => {
  const s = getScan(req.params.id);
  if (!s) return res.status(404).end();
  const v = s.pages.flatMap((p) => p.violations);
  const lines = [
    `# Foghorn accessibility report`, ``, `**Site:** ${s.url}  `, `**Scanned:** ${s.createdAt}  `, `**Score:** ${s.score}/100 (${s.grade})  `, `**Risk indicator:** ${s.risk?.level} — ${s.risk?.disclaimer}`, ``,
    `## What disabled users experience`, ``,
    ...s.personas.map((p) => `- **${p.name}:** ${p.metric || ''} — ${p.summary}`), ``,
    ...(s.agentRuns.length ? [`## Blind agent runs`, ``, ...s.agentRuns.map((r) => `- **${r.status.toUpperCase()}** · goal: “${r.goal}”${r.patched ? ' (with fixes)' : ''} — ${r.verdict}`), ``] : []),
    `## WCAG failures (${v.length})`, ``,
    ...v.map((x) => `### ${x.help}\n- Rule: \`${x.rule}\` · Impact: **${x.impact}** · WCAG: ${x.wcag.join(', ') || 'best practice'} · Page: ${x.page}\n- Elements: ${x.nodes.length}\n- Example: \`${x.nodes[0]?.html.replace(/`/g, "'").slice(0, 160)}\`\n- Reference: ${x.helpUrl}\n`),
    `## Fixes (${s.fixes.length})`, ``,
    ...s.fixes.map((f) => `- [${f.approved ? 'x' : ' '}] **${f.title}** (${f.wcag.join(', ')}) — \`${f.selector}\``), ``,
    `## Evidence`, ``, `${s.evidence.length} hash-chained entries. Head: \`${s.evidence.at(-1)?.hash}\`. Chain valid: ${verifyChain(s.evidence).ok}.`, ``,
    `_${s.risk?.disclaimer}_`,
  ];
  res.type('text/markdown').attachment(`foghorn-report-${s.id}.md`).send(lines.join('\n'));
});

// ---------- monitors (Context.dev semantic change monitors + local watcher) ----------
type Monitor = { id: string; url: string; scanId: string; createdAt: string; provider: string; lastHash?: string; lastCheck?: string; lastScore?: number; alerts: { at: string; msg: string; scanId: string; delta: number }[]; busy?: boolean };
const monitors = new Map<string, Monitor>();
async function pageHash(url: string) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(15000) }); return createHash('sha256').update(await r.text()).digest('hex'); } catch { return null; }
}
async function triggerRescan(m: Monitor, reason: string) {
  if (m.busy) return;
  m.busy = true;
  try {
    const prev = getScan(m.scanId);
    const s = createScan(m.url, providers(), { label: `Monitor · ${reason}` });
    bus.emit('monitors', { type: 'monitor.rescan', monitor: m.id, scanId: s.id });
    await runScan(s, { maxPages: 1 });
    const delta = (s.score ?? 0) - (m.lastScore ?? prev?.score ?? 0);
    const newRules = s.pages[0]?.violations.map((v) => v.rule).filter((r) => !prev?.pages[0]?.violations.some((pv) => pv.rule === r)) || [];
    const msg = delta < 0 ? `Regression detected: score ${m.lastScore ?? prev?.score} → ${s.score}${newRules.length ? ` · new: ${newRules.join(', ')}` : ''}` : `Change re-audited: score ${s.score} (${delta >= 0 ? '+' : ''}${delta})`;
    m.alerts.unshift({ at: new Date().toISOString(), msg, scanId: s.id, delta });
    m.lastScore = s.score; m.scanId = s.id;
    bus.emit('monitors', { type: 'monitor.alert', monitor: m.id, alert: m.alerts[0] });
  } finally { m.busy = false; }
}
app.post('/api/monitors', async (req, res) => {
  const s = getScan(req.body?.scanId);
  if (!s) return res.status(404).json({ error: 'scan not found' });
  const publicBase = process.env.PUBLIC_URL;
  const ctx: any = publicBase && contextAvailable()
    ? await createMonitor(`Foghorn · ${s.url}`, s.url, `${publicBase}/api/webhooks/context`, 'Alert on any change to page structure, forms, buttons, images, navigation or checkout flow.')
    : { id: newId('mon'), local: true };
  const m: Monitor = { id: ctx.id || newId('mon'), url: s.url, scanId: s.id, createdAt: new Date().toISOString(), provider: ctx.local ? 'local watcher (15s)' : 'Context.dev monitor', lastHash: (await pageHash(s.url)) || undefined, lastScore: s.score, alerts: [] };
  monitors.set(m.id, m);
  evidence(s, 'monitor.create', { monitor: m.id, provider: m.provider });
  res.json(m);
});
app.get('/api/monitors', (_req, res) => res.json([...monitors.values()]));
app.delete('/api/monitors/:id', (req, res) => { monitors.delete(req.params.id); res.json({ ok: true }); });
app.post('/api/monitors/:id/check', async (req, res) => {
  const m = monitors.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
  await triggerRescan(m, 'manual check');
});
app.post('/api/webhooks/context', async (req, res) => {
  res.json({ ok: true });
  const url = req.body?.data?.url || req.body?.monitor?.target?.url || req.body?.url;
  for (const m of monitors.values()) if (!url || m.url === url || m.id === req.body?.monitor_id) await triggerRescan(m, 'Context.dev change.detected');
});
app.get('/api/monitors/events', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const on = (e: any) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  bus.on('monitors', on);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => { bus.off('monitors', on); clearInterval(ping); });
});
setInterval(async () => {
  for (const m of monitors.values()) {
    if (m.busy || !m.provider.startsWith('local')) continue;
    const h = await pageHash(m.url);
    m.lastCheck = new Date().toISOString();
    if (h && m.lastHash && h !== m.lastHash) { m.lastHash = h; triggerRescan(m, 'page changed'); }
    else if (h) m.lastHash = h;
  }
}, 15000);

// ---------- VM controls ----------
app.post('/api/scans/:id/vm/stop', async (req, res) => {
  const s = getScan(req.params.id);
  if (!s?.vm) return res.status(404).json({ error: 'no vm' });
  await stopSandbox(s.vm.id);
  s.vm.status = 'stopped';
  evidence(s, 'vm.stop', { sandbox: s.vm.id, seconds: Math.round((Date.now() - s.vm.startedAt) / 1000) });
  res.json(s.vm);
});

// ---------- production static frontend ----------
const dist = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|shots|demo).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ⚓ Foghorn API on http://localhost:${PORT}`);
  console.log(`     compute: ${boatStats.provider}\n     web:     ${contextStats.provider}\n     llm:     ${llmStats.provider}\n`);
});
