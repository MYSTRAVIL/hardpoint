// In-page motion recorder for scripts/lib/audit-motion.mjs. Must stay one self-contained function:
// Playwright serialises it, so it cannot reference anything outside its own body. Installing it twice
// is harmless.
//
// It records every animation the page starts, once each: Svelte 5 transitions through
// Element.prototype.animate, CSS transitions and animations through their run and start events, and
// anything else through a document.getAnimations() sweep on every frame. A record is described when it
// is first seen, because an exit removes its element soon after. window.__hpMotion is the API
// audit-motion.mjs drives: mark() forgets what was recorded so far, take() returns what was recorded
// since, settle() waits until no finite animation runs.
export function installMotionRecorder() {
  if (window.__hpMotion) return;
  const TOKENS = ['--dur-press', '--dur-hover', '--dur-pop', '--dur-pop-exit', '--dur-sheet', '--dur-sheet-exit', '--dur-enter', '--dur-expand'];
  const FRAME_KEYS = new Set(['offset', 'computedOffset', 'easing', 'composite']);
  const seen = new WeakSet();
  let log = [];

  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
  const sel = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement && parts.length < 3; n = n.parentElement) {
      let s = n.localName;
      if (n.id) {
        parts.unshift(s + '#' + esc(n.id));
        break;
      }
      s += [...n.classList].slice(0, 2).map((c) => '.' + esc(c)).join('');
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const label = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim();
    return t.length > 40 ? t.slice(0, 39) + '…' : t;
  };
  // A duration token as the element computes it, in milliseconds; null when unset.
  const ms = (value) => {
    const v = value.trim();
    const n = parseFloat(v);
    if (Number.isNaN(n)) return null;
    return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
  };
  const finite = (a) => !!a.effect && a.effect.getComputedTiming().endTime !== Infinity;
  // 'open' or 'closed' from aria-expanded, else from a Bits UI data-state ('delayed-open' on a tooltip trigger).
  const openness = (el) => {
    const expanded = el.getAttribute('aria-expanded');
    if (expanded !== null) return expanded === 'true' ? 'open' : 'closed';
    return /open/.test(el.getAttribute('data-state') || '') ? 'open' : 'closed';
  };
  const watchers = new Map();
  let nextId = 0;

  function describe(a) {
    const effect = a.effect;
    const target = effect && effect.target;
    const timing = effect ? effect.getTiming() : {};
    // Properties whose value differs between keyframes: what the animation actually changes.
    const values = {};
    for (const frame of effect && effect.getKeyframes ? effect.getKeyframes() : []) {
      for (const [k, v] of Object.entries(frame)) if (!FRAME_KEYS.has(k)) (values[k] ??= new Set()).add(String(v));
    }
    const cs = target && target.isConnected ? getComputedStyle(target) : null;
    // A CSS transition's duration as its rule declares it. The browser shortens a transition that reverses
    // midway (hover in, then out), so the animation's own duration can fall short of the rule's.
    let declared = null;
    if (a.transitionProperty && target && target.isConnected) {
      const s = getComputedStyle(target, effect.pseudoElement || null);
      const props = s.transitionProperty.split(',').map((p) => p.trim());
      const durations = s.transitionDuration.split(',').map((d) => ms(d));
      // The rule may name a shorthand: `border-color` runs as `border-top-color` and its siblings.
      const prop = a.transitionProperty;
      const covers = (p) =>
        p === prop || prop.startsWith(p + '-') || (/^border-(color|style|width)$/.test(p) && new RegExp(`^border-[\\w-]+-${p.slice(7)}$`).test(prop));
      let i = props.findIndex(covers);
      if (i < 0) i = props.indexOf('all');
      if (i >= 0) declared = durations[i % durations.length];
    }
    return {
      // 'Animation' (element.animate: Svelte transitions), 'CSSTransition' or 'CSSAnimation'.
      type: a.constructor.name,
      target: target ? sel(target) + (effect.pseudoElement || '') : null,
      // Floating content (menus, popovers, select lists, tooltips) is positioned by Bits UI, which marks it.
      floating: !!(target && target.closest('[data-side], [data-bits-floating-content-wrapper]')),
      // The content of a Disclosure: it fades in over --dur-expand and closes with a cut.
      disclosure: !!(target && target.closest('.hp-disclosure-content')),
      duration: typeof timing.duration === 'number' ? timing.duration : 0,
      delay: timing.delay || 0,
      iterations: timing.iterations,
      rate: a.playbackRate,
      property: a.transitionProperty || null,
      declared,
      name: a.animationName || null,
      changes: Object.keys(values).filter((k) => values[k].size > 1),
      tokens: Object.fromEntries(TOKENS.map((t) => [t, cs ? ms(cs.getPropertyValue(t)) : null])),
    };
  }
  function record(a) {
    if (!a || seen.has(a)) return;
    seen.add(a);
    log.push({ a, rec: describe(a) });
  }
  const sweep = () => {
    for (const a of document.getAnimations()) record(a);
  };

  const animate = Element.prototype.animate;
  Element.prototype.animate = function (...args) {
    const a = animate.apply(this, args);
    record(a);
    return a;
  };
  addEventListener('transitionrun', sweep, true);
  addEventListener('animationstart', sweep, true);
  const frame = () => {
    sweep();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.__hpMotion = {
    reduced: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    mark() {
      sweep();
      log = [];
    },
    // The records since mark(), each with its element's computed end state if the element is still there.
    take() {
      sweep();
      const out = log.map(({ a, rec }) => {
        const t = a.effect && a.effect.target;
        if (t && t.isConnected && !a.effect.pseudoElement) {
          const cs = getComputedStyle(t);
          return { ...rec, end: { opacity: cs.opacity, transform: cs.transform } };
        }
        return rec;
      });
      log = [];
      return out;
    },
    // Resolves true once three frames in a row run no finite animation, false after `timeout` ms.
    settle(timeout = 3000) {
      return new Promise((resolve) => {
        const start = performance.now();
        let quiet = 0;
        const step = () => {
          sweep();
          const busy = document.getAnimations().some((a) => (a.pending || a.playState === 'running') && finite(a));
          quiet = busy ? 0 : quiet + 1;
          if (quiet >= 3) resolve(true);
          else if (performance.now() - start > timeout) resolve(false);
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    // Numbers every match of `selector` that has no number yet, in document order, and returns the
    // visible, enabled ones. Called once with everything closed, then again inside each open overlay, so
    // the second call finds the overlay's own triggers. The page's triggers get the same numbers after a
    // reload.
    tag(selector) {
      return [...document.querySelectorAll(selector)].flatMap((el) => {
        if (el.hasAttribute('data-motion-audit')) return [];
        const id = String(nextId++);
        el.setAttribute('data-motion-audit', id);
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden' || el.closest('[inert]')) return [];
        if (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return [];
        const tooltip = el.hasAttribute('data-tooltip-trigger') && !el.hasAttribute('aria-haspopup') && !el.hasAttribute('aria-expanded');
        return [{ id, selector: sel(el), text: label(el), tooltip, disclosure: el.classList.contains('hp-disclosure-trigger') }];
      });
    },
    // The trigger's state now: 'open', 'closed', or 'gone' if the page no longer has it.
    state(id) {
      const el = document.querySelector(`[data-motion-audit="${id}"]`);
      return el ? openness(el) : 'gone';
    },
    // Records every change of the trigger's state from now until watched(id), which returns them: a trigger
    // that opens and at once closes again shows ['open', 'closed'] although a poll may only ever see 'closed'.
    watch(id) {
      const el = document.querySelector(`[data-motion-audit="${id}"]`);
      if (!el) return;
      const changes = [];
      let last = openness(el);
      const observer = new MutationObserver(() => {
        const now = openness(el);
        if (now !== last) changes.push(now);
        last = now;
      });
      observer.observe(el, { attributes: true, attributeFilter: ['aria-expanded', 'data-state'] });
      watchers.set(id, { observer, changes });
    },
    watched(id) {
      const w = watchers.get(id);
      if (!w) return [];
      w.observer.disconnect();
      watchers.delete(id);
      return w.changes;
    },
    // How many listboxes and menus are on screen.
    lists() {
      return [...document.querySelectorAll('[role="listbox"], [role="menu"]')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      }).length;
    },
    // True when focus is where arrow keys cannot reach the open list: not on the trigger, not inside a
    // listbox or menu, and not on an expanded combobox (a combobox sheet's search field drives its list).
    strayFocus(id) {
      const a = document.activeElement;
      if (!a || a === document.body) return true;
      if (a.getAttribute('data-motion-audit') === id) return false;
      if (a.closest('[role="listbox"], [role="menu"]')) return false;
      return !(a.getAttribute('role') === 'combobox' && a.getAttribute('aria-expanded') === 'true');
    },
    // Which option or item is highlighted, by Bits UI's data-highlighted or the focused aria-activedescendant.
    highlight() {
      const h = document.querySelector('[data-highlighted]');
      const active = document.activeElement && document.activeElement.getAttribute('aria-activedescendant');
      return `${h ? sel(h) + ' ' + label(h) : ''}|${active || ''}`;
    },
  };
}
