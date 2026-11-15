/**
 * Compute layer — boat.dev cloud VMs with live desktops.
 * Each agent run can get its own isolated Ubuntu VM with Chrome; we stream its desktop.
 * Without a key, the agent drives a local headless Chromium instead.
 */
const BASE = process.env.BOAT_API_BASE || 'https://boat.dev/api/v1';
export const boatStats = { sandboxes: 0, provider: 'local chromium' };
const key = () => process.env.BOAT_API_KEY;
export const boatAvailable = () => !!key();
export function initBoat() {
  boatStats.provider = process.env.FOGHORN_ON_BOAT ? 'boat.dev cloud VM (this server)' : key() ? 'boat.dev cloud VMs' : 'local chromium (add BOAT_API_KEY)';
  return boatStats.provider;
}

async function call(path: string, body?: unknown, method = 'POST') {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(`boat ${path} ${res.status} ${j?.message || ''}`);
  return j;
}

export async function createSandbox(ttlSeconds = 1800): Promise<string> {
  const j = await call('/sandboxes', { ttlSeconds });
  boatStats.sandboxes++;
  return j.sandbox.id as string;
}

export async function waitReady(id: string, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const j = await call(`/sandboxes/${id}`, undefined, 'GET');
    const s = j?.sandbox?.state;
    if (['ready', 'idle', 'running'].includes(s)) return s;
    if (s === 'error') throw new Error('sandbox error');
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error('sandbox not ready in time');
}

export async function runCommand(id: string, command: string, timeoutSeconds = 300) {
  const j = await call(`/sandboxes/${id}/commands`, { command, timeoutSeconds });
  return { exitCode: j.exitCode as number, stdout: (j.stdout || '') as string, stderr: (j.stderr || '') as string };
}

export async function desktopUrl(id: string): Promise<string | null> {
  for (let i = 0; i < 20; i++) {
    const j = await call(`/sandboxes/${id}/desktop?vnc=1`, { publicAccess: true });
    if (j.desktopUrl) return j.desktopUrl;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

export async function stopSandbox(id: string) {
  try {
    await call(`/sandboxes/${id}/stop`);
  } catch {}
}
