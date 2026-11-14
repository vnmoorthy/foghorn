// Foghorn in-page instrumentation. Plain JS: evaluated inside the audited page.
// Exposes window.__fh with: walk() (screen-reader linearization), focusInfo(), rects(), targets(), text(), liveDrain()
(() => {
  if (window.__fh) return;

  const LANDMARK = { navigation: 1, main: 1, banner: 1, contentinfo: 1, complementary: 1, region: 1, form: 1, search: 1, dialog: 1, alertdialog: 1 };
  const INTERACTIVE = { link: 1, button: 1, checkbox: 1, radio: 1, textbox: 1, searchbox: 1, combobox: 1, listbox: 1, slider: 1, switch: 1, tab: 1, menuitem: 1, option: 1, spinbutton: 1 };
  const AMBIGUOUS = /^(click here|here|read more|more|learn more|details|link|this|go|continue|click)$/i;
  const FILENAME = /(\.(jpe?g|png|gif|webp|svg|avif|bmp)$)|(^(img|dsc|image|photo|pic)[-_ ]?\d+)/i;

  function cs(el) { try { return getComputedStyle(el); } catch { return null; } }
  function hiddenSelf(el) {
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true;
    const s = cs(el);
    return !s || s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse';
  }
  function clean(t) { return (t || '').replace(/\s+/g, ' ').trim(); }
  function textOf(el) { return clean(el.innerText || el.textContent || ''); }
  function byIds(ids) {
    return clean(ids.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean).map((e) => textOf(e)).join(' '));
  }
  function contentName(el) {
    let t = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) t += c.textContent;
        else if (c.nodeType === 1) {
          if (c.getAttribute('aria-hidden') === 'true') continue;
          const tag = c.tagName.toLowerCase();
          if (tag === 'img') { t += ' ' + (c.getAttribute('alt') || '') + ' '; continue; }
          if (tag === 'svg') { const ti = c.querySelector('title'); if (ti) t += ' ' + ti.textContent + ' '; continue; }
          const s = cs(c); if (!s || s.display === 'none' || s.visibility === 'hidden') continue;
          const al = c.getAttribute('aria-label');
          if (al) t += ' ' + al + ' '; else walk(c);
        }
      }
    };
    walk(el);
    return clean(t);
  }
  // Approximation of the W3C accessible name computation (accname 1.2), good enough for auditing.
  function nameOf(el) {
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = byIds(lb); if (t) return { name: t, from: 'labelledby' }; }
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return { name: clean(al), from: 'aria-label' };
    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || (tag === 'input' && el.type === 'image')) {
      const alt = el.getAttribute('alt');
      if (alt !== null) return { name: clean(alt), from: 'alt' };
      const ti = el.getAttribute('title'); if (ti) return { name: clean(ti), from: 'title' };
      return { name: '', from: 'missing-alt' };
    }
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (['submit', 'button', 'reset'].includes(type)) {
        const v = el.getAttribute('value');
        if (v && v.trim()) return { name: clean(v), from: 'value' };
        if (v === null && type === 'submit') return { name: 'Submit', from: 'default' };
        if (v === null && type === 'reset') return { name: 'Reset', from: 'default' };
        return { name: '', from: 'none' };
      }
      if (el.id) {
        const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (l) { const t = textOf(l); if (t) return { name: t, from: 'label' }; }
      }
      const wrap = el.closest('label');
      if (wrap) { const t = textOf(wrap); if (t) return { name: t, from: 'label' }; }
      const ti = el.getAttribute('title'); if (ti) return { name: clean(ti), from: 'title' };
      const ph = el.getAttribute('placeholder'); if (ph) return { name: clean(ph), from: 'placeholder' };
      return { name: '', from: 'none' };
    }
    if (tag === 'svg') { const ti = el.querySelector('title'); return { name: ti ? clean(ti.textContent) : '', from: 'svg-title' }; }
    const c = contentName(el);
    if (c) return { name: c, from: 'content' };
    const ti = el.getAttribute('title'); if (ti) return { name: clean(ti), from: 'title' };
    return { name: '', from: 'none' };
  }
  function roleOf(el) {
    const explicit = clean(el.getAttribute('role') || '').split(' ')[0];
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'a': case 'area': return el.hasAttribute('href') ? 'link' : '';
      case 'button': case 'summary': return 'button';
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
      case 'img': return el.getAttribute('alt') === '' ? 'presentation' : 'img';
      case 'svg': return el.querySelector('title') ? 'img' : '';
      case 'input': {
        const t = (el.getAttribute('type') || 'text').toLowerCase();
        if (t === 'hidden') return 'hidden';
        if (t === 'checkbox') return 'checkbox';
        if (t === 'radio') return 'radio';
        if (t === 'range') return 'slider';
        if (t === 'number') return 'spinbutton';
        if (['submit', 'button', 'reset', 'image'].includes(t)) return 'button';
        if (t === 'search') return 'searchbox';
        return 'textbox';
      }
      case 'select': return el.multiple || el.size > 1 ? 'listbox' : 'combobox';
      case 'textarea': return 'textbox';
      case 'nav': return 'navigation';
      case 'main': return 'main';
      case 'aside': return 'complementary';
      case 'header': return el.closest('article,section,main,aside,nav') ? '' : 'banner';
      case 'footer': return el.closest('article,section,main,aside,nav') ? '' : 'contentinfo';
      case 'form': return 'form';
      case 'section': return (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) ? 'region' : '';
      case 'ul': case 'ol': return 'list';
      case 'li': return 'listitem';
      case 'table': return 'table';
      case 'dialog': return 'dialog';
      case 'iframe': return 'iframe';
      default: return '';
    }
  }
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  }
  function focusable(el) {
    if (el.tabIndex >= 0 && !el.disabled) {
      const tag = el.tagName.toLowerCase();
      if (el.hasAttribute('tabindex')) return true;
      if (tag === 'a') return el.hasAttribute('href');
      return ['button', 'input', 'select', 'textarea', 'summary', 'iframe'].includes(tag) || el.isContentEditable;
    }
    return false;
  }
  function isClickableGeneric(el) {
    if (el.hasAttribute('onclick')) return true;
    if (el.__fhClick) return true;
    const s = cs(el);
    if (s && s.cursor === 'pointer') {
      const p = el.parentElement && cs(el.parentElement);
      return !(p && p.cursor === 'pointer');
    }
    return false;
  }
  function describeImg(el, name) {
    if (name) return name;
    const src = el.getAttribute('src') || '';
    if (src && !src.startsWith('data:')) {
      const file = src.split('?')[0].split('/').pop();
      if (file) return file;
    }
    return '';
  }
  function cssPath(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && parts.length < 6; e = e.parentElement) {
      let p = e.tagName.toLowerCase();
      if (e.id) { parts.unshift('#' + CSS.escape(e.id)); break; }
      const sib = e.parentElement ? Array.from(e.parentElement.children).filter((c) => c.tagName === e.tagName) : [];
      if (sib.length > 1) p += ':nth-of-type(' + (sib.indexOf(e) + 1) + ')';
      parts.unshift(p);
    }
    return parts.join(' > ');
  }

  let seq = 0;
  // Linearize the page the way a screen reader's browse mode reads it.
  function walk(opts) {
    opts = opts || {};
    const limit = opts.limit || 350;
    const out = [];
    let lastHeading = 0;
    let visited = 0;
    const push = (u) => { if (out.length < limit) out.push(u); };
    const tag = (el) => { if (!el.dataset.fhId) el.dataset.fhId = String(++seq); return el.dataset.fhId; };

    function visit(el, depth) {
      if (out.length >= limit || visited > 8000) return;
      visited++;
      if (hiddenSelf(el)) return;
      const tagName = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'template', 'head', 'meta', 'link'].includes(tagName)) return;
      const role = roleOf(el);
      if (role === 'hidden' || role === 'none') { /* fallthrough to children for 'none' */ if (role === 'hidden') return; }

      if (role === 'presentation' && tagName === 'img') return;
      if (role === 'img') {
        const n = nameOf(el);
        const spoken = describeImg(el, n.name);
        const issues = [];
        if (n.from === 'missing-alt') issues.push('missing-alt');
        if (n.name && FILENAME.test(n.name)) issues.push('filename-alt');
        push({ id: tag(el), role: 'image', name: n.name, speech: spoken ? spoken + ', image' : 'unlabeled image', rect: rectOf(el), issues, sel: cssPath(el) });
        return;
      }
      if (role === 'heading') {
        const level = Number(el.getAttribute('aria-level')) || Number(tagName[1]) || 2;
        const n = nameOf(el);
        const issues = [];
        if (lastHeading && level > lastHeading + 1) issues.push('heading-skip');
        if (!n.name) issues.push('empty-heading');
        lastHeading = level;
        push({ id: tag(el), role: 'heading', level, name: n.name, speech: 'heading level ' + level + ', ' + (n.name || 'blank'), rect: rectOf(el), issues, sel: cssPath(el) });
        return;
      }
      if (INTERACTIVE[role]) {
        const n = nameOf(el);
        const issues = [];
        if (!n.name) issues.push('no-name');
        if (n.from === 'placeholder') issues.push('placeholder-only');
        if (role === 'link' && n.name && AMBIGUOUS.test(n.name)) issues.push('ambiguous-link');
        if (!focusable(el) && !['option', 'menuitem', 'tab'].includes(role)) issues.push('not-focusable');
        let speech;
        const nm = n.name;
        switch (role) {
          case 'link': speech = (nm ? nm + ', ' : '') + 'link'; break;
          case 'button': speech = (nm ? nm + ', ' : '') + 'button'; break;
          case 'checkbox': case 'switch': speech = (nm ? nm + ', ' : '') + role + ', ' + (el.checked || el.getAttribute('aria-checked') === 'true' ? 'checked' : 'not checked'); break;
          case 'radio': speech = (nm ? nm + ', ' : '') + 'radio button, ' + (el.checked ? 'selected' : 'not selected'); break;
          case 'combobox': speech = (nm ? nm + ', ' : '') + 'combo box'; break;
          default: speech = (nm ? nm + ', ' : '') + 'edit text';
        }
        if (el.required || el.getAttribute('aria-required') === 'true') speech += ', required';
        if (el.getAttribute('aria-expanded')) speech += el.getAttribute('aria-expanded') === 'true' ? ', expanded' : ', collapsed';
        push({ id: tag(el), role, name: nm, speech, rect: rectOf(el), issues, sel: cssPath(el), nameFrom: n.from });
        return;
      }
      if (LANDMARK[role]) {
        const n = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') ? byIds(el.getAttribute('aria-labelledby')) : '');
        const label = { navigation: 'navigation', main: 'main', banner: 'banner', contentinfo: 'content info', complementary: 'complementary', region: 'region', form: 'form', search: 'search', dialog: 'dialog', alertdialog: 'alert dialog' }[role];
        push({ id: tag(el), role: 'landmark', name: n, speech: (n ? n + ', ' : '') + label + (role.includes('dialog') ? '' : ' landmark'), rect: rectOf(el), issues: [], sel: cssPath(el) });
      } else if (role === 'list') {
        const items = Array.from(el.children).filter((c) => c.tagName === 'LI' && !hiddenSelf(c)).length;
        if (items) push({ id: tag(el), role: 'list', name: '', speech: 'list, ' + items + ' item' + (items === 1 ? '' : 's'), rect: rectOf(el), issues: [], sel: cssPath(el) });
      } else if (!role && isClickableGeneric(el)) {
        // A mouse-only "button": the screen reader reads its text as plain text (or nothing at all).
        const t = contentName(el);
        push({ id: tag(el), role: 'generic-clickable', name: t, speech: t ? t : '', silent: !t, rect: rectOf(el), issues: ['not-a-control'], sel: cssPath(el) });
        return;
      }
      for (const c of el.childNodes) {
        if (c.nodeType === 3) {
          const t = clean(c.textContent);
          if (t.length > 1) {
            const range = document.createRange(); range.selectNodeContents(c);
            const r = range.getBoundingClientRect();
            const last = out[out.length - 1];
            if (last && last.role === 'text' && last.parent === el && last.speech.length < 220) { last.speech += ' ' + t; last.name = last.speech; }
            else push({ id: tag(el), role: 'text', name: t.slice(0, 240), speech: t.slice(0, 240), rect: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }, issues: [], parent: el });
          }
        } else if (c.nodeType === 1) visit(c, depth + 1);
      }
    }
    visit(document.body || document.documentElement, 0);
    return out.map((u) => { const { parent, ...rest } = u; return rest; });
  }

  window.__fhTabPrevented = false;
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') window.__fhTabPrevented = e.defaultPrevented; }, false);
  function focusInfo() {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { body: true };
    const s = cs(el);
    const outline = s && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
    const shadow = s && s.boxShadow && s.boxShadow !== 'none';
    const n = nameOf(el);
    const r = el.getBoundingClientRect();
    return {
      id: el.dataset.fhId || (el.dataset.fhId = String(++seq)),
      tag: el.tagName.toLowerCase(), role: roleOf(el) || 'generic', name: n.name,
      rect: rectOf(el), inViewport: r.bottom > 0 && r.top < innerHeight,
      visibleRing: !!(outline || shadow), sel: cssPath(el), prevented: !!window.__fhTabPrevented,
    };
  }

  function rects(selectors) {
    return selectors.map((sel) => {
      try { const el = document.querySelector(sel); return el ? rectOf(el) : null; } catch { return null; }
    });
  }

  function targets() {
    const els = Array.from(document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[onclick]'));
    const small = [];
    let total = 0;
    for (const el of els) {
      if (hiddenSelf(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      total++;
      const inline = el.tagName === 'A' && cs(el).display === 'inline';
      if (!inline && (r.width < 24 || r.height < 24)) small.push({ sel: cssPath(el), w: Math.round(r.width), h: Math.round(r.height), rect: rectOf(el), name: nameOf(el).name });
    }
    return { total, small: small.slice(0, 40), smallCount: small.length };
  }

  function text() { return (document.body && document.body.innerText || '').slice(0, 40000); }
  function meta() {
    return {
      title: document.title, lang: document.documentElement.getAttribute('lang') || '',
      width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      clickables: Array.from(document.querySelectorAll('*')).filter((e) => !hiddenSelf(e) && (focusable(e) || isClickableGeneric(e))).length,
    };
  }

  // Track what a screen reader would announce via live regions.
  const live = [];
  try {
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        const host = (m.target.nodeType === 1 ? m.target : m.target.parentElement);
        if (!host) continue;
        const region = host.closest('[aria-live]:not([aria-live=off]),[role=status],[role=alert],[role=log]');
        if (region) { const t = textOf(region); if (t && live[live.length - 1] !== t) live.push(t); }
      }
    });
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  } catch {}
  function liveDrain() { return live.splice(0, live.length); }

  function byId(id) { return document.querySelector('[data-fh-id="' + id + '"]'); }

  window.__fh = { walk, focusInfo, rects, targets, text, meta, liveDrain, byId, nameOf, roleOf };
})();
