// In-page audit, run through page.evaluate by scripts/audit.mjs. Must stay one self-contained function:
// Playwright serialises it, so it cannot reference anything outside its own body.
//
// Returns { findings, checked }. A finding is { check, status, selector, text, message, ...extra } with
// status 'fail' | 'unchecked' | 'exempt'. `checked` counts the elements each check examined.
export function auditPage({ width, coarse, minTarget, minInputFont }) {
  const findings = [];
  const checked = { targets: 0, inputs: 0, contrast: 0, boundaries: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // ---------- helpers ----------
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
  const sel = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement && parts.length < 4; n = n.parentElement) {
      let s = n.localName;
      if (n.id) {
        parts.unshift(s + '#' + esc(n.id));
        break;
      }
      s += [...n.classList].slice(0, 2).map((c) => '.' + esc(c)).join('');
      const p = n.parentElement;
      if (p) {
        const same = [...p.children].filter((c) => c.localName === n.localName);
        if (same.length > 1) s += `:nth-of-type(${same.indexOf(n) + 1})`;
      }
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const label = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('value') || '')
      .replace(/\s+/g, ' ').trim();
    return t.length > 40 ? t.slice(0, 39) + '…' : t;
  };
  const add = (check, status, el, message, extra = {}) =>
    findings.push({ check, status, selector: el ? sel(el) : null, text: el ? label(el) : null, message, ...extra });

  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  // Any computed colour -> [r, g, b, a] (0-255, 0-1). Plain rgb()/color(srgb) parsed directly, the rest via canvas.
  const parse = (s) => {
    let m = s.match(/^rgba?\((.+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      const a = p.length > 3 ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      return [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), a];
    }
    m = s.match(/^color\(srgb\s+(.+)\)$/);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean);
      const a = p.length > 3 ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      return [parseFloat(p[0]) * 255, parseFloat(p[1]) * 255, parseFloat(p[2]) * 255, a];
    }
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = s;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (top, bottom) => {
    const a = top[3];
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a)];
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const floor2 = (n) => Math.floor(n * 100) / 100;

  // Effective background behind `node`: nearest-first layers composited down to the first opaque colour.
  // A background-image reached before an opaque colour makes it unverifiable, unless it is a
  // small non-repeating icon (a select chevron, a status mark): those sit in reserved padding,
  // not under the text, so the background colour still decides contrast.
  const iconOnly = (cs) =>
    !cs.backgroundImage.includes('gradient') &&
    cs.backgroundRepeat === 'no-repeat' &&
    cs.backgroundSize.split(/[\s,]+/).every((v) => /^\d+(\.\d+)?px$/.test(v) && parseFloat(v) <= 32);
  const bgOf = (node) => {
    const layers = [];
    for (let n = node; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none' && !iconOnly(cs)) return { unchecked: `background-image on ${sel(n)}` };
      const c = parse(cs.backgroundColor);
      if (c[3] >= 1) {
        let acc = c.slice(0, 3);
        for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
        return { rgb: acc };
      }
      if (c[3] > 0) layers.push(c);
    }
    let acc = [255, 255, 255]; // browser canvas default
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return { rgb: acc };
  };

  const tinyClip = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const r = n.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return true; // sr-only pattern
      }
    }
    return false;
  };
  const visible = (el) => {
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    return !tinyClip(el);
  };
  const isDisabled = (el) => !!el.closest(':disabled, [aria-disabled="true"], [data-disabled]');
  const inert = (el) => !!el.closest('[inert], [aria-hidden="true"]');

  // ---------- 2. overflow (first, before anything scrolls) ----------
  const de = document.documentElement;
  // Mobile emulation grows window.innerWidth to fit overflowing content, so compare with the configured width.
  if (de.scrollWidth > width || vw > width) {
    const offenders = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right <= width + 0.5) continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const pc = getComputedStyle(p);
        if (pc.position === 'fixed' || /^(auto|scroll|hidden|clip)$/.test(pc.overflowX)) {
          clipped = true;
          break;
        }
      }
      if (!clipped) offenders.add(el);
    }
    const inner = new Set();
    for (const el of offenders) for (let p = el.parentElement; p; p = p.parentElement) if (offenders.has(p)) inner.add(p);
    const list = [...offenders]
      .filter((el) => !inner.has(el))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .sort((a, b) => b.r.right - a.r.right)
      .slice(0, 6)
      .map(({ el, r }) => ({ selector: sel(el), right: Math.round(r.right), width: Math.round(r.width) }));
    findings.push({
      check: 'overflow', status: 'fail', selector: null, text: null,
      message: `scrollWidth ${de.scrollWidth} > viewport width ${width}`,
      offenders: list,
    });
  }

  // ---------- 4. inputs: font-size >= 16px ----------
  const textTypes = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'week', 'time']);
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (el.localName === 'input' && !textTypes.has(el.type)) continue;
    if (!visible(el)) continue;
    checked.inputs++;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < minInputFont) add('inputs', 'fail', el, `font-size ${floor2(fs)}px < ${minInputFont}px`, { value: fs });
  }

  // ---------- 5. text contrast ----------
  const media = [...document.querySelectorAll('img, canvas, video')]
    .map((m) => ({ m, r: m.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0);
  const seen = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = tw.nextNode(); node; node = tw.nextNode()) {
    const el = node.parentElement;
    if (!el || seen.has(el) || !/\S/.test(node.nodeValue)) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|OPTGROUP|TITLE)$/.test(el.tagName)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const tr = range.getBoundingClientRect();
    if (tr.width < 2 || tr.height < 2) continue;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
    if (tinyClip(el)) continue;
    seen.add(el);
    if (isDisabled(el)) continue;
    const cs = getComputedStyle(el);
    let opacity = 1;
    for (let n = el; n; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity);
    if (opacity === 0) continue;
    checked.contrast++;
    const fgc = parse(cs.webkitTextFillColor || cs.color);
    fgc[3] *= opacity;
    const hit = media.find(({ m, r }) => !m.contains(el) && r.left < tr.right && r.right > tr.left && r.top < tr.bottom && r.bottom > tr.top);
    if (hit) {
      add('contrast', 'unchecked', el, `text overlaps ${hit.m.localName} ${sel(hit.m)}`);
      continue;
    }
    const bg = bgOf(el);
    if (bg.unchecked) {
      add('contrast', 'unchecked', el, bg.unchecked);
      continue;
    }
    const fg = over(fgc, bg.rgb);
    const fs = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = fs >= 24 || (fs >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const r = ratio(fg, bg.rgb);
    if (r < min) {
      add('contrast', 'fail', el, `${floor2(r)}:1 < ${min}:1${large ? ' (large text)' : ''}, ${hex(fg)} on ${hex(bg.rgb)}`,
        { value: floor2(r), min, fg: hex(fg), bg: hex(bg.rgb), fontSize: fs });
    }
  }

  // ---------- 6. control boundaries: border vs surroundings >= 3:1 ----------
  const noBorderTypes = new Set(['hidden', 'button', 'submit', 'reset', 'image', 'color']);
  for (const el of document.querySelectorAll('input, select, textarea, [role="checkbox"], [role="switch"], [role="combobox"]')) {
    if (el.localName === 'input' && noBorderTypes.has(el.type)) continue;
    if (!visible(el) || isDisabled(el)) continue;
    const cs = getComputedStyle(el);
    const sides = ['Top', 'Right', 'Bottom', 'Left']
      .map((s) => ({ w: parseFloat(cs['border' + s + 'Width']), st: cs['border' + s + 'Style'], c: parse(cs['border' + s + 'Color']) }))
      .filter((s) => s.w > 0 && s.st !== 'none' && s.st !== 'hidden' && s.c[3] > 0);
    if (!sides.length) continue;
    checked.boundaries++;
    const bg = bgOf(el.parentElement || el);
    if (bg.unchecked) {
      add('boundaries', 'unchecked', el, bg.unchecked);
      continue;
    }
    let best = 0;
    let bestColor = null;
    for (const s of sides) {
      const c = over(s.c, bg.rgb);
      const r = ratio(c, bg.rgb);
      if (r > best) {
        best = r;
        bestColor = c;
      }
    }
    if (best < 3) add('boundaries', 'fail', el, `${floor2(best)}:1 < 3:1, border ${hex(bestColor)} on ${hex(bg.rgb)}`, { value: floor2(best), min: 3, fg: hex(bestColor), bg: hex(bg.rgb) });
  }

  // ---------- 3. touch / pointer targets (last: it scrolls) ----------
  const nativeSel = [
    'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary',
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="checkbox"]', '[role="switch"]',
    '[role="radio"]', '[role="option"]', '[role="menuitem"]',
  ].join(',');
  const targetSel = nativeSel + ',[tabindex]';
  const inlineInText = (el) => {
    if (el.localName !== 'a' || getComputedStyle(el).display !== 'inline') return false;
    let p = el.parentElement;
    while (p && getComputedStyle(p).display.startsWith('inline')) p = p.parentElement;
    if (!p) return false;
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      if (/\S/.test(t.nodeValue) && !t.parentElement.closest('a[href], button, [role="button"], [role="link"]')) return true;
    }
    return false;
  };
  const labelOf = (el) => (el.labels ? [...el.labels] : []);
  const x0 = window.scrollX;
  const y0 = window.scrollY;
  const focusedBefore = document.activeElement;
  for (const el of document.querySelectorAll(targetSel)) {
    // [tabindex="-1"] alone (e.g. <main>) is programmatic focus, not a control; a real control keeps its role either way.
    if (!el.matches(nativeSel) && parseInt(el.getAttribute('tabindex'), 10) < 0) continue;
    if (isDisabled(el) || inert(el) || !visible(el)) continue;
    const exempt = el.getAttribute('data-audit-exempt');
    if (exempt) {
      add('targets', 'exempt', el, `exempt: ${exempt}`);
      continue;
    }
    if (inlineInText(el)) {
      add('targets', 'exempt', el, 'exempt: inline link in running text');
      continue;
    }
    checked.targets++;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    let r = el.getBoundingClientRect();
    const offscreen = () => r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw;
    let focused = false;
    if (offscreen()) {
      // Fixed elements that only appear on focus (skip links): measure them focused.
      el.focus({ preventScroll: true });
      focused = true;
      r = el.getBoundingClientRect();
      if (offscreen()) {
        add('targets', 'exempt', el, 'exempt: off-screen and not revealed by focus');
        continue;
      }
    }
    const w = Math.max(r.width, minTarget);
    const h = Math.max(r.height, minTarget);
    const cxm = r.left + r.width / 2;
    const cym = r.top + r.height / 2;
    const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));
    const labels = labelOf(el);
    let miss = 0;
    let blocker = null;
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        // Inset 1.5px: stacked rows that share a 1px border legitimately overlap by a pixel.
        const px = clamp(cxm + dx * (w / 2 - 1.5), vw);
        const py = clamp(cym + dy * (h / 2 - 1.5), vh);
        const hitEl = document.elementFromPoint(px, py);
        const ok = hitEl && (hitEl === el || el.contains(hitEl) || labels.some((l) => l.contains(hitEl)));
        if (!ok) {
          miss++;
          if (!blocker) blocker = hitEl ? sel(hitEl) : 'nothing (outside viewport)';
        }
      }
    }
    if (miss) {
      add('targets', 'fail', el,
        `${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10}px; ${miss}/9 points of the ${minTarget}x${minTarget} area miss it (first hit: ${blocker})`,
        { value: { width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 }, min: minTarget });
    }
    if (focused && document.activeElement === el && focusedBefore !== el) el.blur();
  }
  window.scrollTo(x0, y0);

  return { findings, checked, coarse, innerWidth: vw, innerHeight: vh };
}
