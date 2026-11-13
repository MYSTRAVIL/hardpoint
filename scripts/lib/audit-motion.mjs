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
// Opening and closing are shared with the layer pass of the default audit (scripts/lib/overlays.mjs).
// On a page that mounts a Toaster (its status line carries .hp-toaster-status), no trigger opens the toast,
// so the pass then calls the page's own toast(): it imports the module the page loaded from the dev
// server (/src/lib/components/toast.svelte.ts), shows a toast, replaces it with a second one, and dismisses
// it with its close button (tap or click), timing each step.
// Every animation that starts anywhere on the page between a step and its settling counts for that step.
// The pass starts only once the page has finished its own loading (audit.mjs waits for it, see
// scripts/lib/page-ready.mjs), so a late page animation, such as /app/detail's photo fading in after its
// simulated network, is not timed against the overlay opened at that moment. Judging the whole page keeps
// in view what an opening does outside its own layer, such as a page behind a sheet that moves under
// reduced motion; counting only animations inside the overlay, its scrim and its trigger would hide that.
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
import { TRIGGERS, overlayDriver } from './overlays.mjs';

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
 * Returns { checked, findings, timings }; findings use check 'motion'. `ready(page)` is the wait after a
 * load, used again when the pass reloads the page: audit.mjs passes its own; a script that prepared the
 * page itself may leave it out (fonts, 600 ms and the page's own loading, scripts/lib/page-ready.mjs).
 */
export async function auditMotion(page, { coarse, ready }) {
  const findings = [];
  const timings = [];
  const checked = { overlays: 0, opened: 0, nested: 0, byKeyboard: 0, animations: 0, lists: 0, skipped: 0 };
  const driver = overlayDriver(page, { coarse, selector: TRIGGERS, ready });
  const { api, settle, state, tag, locate, until, focus, reload } = driver;
  const mark = () => api(() => window.__hpMotion.mark());
  const take = () => api(() => window.__hpMotion.take());
  const lists = () => api(() => window.__hpMotion.lists());
  const highlight = () => api(() => window.__hpMotion.highlight());

  const triggers = await driver.install();
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
    const locator = locate(trig);
    // A disclosure that starts open shows at once, and that is not timed. Close it with a press, then run it.
    if (trig.disclosure && (await state(trig.id)) === 'open') {
      await driver.press(locator);
      await until(trig.id, 'closed', 1500);
      await settle();
    }
    if ((await state(trig.id)) !== 'closed') {
      add('unchecked', 'trigger missing or already open before the pass reached it');
      await reload();
      return false;
    }

    // 1. Open.
    await settle();
    const listsBefore = await lists();
    await mark();
    const opening = await driver.open(trig, {
      beforeKeyboard: async () => {
        await settle();
        await mark(); // judge only the keyboard opening
      },
    });
    if (opening.error) {
      add('unchecked', opening.error);
      await reload();
      return false;
    }
    // Seen on a touch sheet that fades in place: the tap's click lands on the item now under the finger.
    if (opening.closedItself) add('fail', `the ${opening.verb} opened it, and it closed again by itself at once`);
    if (opening.byKeyboard) {
      checked.byKeyboard++;
      if (!opening.closedItself) add('unchecked', `the ${opening.verb} opened nothing; opened from the keyboard instead`);
    }
    if (!opening.open) {
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
    if (!(await driver.close(trig))) {
      add('unchecked', 'did not close with Escape; exit not timed');
      await reload();
      return false;
    }
    await settle();
    judge(trig, 'close', await take());
    return true;
  }

  // 5. The toast: shown, replaced, and dismissed with its close button.
  async function exerciseToast() {
    const trig = { selector: driver.toast.selector, text: 'toast()' };
    checked.overlays++;
    await settle();
    await mark();
    await driver.toast.show('Motion audit');
    if (!(await driver.toast.shown())) {
      report(trig, 'unchecked', 'toast() showed no toast; not timed');
      return;
    }
    checked.opened++;
    await settle();
    judge(trig, 'open', await take());
    await mark();
    await driver.toast.show('Motion audit, replaced');
    await settle();
    judge(trig, 'replace', await take());
    await mark();
    try {
      await driver.toast.dismiss();
    } catch (e) {
      report(trig, 'unchecked', `the close button did not dismiss it (${String(e).split('\n')[0].slice(0, 200)}); exit not timed`);
      return;
    }
    await settle();
    judge(trig, 'close', await take());
  }

  for (const trig of triggers) await exercise(trig, 0);
  if (await driver.toast.present()) await exerciseToast();
  return { checked, findings, timings };
}
