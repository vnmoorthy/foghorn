// Bakes real recorded Foghorn runs from a running local API into a static "live replay" site (GitHub Pages).
// Usage: (API running on :8787) node scripts/bake-replay.mjs ../site https://vnmoorthy.github.io/foghorn/
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] || '../site');
const PUBLIC = process.argv[3] || 'https://vnmoorthy.github.io/foghorn/';
const API = process.env.FOGHORN_API || 'http://localhost:8787';
const get = (p) => fetch(API + p).then((r) => (r.ok ? r.json() : Promise.reject(new Error(p + ' ' + r.status))));
const text = (p) => fetch(API + p).then((r) => r.text());

const all = (await get('/api/scans')).filter((s) => s.status === 'done');
const full = async (id) => get(`/api/scans/${id}`);
const pickLatest = async (pred) => { for (const s of all) { const f = await full(s.id); if (pred(f)) return f; } return null; };

const A = process.env.FOGHORN_A ? await full(process.env.FOGHORN_A) : await pickLatest((s) => s.url.endsWith('/demo/driftwood') && !s.verifiedFrom && s.agentRuns.some((r) => r.status === 'failed' && !r.patched) && s.agentRuns.some((r) => r.patched && r.status === 'success'))
  || await pickLatest((s) => s.url.endsWith('/demo/driftwood') && !s.verifiedFrom && s.agentRuns.some((r) => r.status === 'failed'));
const V = process.env.FOGHORN_V ? await full(process.env.FOGHORN_V) : A && (await pickLatest((s) => s.verifiedFrom === A.id && s.agentRuns.some((r) => r.status === 'success')) || await pickLatest((s) => s.verifiedFrom === A.id));
const F = await pickLatest((s) => s.url.endsWith('/demo/driftwood-fixed') && !s.verifiedFrom && !String(s.label || '').startsWith('Monitor') && s.score >= 95);
const B = null; // sponsor sites are not published in the public replay
const E = await pickLatest((s) => /example\.com/.test(s.url));
const picked = [A, V, F, B, E].filter(Boolean);
if (!A || !V) throw new Error('Need a broken-demo scan with agent runs and its verification scan');
console.log('baking', picked.map((s) => `${s.id} ${s.url} ${s.score}`).join('\n        '));

const rewriteUrl = (u) => u.replace(/^http:\/\/localhost:\d+\/demo\/([a-z-]+)$/, (_m, n) => `${PUBLIC}demo/${n}.html`);
fs.mkdirSync(path.join(OUT, 'replay/scans'), { recursive: true });
for (const s of picked) {
  s.__chain = await get(`/api/scans/${s.id}/evidence/verify`);
  s.url = rewriteUrl(s.url);
  for (const p of s.pages) p.url = rewriteUrl(p.url);
  if (s.vm) delete s.vm.desktopUrl;
  fs.writeFileSync(path.join(OUT, 'replay/scans', `${s.id}.json`), JSON.stringify(s));
  const exp = path.join(OUT, 'replay/exports', s.id);
  fs.mkdirSync(exp, { recursive: true });
  for (const f of ['report.md', 'fixes.diff', 'patch.js', 'evidence.json']) fs.writeFileSync(path.join(exp, f), await text(`/api/scans/${s.id}/${f}`));
  const shots = path.resolve('data/shots', s.id);
  if (fs.existsSync(shots)) fs.cpSync(shots, path.join(OUT, 'shots', s.id), { recursive: true });
}
const summary = (s) => ({ id: s.id, url: s.url, label: s.label, status: s.status, createdAt: s.createdAt, score: s.score, grade: s.grade, risk: s.risk?.level, title: s.pages[0]?.title, screenshot: s.pages[0]?.screenshot, violations: s.pages.reduce((n, p) => n + p.violations.length, 0), verifiedFrom: s.verifiedFrom, agent: s.agentRuns.at(-1)?.status });
const index = {
  recordedAt: new Date().toISOString(),
  status: { ok: true, replay: true, providers: { compute: 'recorded run', web: 'recorded run', llm: 'recorded run' }, keys: {}, llm: { calls: 0, costUsd: 0 } },
  scans: picked.map(summary),
  demos: { '/demo/driftwood': A.id, '/demo/driftwood-fixed': F?.id, 'https://boat.dev': B?.id },
  verify: { [A.id]: V.id },
};
fs.writeFileSync(path.join(OUT, 'replay/index.json'), JSON.stringify(index, null, 1));
fs.mkdirSync(path.join(OUT, 'demo'), { recursive: true });
for (const f of ['driftwood.html', 'driftwood-fixed.html']) fs.copyFileSync(path.resolve('server/demo', f), path.join(OUT, 'demo', f));
console.log('done →', OUT);
