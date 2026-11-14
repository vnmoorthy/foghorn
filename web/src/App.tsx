import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Waves, Play, Pause, Ear, Keyboard, Eye, Hand, Brain, ShieldCheck, Bot, Wrench, ScrollText, Radar, ArrowRight, Check, X,
  Download, Sparkles, Loader2, AlertTriangle, History, Bell, Cpu, Globe, Zap, ChevronRight, RotateCcw, Volume2, Link2, FlaskConical,
} from 'lucide-react';

// ---------------- types ----------------
type Rect = { x: number; y: number; w: number; h: number };
type Utt = { id: string; role: string; name: string; speech: string; rect: Rect; issues: string[]; sel?: string; silent?: boolean };
type Persona = { key: string; name: string; status: string; summary: string; metric?: string; tone?: 'good' | 'warn' | 'bad' };
type VNode = { target: string; html: string; failureSummary: string; rect: Rect | null };
type Violation = { rule: string; impact: string; help: string; description: string; helpUrl: string; wcag: string[]; nodes: VNode[]; page: string };
type Fix = { id: string; rule: string; title: string; wcag: string[]; impact: string; selector: string; before: string; after: string; explanation: string; source: string; approved?: boolean; react?: string };
type Step = { n: number; thought: string; speak: string; action: string; targetName?: string; text?: string; heard?: string[]; shot?: string; ok?: boolean };
type Run = { id: string; goal: string; patched: boolean; status: string; steps: Step[]; verdict: string; brain: string };
type Focus = { n: number; rect?: Rect; name?: string; role?: string; visibleRing?: boolean; trap?: boolean; shot?: string; sel?: string };
type Scan = {
  id: string; url: string; status: string; error?: string; createdAt: string; label?: string; verifiedFrom?: string; patched?: boolean;
  providers: { compute: string; web: string; llm: string };
  vm?: { id: string; desktopUrl?: string | null; status: string; startedAt: number; ratePerHour: number };
  pages: { url: string; title: string; violations: Violation[]; passes: number; screenshot?: string; size?: { w: number; h: number } }[];
  transcript: Utt[]; focus: Focus[]; personas: Persona[]; score?: number; grade?: string; breakdown?: { label: string; penalty: number }[];
  keyboard?: { reachable: number; clickables: number; trap: boolean; trapAt?: string; noRing: number };
  risk?: { level: string; score: number; factors: { label: string; value: string; weight: number }[]; lawsuitBarriers: string[]; disclaimer: string };
  fixes: Fix[]; agentRuns: Run[]; evidence: { seq: number; at: string; kind: string; hash: string; detail: any }[];
  readability?: { grade: number; label: string };
};
type Summary = { id: string; url: string; status: string; score?: number; grade?: string; risk?: string; title?: string; screenshot?: string; createdAt: string; violations: number; label?: string; verifiedFrom?: string; agent?: string };

const api = async (p: string, init?: RequestInit) => {
  const r = await fetch(p, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
};
const DEFAULT_GOAL = 'Add the Yellow Storm Raincoat to the cart and check out';
const DEMOS = [
  { label: 'Driftwood Outfitters', sub: 'demo store · broken', url: '/demo/driftwood', goal: DEFAULT_GOAL },
  { label: 'Driftwood (fixed)', sub: 'demo store · accessible', url: '/demo/driftwood-fixed', goal: DEFAULT_GOAL },
  { label: 'boat.dev', sub: 'live site', url: 'https://boat.dev', goal: '' },
  { label: 'context.dev', sub: 'live site', url: 'https://www.context.dev', goal: '' },
];
const impactColor: Record<string, string> = { critical: 'bg-coral/15 text-coral ring-coral/30', serious: 'bg-orange-400/15 text-orange-300 ring-orange-400/30', moderate: 'bg-beam/15 text-beam ring-beam/30', minor: 'bg-tide/10 text-tide ring-tide/30' };
const toneColor = { good: 'text-kelp', warn: 'text-beam', bad: 'text-coral' } as const;
const scoreColor = (s?: number) => (s == null ? '#6b7a99' : s >= 90 ? '#2ee59d' : s >= 70 ? '#ffd166' : s >= 50 ? '#ff9f43' : '#ff5d73');

// ---------------- routing ----------------
function useRoute() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => { const f = () => setHash(location.hash || '#/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return hash.slice(1);
}
const go = (p: string) => { location.hash = p; };

// ---------------- speech ----------------
function speak(text: string, rate = 1.15, onEnd?: () => void) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate; u.pitch = 1;
    const v = speechSynthesis.getVoices().find((x) => /Samantha|Alex|Daniel|Google US English/i.test(x.name)) || speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
    speechSynthesis.speak(u);
  } catch { onEnd?.(); }
}

// ================= APP =================
export default function App() {
  const route = useRoute();
  const [status, setStatus] = useState<any>(null);
  useEffect(() => { const f = () => api('/api/status').then(setStatus).catch(() => {}); f(); const t = setInterval(f, 5000); return () => clearInterval(t); }, []);
  const scanId = route.startsWith('/scan/') ? route.slice(6) : null;
  return (
    <div className="min-h-full bg-ink-950 text-slate-100">
      <svg width="0" height="0" className="absolute">
        <filter id="protanopia"><feColorMatrix values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" /></filter>
        <filter id="deuteranopia"><feColorMatrix values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" /></filter>
        <filter id="tritanopia"><feColorMatrix values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" /></filter>
        <filter id="achromatopsia"><feColorMatrix values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" /></filter>
      </svg>
      <TopBar status={status} route={route} />
      <AnimatePresence mode="wait">
        {scanId ? <ScanView key={scanId} id={scanId} status={status} /> : route === '/history' ? <HistoryView key="h" /> : route === '/monitors' ? <MonitorsView key="m" /> : <Home key="home" status={status} />}
      </AnimatePresence>
    </div>
  );
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border border-beam/50" />
      <div className="absolute inset-[22%] rounded-full border border-beam/70" />
      <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, #ffd16600 0deg, #ffd166aa 40deg, #ffd16600 60deg)', animation: 'sweep 2.6s linear infinite' }} />
      <div className="h-1.5 w-1.5 rounded-full bg-beam shadow-[0_0_10px_#ffd166]" />
    </div>
  );
}

function Pill({ ok, icon, label, value }: { ok: boolean; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="hidden lg:flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs" title={value}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-kelp shadow-[0_0_8px_#2ee59d]' : 'bg-beam'}`} />
      {icon}<span className="text-slate-300">{label}</span>
      <span className="text-slate-500 max-w-[140px] truncate">{ok ? 'live' : 'fallback'}</span>
    </div>
  );
}

function TopBar({ status, route }: { status: any; route: string }) {
  const k = status?.keys || {};
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-5 py-3">
        <button onClick={() => go('/')} className="flex items-center gap-2.5" aria-label="Foghorn home">
          <Logo />
          <span className="font-serif text-2xl tracking-tight">Foghorn</span>
        </button>
        <nav className="ml-4 flex items-center gap-1 text-sm" aria-label="Main">
          {[['/', 'Scan', Radar], ['/history', 'History', History], ['/monitors', 'Monitors', Bell]].map(([p, l, I]: any) => (
            <button key={p} onClick={() => go(p)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${route === p ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}><I size={15} />{l}</button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Pill ok={!!k.boat} icon={<Cpu size={13} className="text-tide" />} label="boat.dev" value={status?.providers?.compute} />
          <Pill ok={!!k.context} icon={<Globe size={13} className="text-tide" />} label="Context.dev" value={status?.providers?.web} />
          <Pill ok={!!k.nyte} icon={<Zap size={13} className="text-tide" />} label="NY Token Exchange" value={status?.providers?.llm} />
          {status?.llm?.calls > 0 && <div className="rounded-full glass px-3 py-1.5 font-mono text-xs text-beam">${status.llm.costUsd.toFixed(4)} · {status.llm.calls} calls</div>}
        </div>
      </div>
    </header>
  );
}

// ================= HOME =================
function Home({ status }: { status: any }) {
  const [url, setUrl] = useState('');
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [recent, setRecent] = useState<Summary[]>([]);
  useEffect(() => { api('/api/scans').then((r) => setRecent(r.slice(0, 6))).catch(() => {}); }, []);
  const start = async (u = url, g = goal) => {
    if (!u.trim()) { setErr('Enter a website URL or pick a demo below.'); return; }
    setBusy(true); setErr('');
    try { const { id } = await api('/api/scans', { method: 'POST', body: JSON.stringify({ url: u, goal: g || undefined, maxPages: u.startsWith('/demo') ? 1 : 3 }) }); go(`/scan/${id}`); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative overflow-hidden">
      <Sonar />
      <section className="relative mx-auto max-w-5xl px-5 pt-20 pb-10 text-center">
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-coral animate-pulse" /> 94.8% of the top million home pages fail WCAG · WebAIM 2025
        </motion.div>
        <motion.h1 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="font-serif text-6xl leading-[1.02] tracking-tight md:text-8xl">
          Hear your website<br /><span className="italic text-beam">the way a blind customer does.</span>
        </motion.h1>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          A fleet of AI agents browses your site as a screen-reader user, a keyboard-only user, a low-vision user and more, in real browsers on cloud VMs. Then it writes the fixes and proves they work.
        </motion.p>
        <motion.form initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} onSubmit={(e) => { e.preventDefault(); start(); }} className="mx-auto mt-10 max-w-3xl rounded-2xl glass glow-beam p-2 text-left">
          <div className="flex items-center gap-2">
            <Link2 className="ml-3 text-slate-500" size={18} />
            <label htmlFor="url" className="sr-only">Website URL</label>
            <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-store.com" className="flex-1 bg-transparent px-2 py-3 text-lg outline-none placeholder:text-slate-600" />
            <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-beam px-5 py-3 font-semibold text-ink-950 transition hover:bg-beam-2 disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <Radar size={18} />} Dive
            </button>
          </div>
          <div className="flex items-center gap-2 border-t border-white/5 px-3 pt-2 pb-1 text-sm">
            <Bot size={15} className="text-tide" />
            <label htmlFor="goal" className="text-slate-500 whitespace-nowrap">Blind agent task</label>
            <input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="optional, e.g. find pricing and sign up" className="flex-1 bg-transparent py-1.5 text-slate-300 outline-none placeholder:text-slate-600" />
          </div>
        </motion.form>
        {err && <p role="alert" className="mt-3 text-sm text-coral">{err}</p>}
        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
          {DEMOS.map((d) => (
            <button key={d.url} onClick={() => { setUrl(d.url); setGoal(d.goal); start(d.url, d.goal); }} className="group flex items-center gap-2 rounded-xl glass px-4 py-2 text-left text-sm transition hover:border-beam/40">
              <span className={`h-2 w-2 rounded-full ${d.sub.includes('broken') ? 'bg-coral' : d.sub.includes('accessible') ? 'bg-kelp' : 'bg-tide'}`} />
              <span><span className="block text-slate-200">{d.label}</span><span className="block text-[11px] text-slate-500">{d.sub}</span></span>
              <ChevronRight size={14} className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-beam" />
            </button>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 md:grid-cols-6">
        {[[Ear, 'Screen reader', 'Speaks the accessibility tree'], [Keyboard, 'Keyboard-only', 'Tab walk · trap detection'], [Eye, 'Low vision', 'Contrast + color-blind sims'], [Hand, 'Motor', 'Touch targets ≥ 24px'], [Brain, 'Cognitive', 'Reading grade'], [ShieldCheck, 'WCAG 2.2 AA', 'axe-core rules engine']].map(([I, t, s]: any, i) => (
          <motion.div key={t} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }} className="rounded-2xl glass p-4">
            <I size={20} className="text-beam" /><div className="mt-3 text-sm font-medium">{t}</div><div className="text-xs text-slate-500">{s}</div>
          </motion.div>
        ))}
      </section>

      {recent.length > 0 && (
        <section className="relative mx-auto max-w-6xl px-5 py-14">
          <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-slate-500">Recent dives</h2>
          <div className="grid gap-3 md:grid-cols-3">{recent.map((s) => <ScanCard key={s.id} s={s} />)}</div>
        </section>
      )}
      <footer className="relative pb-10 text-center text-xs text-slate-600">Built aboard the Historic Klamath · Boat Hackathon 2026 · compute {status?.providers?.compute} · web {status?.providers?.web} · brain {status?.providers?.llm}</footer>
    </motion.main>
  );
}

function Sonar() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-260px] h-[900px] w-[900px] -translate-x-1/2 opacity-60">
      {[0, 1, 2, 3].map((i) => <div key={i} className="absolute inset-0 rounded-full border border-tide/10" style={{ transform: `scale(${0.25 + i * 0.25})` }} />)}
      <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,209,102,.10) 50deg, transparent 70deg)', animation: 'sweep 7s linear infinite' }} />
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(76,201,240,.08), transparent 60%)' }} />
    </div>
  );
}

function ScanCard({ s }: { s: Summary }) {
  return (
    <button onClick={() => go(`/scan/${s.id}`)} className="group overflow-hidden rounded-2xl glass text-left transition hover:border-beam/40">
      <div className="relative h-32 overflow-hidden bg-ink-800">
        {s.screenshot && <img src={s.screenshot} alt="" className="w-full object-cover object-top opacity-80 transition group-hover:opacity-100" />}
        <div className="absolute right-2 top-2 rounded-lg bg-ink-950/80 px-2 py-1 font-mono text-sm font-semibold" style={{ color: scoreColor(s.score) }}>{s.score ?? '—'}</div>
        {s.verifiedFrom && <div className="absolute left-2 top-2 rounded-md bg-kelp/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-kelp">verified fixes</div>}
      </div>
      <div className="p-3">
        <div className="truncate text-sm">{s.title || s.url}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span className="truncate">{s.url.replace(/^https?:\/\//, '')}</span><span>·</span><span>{s.violations} issues</span>{s.risk && <><span>·</span><span className={s.risk === 'LOW' ? 'text-kelp' : 'text-coral'}>{s.risk}</span></>}</div>
      </div>
    </button>
  );
}

// ================= SCAN VIEW =================
function useScan(id: string) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [live, setLive] = useState<string | null>(null);
  const [agentLive, setAgentLive] = useState<Step | null>(null);
  const timer = useRef<any>(null);
  const refresh = useCallback(() => api(`/api/scans/${id}`).then(setScan).catch(() => {}), [id]);
  useEffect(() => {
    refresh();
    const es = new EventSource(`/api/scans/${id}/events`);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data);
      if (e.type === 'log') setLog((l) => [...l.slice(-30), e.msg]);
      if (e.type === 'persona' && e.persona) setLog((l) => [...l.slice(-30), `${e.persona.name}: ${e.persona.status}${e.persona.metric ? ' · ' + e.persona.metric : ''}`]);
      if (e.type === 'focus' && e.step?.shot) setLive(e.step.shot);
      if (e.type === 'agent.step') { setAgentLive(e.step); if (e.step.shot) setLive(e.step.shot); }
      if (e.type === 'evidence') setLog((l) => [...l.slice(-30), `⛓ ${e.entry.kind} · ${e.entry.hash}`]);
      clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 250);
    };
    return () => { es.close(); clearTimeout(timer.current); };
  }, [id, refresh]);
  return { scan, refresh, log, live, agentLive };
}

const TABS = [
  { key: 'hear', label: 'Hear it', icon: Volume2 },
  { key: 'agent', label: 'Blind agent', icon: Bot },
  { key: 'issues', label: 'Issues', icon: AlertTriangle },
  { key: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { key: 'fixes', label: 'Fixes', icon: Wrench },
  { key: 'evidence', label: 'Evidence', icon: ScrollText },
] as const;

function ScanView({ id, status }: { id: string; status: any }) {
  const { scan, refresh, log, live, agentLive } = useScan(id);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('hear');
  const [overlay, setOverlay] = useState<'issues' | 'focus' | 'none'>('issues');
  const [vision, setVision] = useState('none');
  const [hl, setHl] = useState<Rect | null>(null);
  const [other, setOther] = useState<Scan | null>(null);
  useEffect(() => { if (scan?.verifiedFrom) api(`/api/scans/${scan.verifiedFrom}`).then(setOther).catch(() => {}); }, [scan?.verifiedFrom]);
  if (!scan) return <div className="grid h-[70vh] place-items-center text-slate-500"><Loader2 className="animate-spin" /></div>;
  const home = scan.pages[0];
  const running = scan.status === 'running' || scan.status === 'queued';
  const allViolations = scan.pages.flatMap((p) => p.violations);
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-[1480px] px-5 py-6">
      {/* header */}
      <div className="flex flex-wrap items-center gap-5">
        <ScoreDial score={scan.score} running={running} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            {scan.verifiedFrom ? <span className="text-kelp">Verification run · fixes applied in sandbox</span> : <span>Dive</span>}
            {running && <span className="flex items-center gap-1 text-beam"><Loader2 size={12} className="animate-spin" />agents working</span>}
            {scan.status === 'error' && <span className="text-coral">error: {scan.error}</span>}
          </div>
          <h1 className="mt-1 truncate font-serif text-4xl">{home?.title || scan.url}</h1>
          <a href={scan.url} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-tide">{scan.url}</a>
        </div>
        {other && other.score != null && (
          <button onClick={() => go(`/scan/${other.id}`)} className="rounded-2xl glass px-5 py-3 text-left">
            <div className="text-xs text-slate-500">Before fixes</div>
            <div className="flex items-baseline gap-2 font-mono"><span className="text-2xl" style={{ color: scoreColor(other.score) }}>{other.score}</span><ArrowRight size={16} className="text-slate-500" /><span className="text-2xl" style={{ color: scoreColor(scan.score) }}>{scan.score ?? '…'}</span></div>
          </button>
        )}
        {scan.risk && <RiskBadge risk={scan.risk} />}
      </div>

      {/* persona fleet */}
      <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {scan.personas.map((p, i) => <PersonaCard key={p.key} p={p} i={i} />)}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        {/* left: page viewer */}
        <div className="rounded-2xl glass p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Overlay</span>
            {(['issues', 'focus', 'none'] as const).map((o) => <Seg key={o} on={overlay === o} onClick={() => setOverlay(o)}>{o === 'focus' ? 'focus path' : o}</Seg>)}
            <span className="ml-3 text-slate-500">See it as</span>
            <select aria-label="Vision simulation" value={vision} onChange={(e) => setVision(e.target.value)} className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1 text-slate-200">
              <option value="none">Typical vision</option><option value="deuteranopia">Deuteranopia (green-blind)</option><option value="protanopia">Protanopia (red-blind)</option><option value="tritanopia">Tritanopia (blue-blind)</option><option value="achromatopsia">Achromatopsia (no color)</option><option value="blur">Low vision (blur)</option><option value="cataract">Cataracts</option>
            </select>
            {scan.vm && <span className="ml-auto flex items-center gap-1 text-tide"><Cpu size={12} />boat.dev VM {scan.vm.id} · {scan.vm.status}</span>}
          </div>
          {scan.vm?.desktopUrl && <iframe title="Live boat.dev desktop" src={scan.vm.desktopUrl} allow="autoplay; fullscreen; clipboard-read; clipboard-write" className="mb-3 aspect-video w-full rounded-xl border border-tide/30" />}
          {running && live && <div className="mb-2 overflow-hidden rounded-xl border border-beam/30"><div className="flex items-center gap-2 bg-beam/10 px-3 py-1 text-xs text-beam"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />LIVE · agent's browser</div><img src={live} alt="Live view of the agent's browser" className="w-full" /></div>}
          {home?.screenshot ? (
            <PageCanvas src={home.screenshot} size={home.size} vision={vision} overlay={overlay} scan={scan} hl={hl} />
          ) : (
            <div className="grid aspect-video place-items-center rounded-xl bg-ink-850 text-slate-500"><div className="text-center"><Loader2 className="mx-auto mb-2 animate-spin text-beam" />Launching browser…</div></div>
          )}
          <div className="mt-3 max-h-28 overflow-auto rounded-lg bg-ink-900/70 p-2 font-mono text-[11px] text-slate-500 scroll-thin">
            {log.length ? log.map((l, i) => <div key={i}>› {l}</div>) : <div>› {scan.status === 'done' ? `${scan.evidence.length} evidence entries recorded` : 'waiting for agents…'}</div>}
          </div>
        </div>

        {/* right: tabs */}
        <div className="rounded-2xl glass">
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-white/5 p-2 scroll-thin">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${tab === t.key ? 'bg-beam text-ink-950 font-semibold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <t.icon size={15} />{t.label}
                {t.key === 'issues' && allViolations.length > 0 && <span className={`rounded px-1.5 text-[10px] ${tab === t.key ? 'bg-ink-950/20' : 'bg-coral/20 text-coral'}`}>{allViolations.length}</span>}
                {t.key === 'fixes' && scan.fixes.length > 0 && <span className={`rounded px-1.5 text-[10px] ${tab === t.key ? 'bg-ink-950/20' : 'bg-kelp/20 text-kelp'}`}>{scan.fixes.length}</span>}
              </button>
            ))}
          </div>
          <div className="h-[calc(100vh-330px)] min-h-[520px] overflow-auto p-4 scroll-thin">
            {tab === 'hear' && <HearIt scan={scan} onHighlight={setHl} />}
            {tab === 'agent' && <AgentPanel scan={scan} live={agentLive} refresh={refresh} />}
            {tab === 'issues' && <IssuesPanel violations={allViolations} onHighlight={setHl} />}
            {tab === 'keyboard' && <KeyboardPanel scan={scan} onHighlight={setHl} />}
            {tab === 'fixes' && <FixesPanel scan={scan} refresh={refresh} status={status} />}
            {tab === 'evidence' && <EvidencePanel scan={scan} />}
          </div>
        </div>
      </div>
    </motion.main>
  );
}

function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-md px-2 py-1 capitalize ${on ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>{children}</button>;
}

function ScoreDial({ score, running }: { score?: number; running: boolean }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = score == null ? 0 : score / 100;
  return (
    <div className="relative h-24 w-24" role="img" aria-label={`Accessibility score ${score ?? 'pending'} out of 100`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#16223a" strokeWidth="7" />
        <motion.circle cx="40" cy="40" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.4, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {score == null ? (running ? <Loader2 className="animate-spin text-beam" /> : <span className="text-slate-500">—</span>) : (
          <div className="text-center"><div className="font-mono text-3xl font-semibold" style={{ color: scoreColor(score) }}>{score}</div><div className="-mt-1 text-[10px] uppercase tracking-widest text-slate-500">score</div></div>
        )}
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: NonNullable<Scan['risk']> }) {
  const [open, setOpen] = useState(false);
  const col = risk.level === 'LOW' ? 'text-kelp border-kelp/30' : risk.level === 'ELEVATED' ? 'text-beam border-beam/30' : 'text-coral border-coral/40';
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={`rounded-2xl border bg-ink-900/60 px-5 py-3 text-left ${col}`}>
        <div className="text-xs text-slate-500">Litigation risk indicator</div>
        <div className="flex items-center gap-2 text-xl font-semibold"><AlertTriangle size={18} />{risk.level}<span className="font-mono text-sm text-slate-500">{risk.score}/100</span></div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-30 mt-2 w-[380px] rounded-2xl border border-white/10 bg-ink-850 p-4 shadow-2xl">
            {risk.factors.map((f) => <div key={f.label} className="flex justify-between gap-3 border-b border-white/5 py-1.5 text-sm"><span className="text-slate-400">{f.label}</span><span className="text-right text-slate-200">{f.value} <span className="font-mono text-xs text-slate-500">+{f.weight}</span></span></div>)}
            {risk.lawsuitBarriers.length > 0 && <div className="mt-3 text-xs text-slate-400">Most-litigated barriers found: {risk.lawsuitBarriers.join(' · ')}</div>}
            <div className="mt-3 text-[11px] italic text-slate-500">{risk.disclaimer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PersonaCard({ p, i }: { p: Persona; i: number }) {
  const icons: Record<string, any> = { axe: ShieldCheck, sr: Ear, kb: Keyboard, vision: Eye, motor: Hand, cog: Brain };
  const I = icons[p.key] || Bot;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`relative overflow-hidden rounded-xl glass p-3 ${p.status === 'running' ? 'border-beam/50' : ''}`}>
      {p.status === 'running' && <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-beam/20"><motion.div className="h-full w-1/3 bg-beam" animate={{ x: ['-100%', '300%'] }} transition={{ repeat: Infinity, duration: 1.1 }} /></div>}
      <div className="flex items-center gap-2">
        <I size={16} className={p.status === 'done' ? toneColor[p.tone || 'good'] : 'text-slate-500'} />
        <span className="truncate text-sm font-medium">{p.name}</span>
        <span className="ml-auto">{p.status === 'running' ? <Loader2 size={13} className="animate-spin text-beam" /> : p.status === 'done' ? <Check size={13} className="text-kelp" /> : <span className="text-[10px] text-slate-600">queued</span>}</span>
      </div>
      <div className={`mt-1.5 truncate font-mono text-xs ${p.status === 'done' ? toneColor[p.tone || 'good'] : 'text-slate-600'}`}>{p.metric || (p.status === 'running' ? 'working…' : '—')}</div>
      <div className="truncate text-[11px] text-slate-500">{p.summary}</div>
    </motion.div>
  );
}

function PageCanvas({ src, size, vision, overlay, scan, hl }: { src: string; size?: { w: number; h: number }; vision: string; overlay: string; scan: Scan; hl: Rect | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [natH, setNatH] = useState(size?.h || 800);
  useEffect(() => { const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); if (ref.current) ro.observe(ref.current); return () => ro.disconnect(); }, []);
  const k = w / 1280;
  const filter = vision === 'blur' ? 'blur(3px)' : vision === 'cataract' ? 'blur(2px) contrast(.7) brightness(1.15) sepia(.35)' : vision === 'none' ? 'none' : `url(#${vision})`;
  const marks = useMemo(() => scan.pages[0]?.violations.flatMap((v) => v.nodes.filter((n) => n.rect && n.rect.w > 0).map((n) => ({ r: n.rect!, impact: v.impact, help: v.help }))) || [], [scan]);
  const focus = scan.focus.filter((f) => f.rect);
  useEffect(() => { if (hl && ref.current) { const scroller = ref.current.parentElement; ref.current.querySelector('[data-hl]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); void scroller; } }, [hl]);
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-white/5 bg-white scroll-thin">
      <div ref={ref} className="relative" style={{ height: natH * k }}>
        <img src={src} alt="Screenshot of the audited page" onLoad={(e) => setNatH((e.target as HTMLImageElement).naturalHeight)} className="absolute left-0 top-0 w-full" style={{ filter }} />
        <svg className="absolute left-0 top-0" width={w} height={natH * k} viewBox={`0 0 1280 ${natH}`} aria-hidden>
          {overlay === 'issues' && marks.map((m, i) => (
            <g key={i}><rect x={m.r.x - 2} y={m.r.y - 2} width={m.r.w + 4} height={m.r.h + 4} rx="4" fill={m.impact === 'critical' ? '#ff5d7322' : '#ffd16618'} stroke={m.impact === 'critical' ? '#ff5d73' : m.impact === 'serious' ? '#ff9f43' : '#ffd166'} strokeWidth={2 / k > 3 ? 3 : 2} /><title>{m.help}</title></g>
          ))}
          {overlay === 'focus' && focus.length > 1 && (
            <polyline fill="none" stroke="#4cc9f0" strokeWidth="3" strokeDasharray="8 6" points={focus.map((f) => `${f.rect!.x + f.rect!.w / 2},${f.rect!.y + f.rect!.h / 2}`).join(' ')} />
          )}
          {overlay === 'focus' && focus.map((f) => (
            <g key={f.n}>
              <circle cx={f.rect!.x + f.rect!.w / 2} cy={f.rect!.y + f.rect!.h / 2} r="13" fill={f.trap ? '#ff5d73' : f.visibleRing ? '#2ee59d' : '#ffd166'} stroke="#04070d" strokeWidth="2" />
              <text x={f.rect!.x + f.rect!.w / 2} y={f.rect!.y + f.rect!.h / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#04070d">{f.n}</text>
            </g>
          ))}
          {hl && <rect data-hl x={hl.x - 6} y={hl.y - 6} width={hl.w + 12} height={hl.h + 12} rx="6" fill="#ffd16630" stroke="#ffd166" strokeWidth="4"><animate attributeName="stroke-opacity" values="1;.3;1" dur="1s" repeatCount="indefinite" /></rect>}
        </svg>
      </div>
    </div>
  );
}

// ---------------- Hear it ----------------
function HearIt({ scan, onHighlight }: { scan: Scan; onHighlight: (r: Rect | null) => void }) {
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [rate, setRate] = useState(1.4);
  const [onlyControls, setOnlyControls] = useState(false);
  const playRef = useRef(false);
  const items = useMemo(() => scan.transcript.filter((u) => !onlyControls || !['text'].includes(u.role)), [scan.transcript, onlyControls]);
  const listRef = useRef<HTMLDivElement>(null);
  const stop = () => { playRef.current = false; setPlaying(false); speechSynthesis.cancel(); };
  useEffect(() => () => { speechSynthesis.cancel(); }, []);
  const playFrom = (i: number) => {
    speechSynthesis.cancel();
    playRef.current = true; setPlaying(true);
    const next = (j: number) => {
      if (!playRef.current || j >= items.length) { stop(); return; }
      setIdx(j); onHighlight(items[j].rect);
      listRef.current?.querySelector(`[data-i="${j}"]`)?.scrollIntoView({ block: 'nearest' });
      const u = items[j];
      const text = u.silent ? '' : u.speech;
      if (!text) setTimeout(() => next(j + 1), 500 / rate); // silence: the control does not exist for a screen-reader user
      else speak(text, rate, () => next(j + 1));
    };
    next(i);
  };
  const silent = scan.transcript.filter((u) => u.role === 'generic-clickable').length;
  const unl = scan.transcript.filter((u) => u.issues.some((x) => ['no-name', 'missing-alt', 'filename-alt'].includes(x))).length;
  if (!scan.transcript.length) return <Empty icon={Ear} text="The screen-reader persona is listening to the page…" />;
  return (
    <div>
      <div className="rounded-xl bg-gradient-to-br from-beam/15 to-transparent p-4 ring-1 ring-beam/20">
        <div className="flex items-center gap-3">
          <button onClick={() => (playing ? stop() : playFrom(Math.max(0, idx)))} className="grid h-12 w-12 place-items-center rounded-full bg-beam text-ink-950 shadow-[0_0_30px_#ffd16666]" aria-label={playing ? 'Pause screen reader' : 'Play screen reader'}>{playing ? <Pause /> : <Play className="ml-0.5" />}</button>
          <div className="flex-1">
            <div className="font-medium">Close your eyes. This is your page.</div>
            <div className="text-xs text-slate-400">{scan.transcript.length} announcements · {silent} silent controls · {unl} unlabeled</div>
          </div>
          <Waveform active={playing} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <label htmlFor="rate">Speed</label>
          <input id="rate" type="range" min={0.8} max={3} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} className="accent-[#ffd166]" />
          <span className="font-mono">{rate.toFixed(1)}×</span>
          <span className="text-slate-600">(experienced blind users listen at 2–3×)</span>
          <label className="ml-auto flex items-center gap-1.5"><input type="checkbox" checked={onlyControls} onChange={(e) => { setOnlyControls(e.target.checked); setIdx(-1); }} className="accent-[#ffd166]" />controls only</label>
          <button onClick={() => { stop(); setIdx(-1); onHighlight(null); }} aria-label="Restart"><RotateCcw size={14} /></button>
        </div>
      </div>
      <div ref={listRef} className="mt-3 space-y-1">
        {items.map((u, i) => {
          const bad = u.issues.length > 0;
          return (
            <button key={u.id + '-' + i} data-i={i} onClick={() => { onHighlight(u.rect); if (playing) playFrom(i); else { setIdx(i); speechSynthesis.cancel(); if (!u.silent) speak(u.speech, rate); } }}
              className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${i === idx ? 'bg-beam/15 ring-1 ring-beam/40' : 'hover:bg-white/5'}`}>
              <span className={`mt-0.5 w-20 shrink-0 font-mono text-[10px] uppercase ${u.role === 'generic-clickable' ? 'text-coral' : ['button', 'link', 'textbox'].includes(u.role) ? 'text-tide' : u.role === 'heading' ? 'text-beam' : 'text-slate-600'}`}>{u.role === 'generic-clickable' ? 'mouse-only' : u.role}</span>
              <span className={`flex-1 ${u.role === 'text' ? 'text-slate-400' : ''} ${u.silent ? 'italic text-coral' : ''}`}>
                {u.silent ? '🔇 (silence) a clickable icon the screen reader cannot see' : `“${u.speech}”`}
              </span>
              {bad && <span className="shrink-0 rounded bg-coral/15 px-1.5 py-0.5 text-[10px] text-coral">{u.issues[0].replace(/-/g, ' ')}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span key={i} className="w-[3px] rounded-full bg-beam" animate={active ? { height: [6, 8 + ((i * 7) % 22), 6] } : { height: 4 }} transition={{ repeat: Infinity, duration: 0.5 + (i % 5) * 0.1, delay: i * 0.03 }} />
      ))}
    </div>
  );
}

// ---------------- Blind agent ----------------
function AgentPanel({ scan, live, refresh }: { scan: Scan; live: Step | null; refresh: () => void }) {
  const last = scan.agentRuns.at(-1);
  const [goal, setGoal] = useState(last?.goal || (scan.url.includes('/demo/') ? DEFAULT_GOAL : 'Find the pricing page'));
  const [voice, setVoice] = useState(true);
  const spoken = useRef(new Set<string>());
  const running = last?.status === 'running';
  useEffect(() => {
    if (!voice || !last) return;
    for (const s of last.steps) {
      const k = last.id + s.n;
      if (!spoken.current.has(k)) { spoken.current.add(k); if (last.status === 'running' || s === last.steps.at(-1)) speak(s.speak, 1.1); }
    }
  }, [last, voice, live]);
  useEffect(() => { if (last) for (const s of last.steps) spoken.current.add(last.id + s.n); }, []); // don't replay history on open
  const run = async (patched: boolean) => { speechSynthesis.cancel(); await api(`/api/scans/${scan.id}/agent`, { method: 'POST', body: JSON.stringify({ goal, patched }) }); setTimeout(refresh, 300); };
  return (
    <div>
      <div className="rounded-xl bg-ink-900/60 p-4 ring-1 ring-white/5">
        <div className="flex items-center gap-2 text-sm font-medium"><Bot size={16} className="text-tide" />An AI agent with the senses of a blind user</div>
        <p className="mt-1 text-xs text-slate-500">It perceives the page only through the screen-reader output: roles and accessible names, no pixels. If it can't finish the task, neither can 43 million blind people.</p>
        <label htmlFor="agoal" className="sr-only">Agent goal</label>
        <input id="agoal" value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none focus:border-beam/50" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={running || scan.status !== 'done'} onClick={() => run(false)} className="flex items-center gap-2 rounded-lg bg-beam px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-50">{running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}Run blind agent</button>
          {scan.fixes.length > 0 && <button disabled={running || scan.status !== 'done'} onClick={() => run(true)} className="flex items-center gap-2 rounded-lg border border-kelp/40 px-4 py-2 text-sm text-kelp disabled:opacity-50"><FlaskConical size={15} />Run with Foghorn fixes</button>}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-400"><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="accent-[#ffd166]" />narrate aloud</label>
        </div>
      </div>
      {scan.agentRuns.slice().reverse().map((r) => (
        <div key={r.id} className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{r.id}</span>· {r.brain}{r.patched && <span className="rounded bg-kelp/15 px-1.5 text-kelp">with fixes</span>}
          </div>
          <div className="space-y-2">
            {r.steps.map((s) => (
              <motion.div key={s.n} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 rounded-xl bg-white/[0.03] p-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tide/15 font-mono text-xs text-tide">{s.n}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">“{s.speak}”</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                    <span className={`rounded px-1.5 ${s.action === 'give_up' ? 'bg-coral/15 text-coral' : s.action === 'done' ? 'bg-kelp/15 text-kelp' : 'bg-white/5'}`}>{s.action}{s.targetName ? ` → ${s.targetName}` : ''}{s.text ? ` “${s.text}”` : ''}</span>
                    {s.heard?.length ? <span className="rounded bg-beam/10 px-1.5 text-beam">heard: {s.heard.join(' | ').slice(0, 90)}</span> : null}
                  </div>
                </div>
                {s.shot && <img src={s.shot} alt={`Agent view at step ${s.n}`} className="h-14 w-24 shrink-0 rounded-md object-cover object-top ring-1 ring-white/10" />}
              </motion.div>
            ))}
            {r.status === 'running' && <div className="flex items-center gap-2 p-3 text-sm text-beam"><Loader2 size={14} className="animate-spin" />listening…</div>}
          </div>
          {r.status !== 'running' && (
            <div className={`mt-3 rounded-xl p-4 ring-1 ${r.status === 'success' ? 'bg-kelp/10 ring-kelp/30' : 'bg-coral/10 ring-coral/30'}`}>
              <div className={`flex items-center gap-2 font-semibold ${r.status === 'success' ? 'text-kelp' : 'text-coral'}`}>{r.status === 'success' ? <Check size={18} /> : <X size={18} />}{r.status === 'success' ? 'Task completed by a blind user' : 'A blind user could not complete this task'}</div>
              <div className="mt-1 text-sm text-slate-300">{r.verdict}</div>
            </div>
          )}
        </div>
      ))}
      {!scan.agentRuns.length && <Empty icon={Bot} text={scan.status === 'done' ? 'Give the agent a task and press Run.' : 'Waiting for the audit to finish…'} />}
    </div>
  );
}

// ---------------- Issues ----------------
function IssuesPanel({ violations, onHighlight }: { violations: Violation[]; onHighlight: (r: Rect | null) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!violations.length) return <Empty icon={ShieldCheck} text="No automated WCAG failures detected yet." />;
  return (
    <div className="space-y-2">
      {violations.map((v, i) => {
        const k = v.rule + v.page + i;
        return (
          <div key={k} className="rounded-xl bg-white/[0.03] ring-1 ring-white/5">
            <button onClick={() => { setOpen(open === k ? null : k); onHighlight(v.nodes.find((n) => n.rect)?.rect || null); }} aria-expanded={open === k} className="flex w-full items-center gap-3 p-3 text-left">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${impactColor[v.impact]}`}>{v.impact}</span>
              <span className="flex-1 text-sm">{v.help}</span>
              <span className="font-mono text-xs text-slate-500">{v.nodes.length}×</span>
            </button>
            {open === k && (
              <div className="space-y-2 border-t border-white/5 p-3 text-xs">
                <div className="text-slate-400">{v.description}</div>
                <div className="flex flex-wrap gap-1">{v.wcag.map((w) => <span key={w} className="rounded bg-tide/10 px-1.5 py-0.5 font-mono text-tide">{w.replace('wcag', 'WCAG ').replace(/(\d)(\d)(\d)?$/, '$1.$2.$3').replace(/\.$/, '')}</span>)}<a href={v.helpUrl} target="_blank" rel="noreferrer" className="ml-auto text-tide hover:underline">reference ↗</a></div>
                {v.nodes.slice(0, 6).map((n, j) => (
                  <button key={j} onClick={() => onHighlight(n.rect)} className="block w-full rounded-lg bg-ink-950/70 p-2 text-left font-mono text-[11px] text-slate-300 hover:ring-1 hover:ring-beam/40">{n.html.slice(0, 180)}</button>
                ))}
                {v.page && <div className="truncate text-slate-600">page: {v.page}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Keyboard ----------------
function KeyboardPanel({ scan, onHighlight }: { scan: Scan; onHighlight: (r: Rect | null) => void }) {
  const kb = scan.keyboard;
  if (!kb) return <Empty icon={Keyboard} text="The keyboard-only persona is tabbing through the page…" />;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Reachable by Tab" value={`${kb.reachable}/${kb.clickables}`} tone={kb.reachable / Math.max(1, kb.clickables) > 0.8 ? 'good' : 'bad'} />
        <Stat label="Keyboard trap" value={kb.trap ? 'YES' : 'none'} tone={kb.trap ? 'bad' : 'good'} />
        <Stat label="No focus ring" value={String(kb.noRing)} tone={kb.noRing ? 'warn' : 'good'} />
      </div>
      {kb.trap && <div className="mt-3 rounded-xl bg-coral/10 p-3 text-sm text-coral ring-1 ring-coral/30">Focus got stuck on <code className="font-mono">{kb.trapAt}</code>. A keyboard user can never reach anything after it (WCAG 2.1.2, Level A).</div>}
      <div className="mt-3 text-xs text-slate-500">Switch the overlay to <b>focus path</b> to see the Tab order drawn on the page.</div>
      <ol className="mt-3 space-y-1">
        {scan.focus.map((f) => (
          <li key={f.n}><button onClick={() => onHighlight(f.rect || null)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5">
            <span className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] text-ink-950 ${f.trap ? 'bg-coral' : f.visibleRing ? 'bg-kelp' : 'bg-beam'}`}>{f.n}</span>
            <span className="w-16 font-mono text-[10px] uppercase text-slate-500">{f.role}</span>
            <span className="flex-1 truncate">{f.name || <i className="text-coral">no name</i>}</span>
            {!f.visibleRing && <span className="text-[10px] text-beam">no ring</span>}{f.trap && <span className="text-[10px] font-semibold text-coral">TRAP</span>}
          </button></li>
        ))}
      </ol>
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'bad' }) {
  return <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5"><div className="text-[11px] text-slate-500">{label}</div><div className={`font-mono text-xl ${toneColor[tone]}`}>{value}</div></div>;
}

// ---------------- Fixes ----------------
function FixesPanel({ scan, refresh, status }: { scan: Scan; refresh: () => void; status: any }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  if (!scan.fixes.length) return <Empty icon={Wrench} text={scan.status === 'done' ? 'Nothing to fix. This page passed the automated checks.' : 'Fixes appear when the audit finishes…'} />;
  const approved = scan.fixes.filter((f) => f.approved).length;
  const approve = async (f: Fix, v: boolean) => { await api(`/api/scans/${scan.id}/fixes/${f.id}/approve`, { method: 'POST', body: JSON.stringify({ approved: v }) }); refresh(); };
  const ai = async (f: Fix) => { setBusy(f.id); setMsg(''); try { const r = await api(`/api/scans/${scan.id}/fixes/${f.id}/ai`, { method: 'POST' }); setMsg(`AI fix generated via ${status?.providers?.llm} · $${r.costUsd}`); refresh(); } catch (e: any) { setMsg(e.message); } setBusy(null); };
  const verify = async () => { setBusy('verify'); await api(`/api/scans/${scan.id}/fixes/approve-all`, { method: 'POST' }); const { id } = await api(`/api/scans/${scan.id}/verify`, { method: 'POST' }); go(`/scan/${id}`); };
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 border-b border-white/5 bg-ink-850/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm"><b className="text-kelp">{scan.fixes.length}</b> source-level fixes · <span className="text-slate-400">{approved} approved</span></div>
          <button onClick={verify} disabled={busy === 'verify' || !!scan.verifiedFrom} className="ml-auto flex items-center gap-2 rounded-lg bg-kelp px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-50">{busy === 'verify' ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}Approve all &amp; verify in sandbox</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {[['fixes.diff', 'Source diff'], ['report.md', 'Report'], ['patch.js', 'Sandbox patch'], ['evidence.json', 'Evidence']].map(([f, l]) => <a key={f} href={`/api/scans/${scan.id}/${f}`} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-slate-300 hover:bg-white/10"><Download size={12} />{l}</a>)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">Foghorn never ships an overlay. Fixes are source diffs you merge. The patch only runs inside the sandbox to prove each fix works.</div>
        {msg && <div role="status" className="mt-2 text-xs text-beam">{msg}</div>}
      </div>
      <div className="space-y-2">
        {scan.fixes.map((f) => (
          <div key={f.id} className={`rounded-xl p-3 ring-1 ${f.approved ? 'bg-kelp/[0.06] ring-kelp/25' : 'bg-white/[0.03] ring-white/5'}`}>
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ${impactColor[f.impact] || impactColor.minor}`}>{f.impact}</span>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{f.title}</div><div className="text-xs text-slate-500">{f.explanation}</div></div>
              {f.source === 'ai' && <span className="rounded bg-tide/15 px-1.5 text-[10px] text-tide">AI</span>}
            </div>
            {f.before !== f.after && (
              <div className="mt-2 grid gap-1 font-mono text-[11px]">
                <div className="rounded-md bg-coral/10 px-2 py-1 text-coral/90"><span className="select-none opacity-60">− </span>{f.before}</div>
                <div className="rounded-md bg-kelp/10 px-2 py-1 text-kelp"><span className="select-none opacity-60">+ </span>{f.after}</div>
                {f.react && <div className="rounded-md bg-tide/10 px-2 py-1 text-tide"><span className="select-none opacity-60">jsx </span>{f.react}</div>}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <button onClick={() => approve(f, !f.approved)} className={`flex items-center gap-1 rounded-md px-2 py-1 ${f.approved ? 'bg-kelp text-ink-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}><Check size={12} />{f.approved ? 'Approved' : 'Approve'}</button>
              <button onClick={() => ai(f)} disabled={busy === f.id} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-slate-300 hover:bg-white/10 disabled:opacity-50">{busy === f.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}Improve with AI</button>
              <span className="ml-auto truncate font-mono text-[10px] text-slate-600">{f.wcag.join(' ')} · {f.selector.slice(0, 40)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Evidence ----------------
function EvidencePanel({ scan }: { scan: Scan }) {
  const [chain, setChain] = useState<any>(null);
  const [mon, setMon] = useState<any>(null);
  const check = async () => setChain(await api(`/api/scans/${scan.id}/evidence/verify`));
  const watch = async () => setMon(await api('/api/monitors', { method: 'POST', body: JSON.stringify({ scanId: scan.id }) }));
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-sm font-medium"><ScrollText size={15} className="text-beam" />Tamper-evident ledger</div>
          <p className="mt-1 text-xs text-slate-500">Every agent action, screenshot and finding is SHA-256 hash-chained, so counsel gets a defensible record.</p>
          <div className="mt-2 flex gap-2"><button onClick={check} className="rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10">Verify chain</button><a href={`/api/scans/${scan.id}/evidence.json`} className="rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10">Export</a></div>
          {chain && <div className={`mt-2 text-xs ${chain.ok ? 'text-kelp' : 'text-coral'}`}>{chain.ok ? `✓ ${chain.length} entries intact · head ${String(chain.head).slice(0, 16)}…` : `✗ chain broken at #${chain.brokenAt}`}</div>}
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-sm font-medium"><Bell size={15} className="text-tide" />Keep watch</div>
          <p className="mt-1 text-xs text-slate-500">A Context.dev change monitor re-audits on every deploy and alerts on regressions.</p>
          <button onClick={watch} disabled={!!mon || scan.status !== 'done'} className="mt-2 rounded-md bg-tide/15 px-2 py-1 text-xs text-tide hover:bg-tide/25 disabled:opacity-50">{mon ? `Watching · ${mon.provider}` : 'Start monitoring'}</button>
          {mon && <button onClick={() => go('/monitors')} className="ml-2 text-xs text-slate-400 underline">open monitors</button>}
        </div>
      </div>
      <ol className="mt-3 space-y-1 font-mono text-[11px]">
        {scan.evidence.map((e) => (
          <li key={e.seq} className="flex gap-2 rounded-md px-2 py-1 hover:bg-white/5">
            <span className="w-6 text-slate-600">{e.seq}</span><span className="w-36 truncate text-beam">{e.kind}</span><span className="flex-1 truncate text-slate-500">{JSON.stringify(e.detail).slice(0, 90)}</span><span className="text-tide">{e.hash.slice(0, 10)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Empty({ icon: I, text }: { icon: any; text: string }) {
  return <div className="grid h-60 place-items-center text-center text-sm text-slate-500"><div><I className="mx-auto mb-2 text-slate-600" />{text}</div></div>;
}

// ================= HISTORY =================
function HistoryView() {
  const [list, setList] = useState<Summary[] | null>(null);
  useEffect(() => { api('/api/scans').then(setList).catch(() => setList([])); }, []);
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-serif text-4xl">History</h1>
      {!list ? <Loader2 className="mt-6 animate-spin" /> : list.length ? <div className="mt-6 grid gap-3 md:grid-cols-3">{list.map((s) => <ScanCard key={s.id} s={s} />)}</div> : <Empty icon={History} text="No dives yet." />}
    </motion.main>
  );
}

// ================= MONITORS =================
function MonitorsView() {
  const [list, setList] = useState<any[]>([]);
  const [reg, setReg] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const load = () => api('/api/monitors').then(setList).catch(() => {});
  useEffect(() => {
    load(); api('/api/demo/regress').then((r) => setReg(r.regression));
    const es = new EventSource('/api/monitors/events');
    es.onmessage = (m) => { const e = JSON.parse(m.data); setEvents((x) => [e.type === 'monitor.alert' ? `🚨 ${e.alert.msg}` : `↻ re-auditing (${e.scanId})`, ...x].slice(0, 20)); load(); if (e.type === 'monitor.alert' && e.alert.delta < 0) speak('Regression detected. ' + e.alert.msg, 1.1); };
    const t = setInterval(load, 5000);
    return () => { es.close(); clearInterval(t); };
  }, []);
  const toggle = async () => { const r = await api('/api/demo/regress', { method: 'POST', body: JSON.stringify({ on: !reg }) }); setReg(r.regression); };
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end gap-4">
        <div><h1 className="font-serif text-4xl">Monitors</h1><p className="text-sm text-slate-500">Context.dev change monitors trigger a full re-audit whenever a watched page changes.</p></div>
        <div className="ml-auto rounded-2xl glass p-3 text-sm">
          <div className="text-xs text-slate-500">Demo: Driftwood (fixed) deploy</div>
          <button onClick={toggle} className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium ${reg ? 'bg-coral text-ink-950' : 'bg-white/10'}`}><Zap size={14} />{reg ? 'Bad deploy is live (click to roll back)' : 'Ship a bad deploy'}</button>
        </div>
      </div>
      {events.length > 0 && <div className="mt-4 rounded-xl bg-ink-900/70 p-3 font-mono text-xs text-slate-300">{events.map((e, i) => <div key={i}>{e}</div>)}</div>}
      <div className="mt-6 space-y-3">
        {list.length === 0 && <Empty icon={Bell} text="No monitors yet. Open a dive → Evidence → Start monitoring." />}
        {list.map((m) => (
          <div key={m.id} className="rounded-2xl glass p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Bell size={16} className="text-tide" /><div className="min-w-0 flex-1"><div className="truncate">{m.url}</div><div className="text-xs text-slate-500">{m.provider} · last score {m.lastScore ?? '—'} {m.lastCheck && `· checked ${new Date(m.lastCheck).toLocaleTimeString()}`}</div></div>
              {m.busy && <span className="flex items-center gap-1 text-xs text-beam"><Loader2 size={12} className="animate-spin" />re-auditing</span>}
              <button onClick={async () => { await api(`/api/monitors/${m.id}/check`, { method: 'POST' }); load(); }} className="rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10">Check now</button>
              <button onClick={() => go(`/scan/${m.scanId}`)} className="rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10">Latest dive</button>
              <button onClick={async () => { await api(`/api/monitors/${m.id}`, { method: 'DELETE' }); load(); }} aria-label="Delete monitor" className="rounded-md bg-white/5 px-2 py-1 text-xs text-coral hover:bg-white/10"><X size={12} /></button>
            </div>
            {m.alerts.map((a: any, i: number) => (
              <button key={i} onClick={() => go(`/scan/${a.scanId}`)} className={`mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${a.delta < 0 ? 'bg-coral/10 text-coral' : 'bg-kelp/10 text-kelp'}`}>{a.delta < 0 ? <AlertTriangle size={14} /> : <Check size={14} />}{a.msg}<span className="ml-auto text-xs opacity-70">{new Date(a.at).toLocaleTimeString()}</span></button>
            ))}
          </div>
        ))}
      </div>
    </motion.main>
  );
}

export { Waves };
