import type { Fix, Scan, Violation, ViolationNode, Utterance } from './store.js';
import { newId } from './store.js';
import { chatJson, llmAvailable } from '../lib/llm.js';

// ---------- WCAG contrast math (real, deterministic) ----------
function parseColor(c: string): [number, number, number] | null {
  if (!c) return null;
  c = c.trim().toLowerCase();
  let m = c.match(/^#([0-9a-f]{3})$/);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as any;
  m = c.match(/^#([0-9a-f]{6})/);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as any;
  m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[ ,/]+/).map(Number); return [p[0], p[1], p[2]]; }
  return null;
}
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrast = (a: number[], b: number[]) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
const hex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Find the closest color to `fg` (same hue) that meets `target` contrast against `bg`. */
export function fixContrast(fgS: string, bgS: string, target = 4.5) {
  const fg = parseColor(fgS), bg = parseColor(bgS);
  if (!fg || !bg) return null;
  const bgL = lum(bg);
  // Darken toward black if background is light, otherwise lighten toward white.
  const toward = bgL > 0.4 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const c = fg.map((v, i) => v + (toward[i] - v) * t);
    const ratio = contrast(c, bg);
    if (ratio >= target + 0.05) return { color: hex(c), ratio: +ratio.toFixed(2), from: hex(fg), was: +contrast(fg, bg).toFixed(2) };
  }
  return { color: hex(toward), ratio: +contrast(toward, bg).toFixed(2), from: hex(fg), was: +contrast(fg, bg).toFixed(2) };
}

// ---------- name inference heuristics ----------
const ICON_WORDS: [RegExp, string][] = [
  [/cart|bag|basket/i, 'Shopping cart'], [/search|magnif/i, 'Search'], [/account|user|profile|avatar|login/i, 'Account'],
  [/menu|hamburger|burger|nav-toggle/i, 'Menu'], [/close|dismiss|x-icon/i, 'Close'], [/heart|wish|fav/i, 'Add to wishlist'],
  [/twitter|x\.com/i, 'X (Twitter)'], [/facebook/i, 'Facebook'], [/instagram/i, 'Instagram'], [/linkedin/i, 'LinkedIn'],
  [/youtube/i, 'YouTube'], [/github/i, 'GitHub'], [/next|right|forward/i, 'Next'], [/prev|left|back/i, 'Previous'],
  [/play/i, 'Play'], [/pause/i, 'Pause'], [/share/i, 'Share'], [/subscribe|newsletter|submit|send/i, 'Subscribe'], [/chat|message/i, 'Open chat'],
];
function inferName(html: string, context = ''): string {
  for (const [re, label] of ICON_WORDS) if (re.test(html)) return label;
  const href = html.match(/href="([^"]+)"/)?.[1];
  if (href) {
    const seg = href.split(/[?#]/)[0].split('/').filter(Boolean).pop();
    if (seg && !seg.includes('.')) return seg.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }
  if (context) return context;
  return 'Describe this control';
}
function altFromContext(node: ViolationNode, transcript: Utterance[], siteName: string): string {
  const html = node.html;
  if (/logo/i.test(html) || /header|nav/i.test(node.target)) return `${siteName} logo`;
  const file = html.match(/src="([^"]+)"/)?.[1]?.split('/').pop()?.split('?')[0] || '';
  // Use the nearest heading/text below the image in reading order as context.
  if (node.rect) {
    const near = transcript
      .filter((u) => (u.role === 'heading' || u.role === 'text') && u.rect && u.rect.y >= node.rect!.y - 10 && u.rect.y <= node.rect!.y + node.rect!.h + 160 && Math.abs(u.rect.x - node.rect!.x) < 260)
      .sort((a, b) => (a.role === 'heading' ? 0 : 1) - (b.role === 'heading' ? 0 : 1) || a.rect.y - b.rect.y)[0];
    if (near?.name) return near.name.slice(0, 90);
  }
  if (file && !file.startsWith('data:')) return file.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ');
  return 'Describe this image';
}

function setAttr(tag: string, attr: string, value: string) {
  const open = tag.match(/^<[^>]+>/)?.[0] || tag;
  const rest = tag.slice(open.length);
  const re = new RegExp(`\\s${attr}="[^"]*"`, 'i');
  const esc = value.replace(/"/g, '&quot;');
  const next = re.test(open) ? open.replace(re, ` ${attr}="${esc}"`) : open.replace(/^<([a-zA-Z0-9-]+)/, `<$1 ${attr}="${esc}"`);
  return next + rest;
}
function short(html: string) { return html.length > 220 ? html.slice(0, 217) + '…' : html; }

/** Deterministic, source-level fixes for the most common WCAG failures. */
export function buildFixes(scan: Scan): Fix[] {
  const fixes: Fix[] = [];
  const site = (() => { try { return new URL(scan.url).hostname.replace(/^www\./, '').split('.')[0].replace(/^\w/, (c) => c.toUpperCase()); } catch { return 'Site'; } })();
  const pageTitle = scan.pages[0]?.title || site;
  const siteName = /driftwood/i.test(pageTitle + scan.url) ? 'Driftwood Outfitters' : site;
  const home = scan.pages[0];
  if (!home) return fixes;

  const add = (v: Violation, node: ViolationNode, title: string, after: string, explanation: string, patch: any) =>
    fixes.push({ id: newId('fix'), rule: v.rule, title, wcag: v.wcag, impact: v.impact, selector: node.target, before: short(node.html), after: short(after), explanation, patch, source: 'deterministic' });

  for (const v of home.violations) {
    for (const node of v.nodes.slice(0, 12)) {
      switch (v.rule) {
        case 'image-alt':
        case 'role-img-alt':
        case 'input-image-alt': {
          const alt = altFromContext(node, scan.transcript, siteName);
          add(v, node, `Add alt text: “${alt}”`, setAttr(node.html, 'alt', alt), 'Screen readers announce images without alt text as “image” or read the file name. Describe what the image conveys.', { op: 'attr', sel: node.target, attr: 'alt', value: alt });
          break;
        }
        case 'button-name':
        case 'link-name': {
          const name = inferName(node.html);
          add(v, node, `Give the ${v.rule === 'link-name' ? 'link' : 'button'} a name: “${name}”`, setAttr(node.html, 'aria-label', name), 'Icon-only controls are announced as just “button” or “link”, so users cannot tell what they do.', { op: 'attr', sel: node.target, attr: 'aria-label', value: name });
          break;
        }
        case 'input-button-name': {
          const name = inferName(node.html, 'Subscribe');
          add(v, node, `Name the submit button: “${name}”`, setAttr(node.html, 'value', name), 'An empty input button is announced as “button” with no purpose.', { op: 'attr', sel: node.target, attr: 'aria-label', value: name });
          break;
        }
        case 'label':
        case 'select-name': {
          const ph = node.html.match(/placeholder="([^"]+)"/)?.[1] || node.html.match(/name="([^"]+)"/)?.[1] || 'Field';
          const label = ph.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
          add(v, node, `Label the field: “${label}”`, `<label for="…">${label}</label>\n` + setAttr(node.html, 'aria-label', label), 'Placeholder text disappears on input and is not a reliable label. Give every field a programmatic label.', { op: 'attr', sel: node.target, attr: 'aria-label', value: label });
          break;
        }
        case 'html-has-lang': {
          add(v, node, 'Declare the page language: lang="en"', '<html lang="en">', 'Without a language, screen readers may use the wrong voice and pronunciation.', { op: 'lang', value: 'en' });
          break;
        }
        case 'document-title': {
          add(v, node, `Add a descriptive page title`, `<title>${siteName}</title>`, 'The title is the first thing announced when a page loads.', { op: 'title', value: siteName });
          break;
        }
        case 'color-contrast':
        case 'color-contrast-enhanced': {
          const d = node.data || {};
          const fc = fixContrast(d.fgColor, d.bgColor, d.expectedContrastRatio ? parseFloat(d.expectedContrastRatio) : 4.5);
          if (fc) add(v, node, `Contrast ${fc.was}:1 → ${fc.ratio}:1 (color ${fc.from} → ${fc.color})`, setAttr(node.html, 'style', `color: ${fc.color}`), `Text at ${fc.was}:1 is unreadable for many low-vision and older users. WCAG AA requires ${d.expectedContrastRatio || '4.5:1'}. ${fc.color} keeps the same hue and passes.`, { op: 'style', sel: node.target, prop: 'color', value: fc.color });
          break;
        }
        case 'heading-order':
        case 'page-has-heading-one':
        case 'landmark-one-main':
        case 'region':
          if (node === v.nodes[0]) add(v, node, v.help, node.html, v.description, { op: 'structure', rule: v.rule, sel: node.target });
          break;
        default:
          if (node === v.nodes[0]) add(v, node, v.help, node.html, v.description, { op: 'none' });
      }
    }
  }

  // Mouse-only controls found by the screen-reader persona (axe often misses these).
  const generics = scan.transcript.filter((u) => u.role === 'generic-clickable').slice(0, 16);
  for (const u of generics) {
    const name = u.name || inferName(u.sel || '', '');
    fixes.push({
      id: newId('fix'), rule: 'fh-mouse-only-control', title: `Make “${name || 'icon control'}” a real button`, wcag: ['wcag211', 'wcag412'], impact: 'critical', selector: u.sel || '',
      before: `<div class="…" onclick="…">${u.name || '<svg …/>'}</div>`, after: `<button type="button"${u.name ? '' : ` aria-label="${name}"`}>${u.name || '<svg aria-hidden="true" …/>'}</button>`,
      explanation: u.silent ? 'This control has no text and is not a button, so a screen reader skips it entirely. It is invisible to blind users and unreachable by keyboard.' : 'This is a clickable <div>. Keyboard users cannot reach it, and screen readers announce it as plain text, not a button.',
      patch: { op: 'control', sel: u.sel, name: u.name ? '' : name }, source: 'deterministic',
    });
  }

  if (scan.keyboard?.trap && scan.keyboard.trapAt) {
    fixes.push({
      id: newId('fix'), rule: 'fh-keyboard-trap', title: 'Release the keyboard trap', wcag: ['wcag212'], impact: 'critical', selector: scan.keyboard.trapAt,
      before: `el.addEventListener('keydown', e => { if (e.key === 'Tab') e.preventDefault() })`, after: `// Remove the Tab interception. If this is a modal, trap only while it is open, and close on Escape.`,
      explanation: 'Keyboard users who reach this element can never leave it. WCAG 2.1.2 (No Keyboard Trap) is a Level A failure, and it blocks the rest of the page.',
      patch: { op: 'untrap', sel: scan.keyboard.trapAt }, source: 'deterministic',
    });
  }
  if (scan.keyboard && scan.keyboard.noRing > 0) {
    fixes.push({
      id: newId('fix'), rule: 'fh-focus-visible', title: `Restore visible focus (${scan.keyboard.noRing} controls had none)`, wcag: ['wcag247'], impact: 'serious', selector: '*:focus',
      before: `*:focus { outline: none; }`, after: `:focus-visible { outline: 3px solid #1a5fff; outline-offset: 2px; }`,
      explanation: 'Sighted keyboard users cannot see where they are on the page.', patch: { op: 'css', css: ':focus-visible{outline:3px solid #1a5fff !important;outline-offset:2px !important}' }, source: 'deterministic',
    });
  }
  // Dedupe identical patches.
  const seen = new Set<string>();
  return fixes.filter((f) => { const k = f.rule + '|' + f.selector; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Builds the sandbox-only verification patch. This is never shipped to production as an overlay. */
export function buildPatchScript(fixes: Fix[]): string {
  const ops = fixes.filter((f) => f.approved !== false).map((f) => f.patch).filter((p) => p && p.op !== 'none');
  return `(() => {
  const OPS = ${JSON.stringify(ops)};
  const q = (s) => { try { return document.querySelector(s); } catch { return null; } };
  const structure = () => {
    const tagOf = (e) => (e.id || '') + ' ' + (typeof e.className === 'string' ? e.className : '');
    const landmark = (e) => /^(HEADER|NAV|MAIN|FOOTER|ASIDE|SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName) || e.getAttribute('role') || /header|topbar|masthead|footer|chat|widget|toast|modal|drawer|dialog|announce/i.test(tagOf(e));
    for (const e of Array.from(document.body.children)) {
      if (e.getAttribute('role')) continue;
      if (/header|topbar|masthead/i.test(tagOf(e)) && !document.querySelector('header,[role=banner]')) e.setAttribute('role', 'banner');
      else if (/footer/i.test(tagOf(e)) && !document.querySelector('footer,[role=contentinfo]')) e.setAttribute('role', 'contentinfo');
      else if (/chat|widget|toast|modal|drawer|dialog|announce/i.test(tagOf(e))) e.setAttribute('role', 'region'), e.setAttribute('aria-label', (tagOf(e).match(/chat|announce|drawer|modal|dialog/i) || ['Panel'])[0]);
    }
    document.querySelectorAll('div,ul').forEach((e) => { if (!e.getAttribute('role') && /(^|\s|-)nav(\s|-|$)|navbar|menu/i.test(tagOf(e)) && e.querySelector('a') && !document.querySelector('nav,[role=navigation]')) e.setAttribute('role', 'navigation'); });
    if (!document.querySelector('main,[role=main]')) {
      const kids = Array.from(document.body.children).filter((e) => !landmark(e));
      if (kids.length) { const m = document.createElement('main'); kids[0].before(m); kids.forEach((k) => m.appendChild(k)); }
    }
    if (!document.querySelector('h1,[role=heading][aria-level="1"]')) {
      let best = null, size = 0;
      document.querySelectorAll('main *, body > *').forEach((e) => { if (e.children.length === 0 && (e.textContent || '').trim().length > 3) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs > size) { size = fs; best = e; } } });
      if (best) { best.setAttribute('role', 'heading'); best.setAttribute('aria-level', '1'); }
    }
  };
  let structured = false;
  const apply = () => {
    for (const o of OPS) {
      if (o.op === 'lang') document.documentElement.setAttribute('lang', o.value);
      else if (o.op === 'title') { if (!document.title || document.title.length < 8) document.title = o.value; }
      else if (o.op === 'attr') { const el = q(o.sel); if (el) el.setAttribute(o.attr, o.value); }
      else if (o.op === 'style') { const el = q(o.sel); if (el) el.style.setProperty(o.prop, o.value, 'important'); }
      else if (o.op === 'css') { if (!document.getElementById('fh-css')) { const s = document.createElement('style'); s.id = 'fh-css'; s.textContent = o.css; document.head.appendChild(s); } }
      else if (o.op === 'control') {
        const el = q(o.sel); if (!el || el.dataset.fhFixed) continue;
        el.dataset.fhFixed = '1'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        if (o.name) el.setAttribute('aria-label', o.name);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
      }
      else if (o.op === 'untrap') {
        if (!window.__fhUntrap) { window.__fhUntrap = true; window.addEventListener('keydown', (e) => { if (e.key === 'Tab' && e.target && e.target.matches && e.target.matches(o.sel)) e.stopImmediatePropagation(); }, true); }
      }
    }
    if (!structured && document.body && OPS.some((o) => o.op === 'structure')) { structured = true; structure(); }
    if (OPS.some((o) => o.op === 'control')) {
      // Dynamic content (drawers, modals) gets the same fix: every mouse-only control becomes a real button.
      document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not(textarea), .btn:not(button):not(a)').forEach((el) => {
        if (el.dataset.fhFixed || el.getAttribute('role')) return;
        el.dataset.fhFixed = '1'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        if (!(el.textContent || '').trim() && !el.getAttribute('aria-label')) { const c = ((el.id || '') + ' ' + (el.className || '') + ' ' + (el.getAttribute('onclick') || '')).toLowerCase(); el.setAttribute('aria-label', /cart|bag/.test(c) ? 'Shopping cart' : /search/.test(c) ? 'Search' : /account|user/.test(c) ? 'Account' : /close/.test(c) ? 'Close' : /menu/.test(c) ? 'Menu' : 'Button'); }
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
      });
    }
    // WCAG 4.1.3 status messages: expose toast-like notifications to screen readers.
    document.querySelectorAll('[class*=toast],[class*=snackbar],[id*=toast]').forEach((el) => { if (!el.getAttribute('role')) el.setAttribute('role', 'status'); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  new MutationObserver(() => apply()).observe(document.documentElement, { childList: true, subtree: true });
})();`;
}

/** AI-assisted fix through NY Token Exchange (ZDR privacy floor). */
export async function aiFix(scan: Scan, fix: Fix) {
  if (!llmAvailable()) return null;
  const r = await chatJson<{ explanation: string; after: string; react?: string; who_is_affected?: string }>(
    'You are a senior accessibility engineer (WCAG 2.2 AA, WAI-ARIA APG). You write minimal, correct, source-level fixes. Never recommend overlays.',
    `Site: ${scan.url}\nRule: ${fix.rule} (${fix.wcag.join(', ')})\nIssue: ${fix.title}\nCurrent HTML:\n${fix.before}\nDeterministic suggestion:\n${fix.after}\n\nReturn JSON {"explanation": "2 sentences, plain language, what a disabled user experiences and why the fix works", "after": "the corrected HTML snippet", "react": "the same fix as a React/JSX snippet", "who_is_affected": "short phrase"}`,
    { maxTokens: 700 },
  );
  return r;
}
