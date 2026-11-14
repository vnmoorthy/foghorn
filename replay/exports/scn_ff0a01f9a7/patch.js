// Foghorn sandbox verification patch — for testing fixes only. Ship the source diff, never an overlay.
(() => {
  const OPS = [];
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
    document.querySelectorAll('div,ul').forEach((e) => { if (!e.getAttribute('role') && /(^|s|-)nav(s|-|$)|navbar|menu/i.test(tagOf(e)) && e.querySelector('a') && !document.querySelector('nav,[role=navigation]')) e.setAttribute('role', 'navigation'); });
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
})();