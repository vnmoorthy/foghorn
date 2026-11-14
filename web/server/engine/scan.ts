import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { Scan, emit, evidence, persist, SHOTS_DIR, Violation, PageResult, FocusStep, Persona, fileHash } from './store.js';
import { buildFixes } from './fixes.js';
import { mapUrls, contextAvailable } from '../lib/context.js';

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
export const INPAGE = fs.readFileSync(new URL('./inpage.js', import.meta.url), 'utf8');

let browser: Browser | null = null;
export async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  const exe = process.env.CHROME_PATH;
  try {
    browser = await chromium.launch(exe ? { executablePath: exe, headless: true } : { channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function newContext(patch?: string): Promise<BrowserContext> {
  const b = await getBrowser();
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, bypassCSP: true, ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Foghorn/1.0',
  });
  await ctx.addInitScript(INPAGE);
  if (patch) await ctx.addInitScript(patch);
  return ctx;
}

export async function gotoSafe(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  } catch (e) {
    if (!page.url() || page.url() === 'about:blank') throw e;
  }
  await page.evaluate(INPAGE).catch(() => {});
  await dismissCookieBanners(page);
  await page.waitForTimeout(400);
}

async function dismissCookieBanners(page: Page) {
  // Privacy-preserving: prefer "reject"/"necessary only" over "accept".
  const labels = [/reject all/i, /only necessary/i, /necessary only/i, /decline/i, /reject/i, /^close$/i];
  for (const re of labels) {
    const btn = page.getByRole('button', { name: re }).first();
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) { await btn.click({ timeout: 1000 }).catch(() => {}); break; }
  }
}

export async function shot(page: Page, scanId: string, name: string, fullPage = false) {
  const dir = path.join(SHOTS_DIR, scanId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.jpg`);
  if (fullPage) {
    const h = await page.evaluate('Math.min(document.documentElement.scrollHeight, 6000)').catch(() => 800) as number;
    await page.screenshot({ path: file, type: 'jpeg', quality: 72, fullPage: true, clip: { x: 0, y: 0, width: 1280, height: Math.max(800, h) } }).catch(async () => {
      await page.screenshot({ path: file, type: 'jpeg', quality: 72 });
    });
  } else {
    await page.screenshot({ path: file, type: 'jpeg', quality: 62 });
  }
  return `/shots/${scanId}/${name}.jpg`;
}

async function runAxe(page: Page, pageUrl: string): Promise<{ violations: Violation[]; passes: number; incomplete: number }> {
  await page.evaluate(AXE);
  const res: any = await page.evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] }, resultTypes: ['violations'] })`);
  const violations: Violation[] = res.violations.map((v: any) => ({
    rule: v.id, impact: v.impact || 'minor', help: v.help, description: v.description, helpUrl: v.helpUrl,
    wcag: v.tags.filter((t: string) => /^wcag\d+$/.test(t)), page: pageUrl,
    nodes: v.nodes.slice(0, 25).map((n: any) => ({
      target: Array.isArray(n.target) ? String(n.target[n.target.length - 1]) : String(n.target),
      html: n.html, failureSummary: n.failureSummary, rect: null,
      data: n.any?.[0]?.data && typeof n.any[0].data === 'object' ? n.any[0].data : undefined,
    })),
  }));
  const sels = violations.flatMap((v) => v.nodes.map((n) => n.target));
  const rects: any[] = await page.evaluate(`window.__fh.rects(${JSON.stringify(sels)})`).catch(() => []) as any[];
  let i = 0;
  for (const v of violations) for (const n of v.nodes) n.rect = rects[i++] || null;
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
  violations.sort((a, b) => order[a.impact] - order[b.impact] || b.nodes.length - a.nodes.length);
  return { violations, passes: res.passes?.length || 0, incomplete: res.incomplete?.length || 0 };
}

function fleschKincaid(text: string) {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const syl = (w: string) => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length); };
  const syllables = words.reduce((s, w) => s + syl(w), 0);
  const wc = Math.max(1, words.length);
  const grade = +(0.39 * (wc / sentences) + 11.8 * (syllables / wc) - 15.59).toFixed(1);
  const label = grade <= 6 ? 'Easy' : grade <= 9 ? 'Plain' : grade <= 12 ? 'Hard' : 'Very hard';
  return { grade: Math.max(0, grade), words: wc, sentences, label };
}

function setPersona(scan: Scan, key: string, patch: Partial<Persona>) {
  const p = scan.personas.find((x) => x.key === key);
  if (p) Object.assign(p, patch);
  emit(scan.id, { type: 'persona', persona: p });
}

async function keyboardWalk(scan: Scan, page: Page, maxTabs = 45) {
  const steps: FocusStep[] = [];
  const seen = new Set<string>();
  let same = 0, last = '', trap = false, trapAt = '', noRing = 0;
  await page.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0,0)');
  for (let n = 1; n <= maxTabs; n++) {
    await page.evaluate('window.__fhTabPrevented = false').catch(() => {});
    await page.keyboard.press('Tab');
    await page.waitForTimeout(90);
    const f: any = await page.evaluate('window.__fh.focusInfo()').catch(() => ({ body: true }));
    if (f.body) { if (n > 2) break; else continue; }
    const key = f.sel || f.id;
    if (key === last) same++; else same = 0;
    last = key;
    const step: FocusStep = { n, ...f };
    if (!f.visibleRing) noRing++;
    if (same >= 2 && f.prevented) { trap = true; trapAt = f.sel; step.trap = true; }
    if (n <= 30 && (n % 3 === 1 || step.trap)) {
      await page.evaluate(`(() => { const el = document.activeElement; if (el && el.scrollIntoView) el.scrollIntoView({block:'center'}); })()`).catch(() => {});
      step.shot = await shot(page, scan.id, `kb-${n}`);
    }
    steps.push(step);
    emit(scan.id, { type: 'focus', step });
    if (trap) break;
    if (same >= 3) break; // single-control cycle, not a trap
    if (seen.has(key) && n > 5 && steps.length > 4 && steps[0].sel === key) break; // full cycle
    seen.add(key);
  }
  return { steps, trap, trapAt, noRing, reachable: seen.size };
}

function computeScore(scan: Scan) {
  const w = { critical: 11, serious: 6, moderate: 2.5, minor: 0.8 } as const;
  const home = scan.pages[0];
  const breakdown: { label: string; penalty: number }[] = [];
  let axeP = 0;
  for (const p of scan.pages) for (const v of p.violations) axeP += w[v.impact] * Math.min(1 + Math.log2(v.nodes.length), 4) * (p === home ? 1 : 0.35);
  breakdown.push({ label: 'WCAG violations (axe-core)', penalty: Math.min(55, axeP) });
  const silent = scan.transcript.filter((u) => u.role === 'generic-clickable').length;
  const noName = scan.transcript.filter((u) => u.issues.includes('no-name')).length;
  breakdown.push({ label: 'Screen-reader barriers', penalty: Math.min(18, silent * 1.5 + noName * 1.2) });
  const kb = scan.keyboard;
  let kbP = 0;
  if (kb) { if (kb.trap) kbP += 12; kbP += Math.min(6, kb.noRing * 0.4); if (kb.clickables) kbP += Math.max(0, 1 - kb.reachable / kb.clickables) * 8; }
  breakdown.push({ label: 'Keyboard access', penalty: Math.min(20, kbP) });
  breakdown.push({ label: 'Small touch targets', penalty: Math.min(4, (scan.targets?.smallCount || 0) * 0.3) });
  const total = breakdown.reduce((s, b) => s + b.penalty, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  return { score, grade, breakdown: breakdown.map((b) => ({ ...b, penalty: Math.round(b.penalty) })) };
}

function computeRisk(scan: Scan) {
  const v = scan.pages.flatMap((p) => p.violations);
  const has = (...rules: string[]) => v.some((x) => rules.includes(x.rule));
  const generic = scan.transcript.some((u) => u.role === 'generic-clickable');
  // Barrier categories most frequently cited in ADA web-accessibility demand letters & lawsuits.
  const lawsuitBarriers = [
    has('image-alt', 'role-img-alt') && 'Images without text alternatives',
    has('label', 'select-name') && 'Form fields without labels',
    has('button-name', 'link-name', 'input-button-name') || generic ? 'Unlabeled buttons & links' : '',
    has('color-contrast') && 'Low-contrast text',
    scan.keyboard?.trap || generic ? 'Keyboard inaccessible controls / traps' : '',
    has('html-has-lang') && 'Missing page language',
  ].filter(Boolean) as string[];
  const crit = v.filter((x) => x.impact === 'critical').length;
  const ser = v.filter((x) => x.impact === 'serious').length;
  const failedFlow = scan.agentRuns.some((a) => a.status === 'failed') || !!scan.keyboard?.trap;
  const host = (() => { try { return new URL(scan.url).hostname; } catch { return ''; } })();
  const eu = /\.(eu|de|fr|it|es|nl|ie|be|at|pt|se|fi|dk|pl)$/.test(host);
  const commerce = /cart|checkout|shop|buy|price|\$\d/i.test(scan.transcript.map((u) => u.name).join(' '));
  const factors = [
    { label: 'Severity', value: `${crit} critical · ${ser} serious rule failures`, weight: Math.min(35, crit * 7 + ser * 3) },
    { label: 'Blocked key flow', value: failedFlow ? 'Yes — a disabled user could not complete a task' : 'Not detected', weight: failedFlow ? 25 : 0 },
    { label: 'Most-litigated barriers present', value: `${lawsuitBarriers.length} of 6`, weight: lawsuitBarriers.length * 5 },
    { label: 'Public accommodation (e-commerce)', value: commerce ? 'Yes — sells online' : 'Unclear', weight: commerce ? 10 : 3 },
    { label: 'Jurisdictions', value: eu ? 'US ADA + EU Accessibility Act' : 'US ADA (+ EAA if you sell to EU consumers)', weight: eu ? 10 : 5 },
  ];
  const score = Math.min(100, factors.reduce((s, f) => s + f.weight, 0));
  const level = score >= 70 ? 'SEVERE' : score >= 45 ? 'HIGH' : score >= 20 ? 'ELEVATED' : 'LOW';
  return { level, score, factors, lawsuitBarriers, disclaimer: 'Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users.' };
}

export async function runScan(scan: Scan, opts: { patch?: string; maxPages?: number; vmHook?: (page: Page) => Promise<void> } = {}) {
  scan.status = 'running';
  scan.personas = [
    { key: 'axe', name: 'WCAG Auditor', status: 'waiting', summary: 'axe-core rules engine · WCAG 2.2 AA' },
    { key: 'sr', name: 'Screen-reader user', status: 'waiting', summary: 'Hears the page through the accessibility tree' },
    { key: 'kb', name: 'Keyboard-only user', status: 'waiting', summary: 'Tabs through every control, no mouse' },
    { key: 'vision', name: 'Low-vision & color-blind', status: 'waiting', summary: 'Contrast + deuteranopia/protanopia/blur sims' },
    { key: 'motor', name: 'Motor / tremor', status: 'waiting', summary: 'Touch-target sizes (WCAG 2.5.8)' },
    { key: 'cog', name: 'Cognitive load', status: 'waiting', summary: 'Reading level (Flesch-Kincaid)' },
  ];
  emit(scan.id, { type: 'status', status: 'running', personas: scan.personas });
  evidence(scan, 'scan.start', { url: scan.url, providers: scan.providers, patched: !!opts.patch, engine: 'axe-core ' + require('axe-core/package.json').version });

  let ctx: BrowserContext | null = null;
  try {
    ctx = await newContext(opts.patch);
    const page = await ctx.newPage();
    emit(scan.id, { type: 'log', msg: `Launching browser · ${scan.providers.compute}` });
    await gotoSafe(page, scan.url);
    const meta: any = await page.evaluate('window.__fh.meta()');
    const heroShot = await shot(page, scan.id, 'home', true);
    const home: PageResult = { url: page.url(), title: meta.title, violations: [], passes: 0, incomplete: 0, screenshot: heroShot, size: { w: 1280, h: Math.min(meta.height, 6000) } };
    scan.pages.push(home);
    emit(scan.id, { type: 'page', page: { url: home.url, title: home.title, screenshot: heroShot, size: home.size } });
    evidence(scan, 'page.load', { url: home.url, title: home.title, screenshotSha256: fileHash(path.join(SHOTS_DIR, scan.id, 'home.jpg')) });

    // Discover additional pages via Context.dev (map) or same-origin links.
    const maxPages = opts.maxPages ?? 3;
    let more: string[] = [];
    if (maxPages > 1 && !scan.url.includes('/demo/')) {
      more = (await mapUrls(scan.url, 20)).filter((u) => u !== scan.url);
      if (!more.length) more = await page.evaluate(`Array.from(new Set(Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith(location.origin) && !h.includes('#') && h !== location.href))).slice(0, 20)`) as string[];
      more = more.slice(0, maxPages - 1);
      scan.discovered = more;
      emit(scan.id, { type: 'log', msg: `Discovered ${more.length} more page(s) via ${contextAvailable() ? 'Context.dev map' : 'link crawl'}` });
    }

    // Persona 1: WCAG auditor
    setPersona(scan, 'axe', { status: 'running' });
    const ax = await runAxe(page, home.url);
    Object.assign(home, ax);
    const nodes = ax.violations.reduce((s, v) => s + v.nodes.length, 0);
    setPersona(scan, 'axe', { status: 'done', metric: `${ax.violations.length} rules · ${nodes} elements`, tone: ax.violations.length > 5 ? 'bad' : ax.violations.length ? 'warn' : 'good', summary: `${ax.violations.filter((v) => v.impact === 'critical').length} critical, ${ax.violations.filter((v) => v.impact === 'serious').length} serious` });
    emit(scan.id, { type: 'violations', page: home.url, violations: ax.violations });
    evidence(scan, 'audit.axe', { page: home.url, rules: ax.violations.map((v) => ({ rule: v.rule, impact: v.impact, wcag: v.wcag, count: v.nodes.length })) });

    // Persona 2: screen reader
    setPersona(scan, 'sr', { status: 'running' });
    scan.transcript = await page.evaluate('window.__fh.walk({limit: 320})') as any;
    const silent = scan.transcript.filter((u) => u.role === 'generic-clickable');
    const unnamed = scan.transcript.filter((u) => u.issues.includes('no-name') || u.issues.includes('missing-alt'));
    setPersona(scan, 'sr', { status: 'done', metric: `${scan.transcript.length} announcements`, tone: silent.length + unnamed.length > 3 ? 'bad' : silent.length + unnamed.length ? 'warn' : 'good', summary: `${silent.length} mouse-only controls · ${unnamed.length} unlabeled` });
    emit(scan.id, { type: 'transcript', transcript: scan.transcript });
    evidence(scan, 'persona.screen-reader', { announcements: scan.transcript.length, mouseOnly: silent.length, unlabeled: unnamed.length });

    // Persona 5 + 6 (fast, run before keyboard which mutates scroll)
    setPersona(scan, 'motor', { status: 'running' });
    scan.targets = await page.evaluate('window.__fh.targets()') as any;
    setPersona(scan, 'motor', { status: 'done', metric: `${scan.targets!.smallCount} of ${scan.targets!.total} targets < 24px`, tone: scan.targets!.smallCount > 4 ? 'warn' : 'good', summary: 'WCAG 2.5.8 Target Size (Minimum)' });
    setPersona(scan, 'cog', { status: 'running' });
    scan.readability = fleschKincaid(await page.evaluate('window.__fh.text()') as string);
    setPersona(scan, 'cog', { status: 'done', metric: `Grade ${scan.readability.grade} · ${scan.readability.label}`, tone: scan.readability.grade > 12 ? 'warn' : 'good', summary: `${scan.readability.words} words analysed` });

    // Persona 4: vision
    setPersona(scan, 'vision', { status: 'running' });
    const cc = ax.violations.find((v) => v.rule === 'color-contrast');
    setPersona(scan, 'vision', { status: 'done', metric: cc ? `${cc.nodes.length} low-contrast texts` : 'Contrast OK', tone: cc ? (cc.nodes.length > 4 ? 'bad' : 'warn') : 'good', summary: 'Simulations ready: deuteranopia · protanopia · tritanopia · blur' });

    // Persona 3: keyboard
    setPersona(scan, 'kb', { status: 'running' });
    if (opts.vmHook) await opts.vmHook(page).catch(() => {});
    const kw = await keyboardWalk(scan, page);
    scan.focus = kw.steps;
    const clickables = Math.max(meta.clickables || 0, kw.reachable);
    scan.keyboard = { reachable: kw.reachable, clickables, trap: kw.trap, trapAt: kw.trapAt, noRing: kw.noRing };
    setPersona(scan, 'kb', {
      status: 'done', tone: kw.trap ? 'bad' : kw.noRing > 3 ? 'warn' : 'good',
      metric: kw.trap ? `TRAPPED after ${kw.steps.length} tabs` : `${kw.reachable} of ${clickables} controls reachable`,
      summary: kw.trap ? `Focus stuck in ${kw.trapAt}` : `${kw.noRing} focus stops had no visible ring`,
    });
    evidence(scan, 'persona.keyboard', { ...scan.keyboard, steps: kw.steps.length });

    // Secondary pages (WCAG audit only)
    for (const u of more) {
      try {
        emit(scan.id, { type: 'log', msg: `Auditing ${u}` });
        const p2 = await ctx.newPage();
        await gotoSafe(p2, u);
        const r = await runAxe(p2, u);
        const pr: PageResult = { url: u, title: await p2.title(), ...r };
        scan.pages.push(pr);
        emit(scan.id, { type: 'subpage', page: { url: u, title: pr.title, count: r.violations.length } });
        evidence(scan, 'audit.axe', { page: u, rules: r.violations.map((v) => ({ rule: v.rule, impact: v.impact, count: v.nodes.length })) });
        await p2.close();
      } catch (e) {
        emit(scan.id, { type: 'log', msg: `Skipped ${u}: ${(e as Error).message.slice(0, 80)}` });
      }
    }

    Object.assign(scan, computeScore(scan));
    scan.risk = computeRisk(scan);
    scan.fixes = buildFixes(scan);
    scan.status = 'done';
    scan.finishedAt = new Date().toISOString();
    evidence(scan, 'scan.complete', { score: scan.score, grade: scan.grade, risk: scan.risk.level, fixes: scan.fixes.length });
    emit(scan.id, { type: 'done', score: scan.score, grade: scan.grade });
  } catch (e) {
    scan.status = 'error';
    scan.error = (e as Error).message.slice(0, 300);
    emit(scan.id, { type: 'error', error: scan.error });
  } finally {
    await ctx?.close().catch(() => {});
    persist();
  }
  return scan;
}

export function recompute(scan: Scan) {
  Object.assign(scan, computeScore(scan));
  scan.risk = computeRisk(scan);
}
