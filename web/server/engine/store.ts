import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const SHOTS_DIR = path.join(DATA_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

export type Rect = { x: number; y: number; w: number; h: number };
export type Utterance = { id: string; role: string; name: string; speech: string; rect: Rect; issues: string[]; sel?: string; level?: number; silent?: boolean };
export type FocusStep = { n: number; id?: string; tag?: string; role?: string; name?: string; rect?: Rect; visibleRing?: boolean; sel?: string; trap?: boolean; body?: boolean; shot?: string };
export type ViolationNode = { target: string; html: string; failureSummary: string; rect: Rect | null; data?: any };
export type Violation = { rule: string; impact: 'critical' | 'serious' | 'moderate' | 'minor'; help: string; description: string; helpUrl: string; wcag: string[]; nodes: ViolationNode[]; page: string };
export type PageResult = { url: string; title: string; violations: Violation[]; passes: number; incomplete: number; screenshot?: string; size?: { w: number; h: number } };
export type Persona = { key: string; name: string; status: 'waiting' | 'running' | 'done' | 'failed'; summary: string; metric?: string; tone?: 'good' | 'warn' | 'bad' };
export type AgentStep = { n: number; thought: string; speak: string; action: string; targetId?: string; targetName?: string; text?: string; heard?: string[]; shot?: string; ok?: boolean };
export type AgentRun = { id: string; goal: string; mode: 'screen-reader' | 'keyboard'; patched: boolean; status: 'running' | 'success' | 'failed'; steps: AgentStep[]; verdict: string; brain: string };
export type EvidenceEntry = { seq: number; at: string; kind: string; detail: any; prev: string; hash: string };
export type Fix = { id: string; rule: string; title: string; wcag: string[]; impact: string; selector: string; before: string; after: string; explanation: string; patch: any; source: 'deterministic' | 'ai'; approved?: boolean };

export type Scan = {
  id: string;
  url: string;
  createdAt: string;
  finishedAt?: string;
  status: 'queued' | 'running' | 'done' | 'error';
  error?: string;
  label?: string;
  providers: { compute: string; web: string; llm: string };
  vm?: { id: string; desktopUrl?: string | null; startedAt: number; ratePerHour: number; status: string };
  pages: PageResult[];
  discovered: string[];
  transcript: Utterance[];
  focus: FocusStep[];
  keyboard?: { reachable: number; clickables: number; trap: boolean; trapAt?: string; noRing: number };
  targets?: { total: number; smallCount: number; small: any[] };
  readability?: { grade: number; words: number; sentences: number; label: string };
  personas: Persona[];
  score?: number;
  grade?: string;
  breakdown?: { label: string; penalty: number }[];
  risk?: { level: string; score: number; factors: { label: string; value: string; weight: number }[]; lawsuitBarriers: string[]; disclaimer: string };
  fixes: Fix[];
  agentRuns: AgentRun[];
  evidence: EvidenceEntry[];
  verifiedFrom?: string; // when this scan verifies a patch of another scan
  patched?: boolean;
  monitorId?: string;
};

export type ScanEvent = { type: string; [k: string]: any };

const scans = new Map<string, Scan>();
const events = new Map<string, ScanEvent[]>();
export const bus = new EventEmitter();
bus.setMaxListeners(200);

const DB = path.join(DATA_DIR, 'scans.json');
try {
  const saved: Scan[] = JSON.parse(fs.readFileSync(DB, 'utf8'));
  for (const s of saved) {
    if (s.status === 'running' || s.status === 'queued') { s.status = 'error'; s.error = 'Server restarted during scan'; }
    scans.set(s.id, s);
  }
} catch {}

let saveTimer: NodeJS.Timeout | null = null;
export function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const all = [...scans.values()].slice(-60);
    fs.writeFileSync(DB, JSON.stringify(all));
  }, 400);
}

export const newId = (p = 'scn') => `${p}_${randomBytes(5).toString('hex')}`;

export function createScan(url: string, providers: Scan['providers'], extra: Partial<Scan> = {}): Scan {
  const s: Scan = {
    id: newId(), url, createdAt: new Date().toISOString(), status: 'queued', providers,
    pages: [], discovered: [], transcript: [], focus: [], personas: [], fixes: [], agentRuns: [], evidence: [], ...extra,
  };
  scans.set(s.id, s);
  events.set(s.id, []);
  persist();
  return s;
}

export const getScan = (id: string) => scans.get(id);
export const listScans = () => [...scans.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function emit(scanId: string, ev: ScanEvent) {
  const list = events.get(scanId) || [];
  const e = { ...ev, t: Date.now() };
  list.push(e);
  events.set(scanId, list);
  bus.emit(scanId, e);
}
export const pastEvents = (scanId: string) => events.get(scanId) || [];

/** Tamper-evident evidence trail: every agent action is SHA-256 hash-chained. */
export function evidence(scan: Scan, kind: string, detail: any) {
  const prev = scan.evidence.length ? scan.evidence[scan.evidence.length - 1].hash : 'GENESIS';
  const entry = { seq: scan.evidence.length + 1, at: new Date().toISOString(), kind, detail, prev };
  const hash = createHash('sha256').update(prev + JSON.stringify({ ...entry, prev: undefined })).digest('hex');
  const full = { ...entry, hash };
  scan.evidence.push(full);
  emit(scan.id, { type: 'evidence', entry: { seq: full.seq, kind, hash: hash.slice(0, 12), at: full.at } });
  return full;
}

export function verifyChain(entries: EvidenceEntry[]) {
  let prev = 'GENESIS';
  for (const e of entries) {
    if (e.prev !== prev) return { ok: false, brokenAt: e.seq };
    const h = createHash('sha256').update(prev + JSON.stringify({ seq: e.seq, at: e.at, kind: e.kind, detail: e.detail, prev: undefined })).digest('hex');
    if (h !== e.hash) return { ok: false, brokenAt: e.seq };
    prev = e.hash;
  }
  return { ok: true, length: entries.length, head: prev };
}

export function fileHash(p: string) {
  try { return createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { return null; }
}
