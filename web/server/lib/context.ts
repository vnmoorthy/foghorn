/**
 * Web context layer — Context.dev (search / scrape / crawl / map / monitors).
 * Falls back to direct fetch so the product still works with no key.
 */
const BASE = 'https://api.context.dev/v1';
export const contextStats = { calls: 0, provider: 'direct fetch' };

const key = () => process.env.CONTEXT_DEV_API_KEY;
export const contextAvailable = () => !!key();
export function initContext() {
  contextStats.provider = key() ? 'Context.dev' : 'direct fetch (add CONTEXT_DEV_API_KEY)';
  return contextStats.provider;
}

async function call(path: string, body?: unknown, method = 'POST') {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  contextStats.calls++;
  if (!res.ok) throw new Error(`context.dev ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function scrapeMarkdown(url: string): Promise<{ title: string; markdown: string } | null> {
  if (key()) {
    try {
      const r: any = await call('/web/scrape', { url, formats: { markdown: true }, sharedParams: { mainContentOnly: true } });
      return { title: r?.metadata?.title || url, markdown: r?.markdown?.data || '' };
    } catch (e) {
      console.warn('[context] scrape failed', (e as Error).message);
    }
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Foghorn-A11y-Agent' }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || url;
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { title, markdown: text.slice(0, 20000) };
  } catch {
    return null;
  }
}

export async function mapUrls(domainOrUrl: string, limit = 12): Promise<string[]> {
  const u = new URL(domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`);
  if (key()) {
    try {
      const r: any = await call(`/web/urls?domain=${encodeURIComponent(u.hostname)}`, undefined, 'GET');
      const urls: string[] = (r?.urls || []).map((x: any) => (typeof x === 'string' ? x : x.url)).filter(Boolean);
      if (urls.length) return urls.slice(0, limit);
    } catch (e) {
      console.warn('[context] map failed', (e as Error).message);
    }
  }
  return [];
}

export async function webSearch(query: string, numResults = 6): Promise<{ url: string; title: string; description: string }[]> {
  if (key()) {
    try {
      const r: any = await call('/web/search', { query, numResults });
      return (r?.results || []).map((x: any) => ({ url: x.url, title: x.title, description: x.description || '' }));
    } catch (e) {
      console.warn('[context] search failed', (e as Error).message);
    }
  }
  return [];
}

export async function createMonitor(name: string, url: string, webhookUrl: string, instructions: string) {
  if (!key()) return { id: `local_${Date.now()}`, status: 'active (local scheduler)', local: true };
  try {
    return await call('/monitors', { name, target: { type: 'page', url, instructions }, webhook: { url: webhookUrl } });
  } catch (e) {
    return { id: `local_${Date.now()}`, status: 'active (local scheduler)', local: true, error: (e as Error).message };
  }
}
