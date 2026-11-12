// Motion pass for `scripts/audit.mjs --motion`, run on a loaded page. The page's context sets the
// pointer (coarse = touch) and the reduced-motion preference.
//
// For every visible, enabled overlay trigger ([aria-haspopup], [aria-expanded], and Bits UI tooltip
// triggers on fine pointers; touch never opens a tooltip) it:
//   1. opens it (tap on touch, click with a mouse, hover for a tooltip) and times every animation the
//      opening started. If the pointer opened nothing, ArrowDown on the focused trigger opens it, so the
//      timings are still checked, and the pointer path is reported unchecked;
//   2. inside an open listbox or menu, presses ArrowDown, ArrowDown, ArrowUp: that must start no animation
//      (the frequency check, BRIEF "Motion");
//   3. does all of this for every trigger inside the open overlay (a select in a dialog), two levels deep;
//   4. closes it with Escape and times every animation the closing started.
// On a page that mounts a Toaster (its status line carries .hp-toaster-status), no trigger opens the toast,
// so the pass then calls the page's own toast(): it imports the module the page loaded from the dev
// server (/src/lib/components/toast.svelte.ts), shows a toast, replaces it with a second one, and dismisses
// it with its close button (tap or click), timing each step.
// Durations are compared with the --dur-* tokens as the animated element computes them, so an app that
// retunes a token is judged by its own value:
//   Svelte transitions (element.animate): --dur-pop / --dur-pop-exit on floating content (menus,
//     popovers, select lists, tooltips), --dur-sheet / --dur-sheet-exit on everything else (dialogs,
//     sheets, drawers, scrims, the toast); a toast's replacement replays a short entrance in --dur-pop;
//   CSS transitions of colour: --dur-hover or --dur-press; of transform or opacity (the select
//     chevron): --dur-pop or --dur-sheet opening, their -exit tokens closing; of anything else: none.
//     They are judged by the duration their rule declares, because the browser shortens a transition
//     that reverses midway. A colour fade on the trigger the pointer just left counts toward the next
//     opening;
//   the content of a disclosure (Disclosure's trigger carries .hp-disclosure-trigger): the open fade is
//     --dur-expand, and closing is a cut, so no element animation may run on the way back. A disclosure
//     is opened and closed by pressing its trigger again, not with Escape;
//   CSS animations: --dur-enter. Infinite ones (spinners) are left alone.
// Opening, a toast's replacement and closing must each run at least one transition, an opened or replaced
// element must end at opacity 1 with no transform, and under reduced motion nothing may change but opacity
// and colour.
// Failures are reported; the tokens are the reference and never change to pass.
import { installMotionRecorder } from './motion-page.mjs';

const TRIGGERS = '[aria-haspopup], [aria-expanded], [data-tooltip-trigger]';
const COLOUR = /colou?r$|^(fill|stroke)$/i;
const OVERLAY = new Set(['opacity', 'transform', 'translate', 'rotate', 'scale']);
const IDENTITY = new Set(['none', 'matrix(1, 0, 0, 1, 0, 0)']);
const TOLERANCE = 0.5; // ms
const DEPTH = 2; // overlays opened inside an open overlay, at most this many levels
const round = (ms) => Math.round(ms * 10) / 10;

/** The tokens an animation may match, by its type and the phase it ran in. */
function expected(r, phase) {
  const exit = phase === 'close' ? '-exit' : '';
  if (r.type === 'CSSTransition') {
    if (COLOUR.test(r.property)) return ['--dur-hover', '--dur-press'];
    if (OVERLAY.has(r.property)) return [`--dur-pop${exit}`, `--dur-sheet${exit}`];
    return [];
  }
  if (r.type === 'CSSAnimation') return ['--dur-enter'];
  if (r.disclosure) return phase === 'close' ? [] : ['--dur-expand'];
  if (phase === 'replace') return ['--dur-pop'];
  return [`--dur-${r.floating ? 'pop' : 'sheet'}${exit}`];
}

const what = (r) => `${r.target} (${r.type === 'Animation' ? 'transition' : r.type}${r.property ? ' ' + r.property : ''}${r.name ? ' ' + r.name : ''})`;

/**
 * Returns { checked, findings, timings }; findings use check 'motion'. `wait` is the settle time after a
 * load (audit.mjs --wait), used again when the pass reloads the page.
 */
export async function auditMotion(page, { coarse, wait = 600 }) {
  const findings = [];
  const timings = [];
  const checked = { overlays: 0, opened: 0, nested: 0, byKeyboard: 0, animations: 0, lists: 0, skipped: 0 };
  const api = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => api(() => window.__hpMotion.settle());
  const mark = () => api(() => window.__hpMotion.mark());
  const take = () => api(() => window.__hpMotion.take());
  const state = (id) => api((i) => window.__hpMotion.state(i), id);
  const lists = () => api(() => window.__hpMotion.lists());
  const highlight = () => api(() => window.__hpMotion.highlight());
  const tag = () => api((s) => window.__hpMotion.tag(s), TRIGGERS);
  const until = async (id, want, timeout) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if ((await state(id)) === want) return true;
      await page.waitForTimeout(50);
    }
    return (await state(id)) === want;
  };
  const focus = async (locator) => {
    try {
      await locator.focus({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  };
  const install = async () => {
    await api(installMotionRecorder);
    await settle();
    return tag();
  };
  // Start over on a fresh copy of the page after an overlay that would not open or close. The page's
  // triggers get the same ids again, because they are numbered in document order with everything closed.
  const reload = async () => {
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(wait);
    await install();
  };

  const triggers = await install();
  const reduced = await api(() => window.__hpMotion.reduced());

  const report = (trig, status, message) => findings.push({ check: 'motion', status, selector: trig.selector, text: trig.text, message });
  const done = { open: 'opened', replace: 'replaced', close: 'closed' };

  // Times the animations one phase of `trig` started ('open', 'replace' for a toast, or 'close').
  function judge(trig, phase, records) {
    let transitions = 0;
    for (const r of records) {
      if (!(r.duration > 0)) continue; // zero length: a cut, nothing to time
      if (r.iterations === Infinity) continue; // spinners and progress stay, at their own pace
      checked.animations++;
      const ms = r.declared ?? r.duration / Math.abs(r.rate || 1);
      const want = expected(r, phase);
      const match = want.find((n) => r.tokens[n] != null && Math.abs(r.tokens[n] - ms) <= TOLERANCE) ?? null;
      if (r.type === 'Animation') transitions++;
      timings.push({ trigger: trig.text, phase, target: r.target, type: r.type, property: r.property, ms: round(ms), match, expected: want });
      if (!match) {
        const options = want.map((n) => `${n} ${r.tokens[n] ?? 'unset'}${r.tokens[n] != null ? 'ms' : ''}`).join(' or ');
        report(trig, 'fail', `${phase}: ${what(r)} runs ${round(ms)}ms; expected ${options || 'no animation (no token times this property)'}`);
      }
      if (reduced) {
        const moving = r.changes.filter((p) => p !== 'opacity' && !COLOUR.test(p));
        if (moving.length) report(trig, 'fail', `${phase}: ${what(r)} moves under reduced motion (${moving.join(', ')})`);
      }
      if (phase !== 'close' && r.type === 'Animation' && r.end && (r.end.opacity !== '1' || !IDENTITY.has(r.end.transform))) {
        report(trig, 'fail', `${phase}: ${what(r)} ends at opacity ${r.end.opacity}, transform ${r.end.transform}`);
      }
    }
    // A disclosure closes with a cut: its chevron may turn, but nothing has to animate.
    if (!transitions && !(trig.disclosure && phase === 'close')) report(trig, 'fail', `${done[phase]} with no transition`);
  }

  // Opens, checks and closes one trigger, and on the way every trigger inside the overlay it opened.
  // Returns false when it reloaded the page, which also closed every overlay under it.
  async function exercise(trig, depth) {
    const add = (status, message) => report(trig, status, message);

    if (trig.tooltip && coarse) {
      checked.skipped++;
      return true;
    }
    checked.overlays++;
    if (depth) checked.nested++;
    const locator = page.locator(`[data-motion-audit="${trig.id}"]`);
    // A disclosure that starts open shows at once, and that is not timed. Close it with a press, then run it.
    if (trig.disclosure && (await state(trig.id)) === 'open') {
      if (coarse) await locator.tap({ timeout: 5000 });
      else await locator.click({ timeout: 5000 });
      await until(trig.id, 'closed', 1500);
      await settle();
    }
    if ((await state(trig.id)) !== 'closed') {
      add('unchecked', 'trigger missing or already open before the pass reached it');
      await reload();
      return false;
    }

    // 1. Open.
    const verb = trig.tooltip ? 'hover' : coarse ? 'tap' : 'click';
    await settle();
    const listsBefore = await lists();
    await mark();
    await api((i) => window.__hpMotion.watch(i), trig.id);
    try {
      if (trig.tooltip) await locator.hover({ timeout: 5000 });
      else if (coarse) await locator.tap({ timeout: 5000 });
      else await locator.click({ timeout: 5000 });
    } catch (e) {
      await api((i) => window.__hpMotion.watched(i), trig.id);
      add('unchecked', `could not ${verb} it: ${String(e).split('\n')[0].slice(0, 200)}`);
      await reload();
      return false;
    }
    let open = await until(trig.id, 'open', trig.tooltip ? 3000 : 1500);
    const changes = await api((i) => window.__hpMotion.watched(i), trig.id);
    const closedItself = !open && changes.includes('open');
    // Seen on a touch sheet that fades in place: the tap's click lands on the item now under the finger.
    if (closedItself) add('fail', `the ${verb} opened it, and it closed again by itself at once`);
    if (!open && !trig.tooltip && (await focus(locator))) {
      await settle();
      await mark(); // judge only the keyboard opening
      await page.keyboard.press('ArrowDown');
      open = await until(trig.id, 'open', 1500);
      if (open) {
        checked.byKeyboard++;
        if (!closedItself) add('unchecked', `the ${verb} opened nothing; opened from the keyboard instead`);
      }
    }
    if (!open) {
      add('unchecked', 'did not open; not timed');
      await reload();
      return false;
    }
    checked.opened++;
    await settle();
    judge(trig, 'open', await take());

    // 2. Arrow keys inside an open list start nothing.
    if ((await lists()) > listsBefore) {
      checked.lists++;
      // A tap moves no focus: it stays on <body>, on the trigger of the overlay before (a Select sheet keeps
      // it there) or inside the overlay under this one. Keyboard users have it on the trigger, which Bits UI
      // keeps as the list's focus with aria-activedescendant, so the keys go there.
      const stray = await api((i) => window.__hpMotion.strayFocus(i), trig.id);
      if (stray && !(await focus(locator))) {
        add('unchecked', 'could not focus the trigger; arrow keys not pressed');
      } else {
        if (stray) await settle();
        await mark();
        let last = await highlight();
        let moved = false;
        for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp']) {
          await page.keyboard.press(key);
          await page.waitForTimeout(80);
          const now = await highlight();
          if (now !== last) moved = true;
          last = now;
        }
        await settle();
        const started = (await take()).filter((r) => r.duration > 0 && r.iterations !== Infinity);
        for (const r of started) timings.push({ trigger: trig.text, phase: 'keys', target: r.target, type: r.type, property: r.property, ms: round(r.duration), match: null, expected: [] });
        if (started.length) add('fail', `arrow keys in the open list started ${started.length} animation(s): ${started.map((r) => `${what(r)} ${round(r.duration)}ms`).join('; ')}`);
        else if (!moved) add('unchecked', 'arrow keys moved no highlight in the open list');
      }
    }

    // 3. The triggers inside this overlay, each opened and closed while it stays open.
    if (depth < DEPTH) {
      for (const inner of await tag()) {
        // An overlay's own controls are open already (a combobox sheet's search field): not a new overlay.
        if ((await state(inner.id)) === 'open') continue;
        if (!(await exercise(inner, depth + 1))) {
          add('unchecked', 'exit not timed: the page was reloaded while it was open');
          return false;
        }
      }
    }

    // 4. Close.
    await settle();
    await mark();
    if (trig.disclosure) {
      if (coarse) await locator.tap({ timeout: 5000 });
      else await locator.click({ timeout: 5000 });
    } else await page.keyboard.press('Escape');
    let closed = await until(trig.id, 'closed', 1500);
    if (!closed && trig.tooltip) {
      await page.mouse.move(0, 0);
      closed = await until(trig.id, 'closed', 1500);
    }
    if (!closed) {
      add('unchecked', 'did not close with Escape; exit not timed');
      await reload();
      return false;
    }
    await settle();
    judge(trig, 'close', await take());
    return true;
  }

  // 5. The toast: shown, replaced, and dismissed with its close button. The module is the one the page
  // loaded (its URL may carry Vite's ?t= after a hot update), so toast() reaches the page's Toaster.
  async function exerciseToast() {
    const trig = { selector: 'section.hp-toaster', text: 'toast()' };
    const box = page.locator('section.hp-toaster');
    const show = (message) =>
      api(async (m) => {
        const path = '/src/lib/components/toast.svelte.ts';
        const loaded = performance.getEntriesByType('resource').find((e) => new URL(e.name).pathname === path);
        const { toast } = await import(loaded?.name ?? path);
        toast(m);
      }, message);
    checked.overlays++;
    await settle();
    await mark();
    await show('Motion audit');
    try {
      await box.waitFor({ timeout: 1500 });
    } catch {
      report(trig, 'unchecked', 'toast() showed no toast; not timed');
      return;
    }
    checked.opened++;
    await settle();
    judge(trig, 'open', await take());
    await mark();
    await show('Motion audit, replaced');
    await settle();
    judge(trig, 'replace', await take());
    await mark();
    const close = box.locator('.hp-toaster-close');
    try {
      if (coarse) await close.tap({ timeout: 5000 });
      else await close.click({ timeout: 5000 });
      await box.waitFor({ state: 'detached', timeout: 1500 });
    } catch (e) {
      report(trig, 'unchecked', `the close button did not dismiss it (${String(e).split('\n')[0].slice(0, 200)}); exit not timed`);
      return;
    }
    await settle();
    judge(trig, 'close', await take());
  }

  for (const trig of triggers) await exercise(trig, 0);
  if (await api(() => !!document.querySelector('.hp-toaster-status'))) await exerciseToast();
  return { checked, findings, timings };
}
