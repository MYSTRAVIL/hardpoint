// Opens and closes overlays for the audit's two passes over them: scripts/lib/audit-motion.mjs times
// them, scripts/lib/audit-layers.mjs runs the page checks on them. Both open an overlay the same way: a
// tap on touch, a click with a mouse, a hover for a tooltip, and ArrowDown on the focused trigger when the
// pointer opened nothing. Both close it with Escape; a disclosure closes with another press, and a tooltip
// that stays open when the pointer leaves. The trigger's state comes from the in-page recorder
// (scripts/lib/motion-page.mjs): aria-expanded, else Bits UI's data-state.
import { installMotionRecorder } from './motion-page.mjs';
import { afterLoad } from './page-ready.mjs';

/** Overlay triggers: popups, anything that expands, and Bits UI tooltip triggers (which carry neither). */
export const TRIGGERS = '[aria-haspopup], [aria-expanded], [data-tooltip-trigger]';

// The dev-server path of the toast module; the motion pass and the layer pass import it in the page.
const TOAST_MODULE = '/src/lib/components/toast.svelte.ts';

/**
 * A driver for the triggers matching `selector` on `page`. `ready(page)` is the wait after a reload
 * (audit.mjs passes the one it used after the first load; by default fonts, 600 ms and the page's own
 * loading). Triggers are numbered by the recorder in document order with everything closed (tag), so
 * after reload() the page's triggers carry the same numbers again.
 */
export function overlayDriver(page, { coarse, selector, ready = afterLoad }) {
  const api = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => api(() => window.__hpMotion.settle());
  const state = (id) => api((i) => window.__hpMotion.state(i), id);
  const tag = () => api((s) => window.__hpMotion.tag(s), selector);
  const locate = (trig) => page.locator(`[data-motion-audit="${trig.id}"]`);
  const press = (locator) => (coarse ? locator.tap({ timeout: 5000 }) : locator.click({ timeout: 5000 }));
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
  // Installs the recorder, waits for the page's animations, and numbers the page's triggers.
  const install = async () => {
    await api(installMotionRecorder);
    await settle();
    return tag();
  };
  // Starts over on a fresh copy of the page, after an overlay that would not open or close.
  const reload = async () => {
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await ready(page);
    await install();
  };

  /**
   * Opens `trig`. `beforeKeyboard` runs when the pointer opened nothing, just before ArrowDown.
   * Returns { open, verb, closedItself, byKeyboard, error }: closedItself is a pointer opening that closed
   * again at once (a touch sheet that fades in place under the finger), error a pointer that could not act.
   */
  async function open(trig, { beforeKeyboard } = {}) {
    const locator = locate(trig);
    const verb = trig.tooltip ? 'hover' : coarse ? 'tap' : 'click';
    await api((i) => window.__hpMotion.watch(i), trig.id);
    try {
      if (trig.tooltip) await locator.hover({ timeout: 5000 });
      else await press(locator);
    } catch (e) {
      await api((i) => window.__hpMotion.watched(i), trig.id);
      return { open: false, verb, closedItself: false, byKeyboard: false, error: `could not ${verb} it: ${String(e).split('\n')[0].slice(0, 200)}` };
    }
    let isOpen = await until(trig.id, 'open', trig.tooltip ? 3000 : 1500);
    // A trigger that opens and at once closes again may only ever poll as closed.
    const changes = await api((i) => window.__hpMotion.watched(i), trig.id);
    const closedItself = !isOpen && changes.includes('open');
    let byKeyboard = false;
    if (!isOpen && !trig.tooltip && (await focus(locator))) {
      await beforeKeyboard?.();
      await page.keyboard.press('ArrowDown');
      isOpen = byKeyboard = await until(trig.id, 'open', 1500);
    }
    return { open: isOpen, verb, closedItself, byKeyboard, error: null };
  }

  /** Closes `trig`; true once it reads closed. */
  async function close(trig) {
    if (trig.disclosure) await press(locate(trig));
    else await page.keyboard.press('Escape');
    let closed = await until(trig.id, 'closed', 1500);
    if (!closed && trig.tooltip) {
      await page.mouse.move(0, 0);
      closed = await until(trig.id, 'closed', 1500);
    }
    return closed;
  }

  // The toast. A page that mounts a Toaster has its status line (.hp-toaster-status); no trigger opens a
  // toast, so the passes call the page's own toast(). The module is the one the page loaded (its URL may
  // carry Vite's ?t= after a hot update), so toast() reaches the page's Toaster.
  const toastBox = page.locator('section.hp-toaster');
  const toast = {
    selector: 'section.hp-toaster',
    present: () => api(() => !!document.querySelector('.hp-toaster-status')),
    show: (message) =>
      api(
        async ([m, path]) => {
          const loaded = performance.getEntriesByType('resource').find((e) => new URL(e.name).pathname === path);
          const { toast } = await import(loaded?.name ?? path);
          toast(m);
        },
        [message, TOAST_MODULE],
      ),
    /** Resolves true once a toast is on screen, false after 1.5 s. */
    shown: () => toastBox.waitFor({ timeout: 1500 }).then(() => true, () => false),
    /** Dismisses it with its close button (tap or click); throws when it stays. */
    dismiss: async () => {
      await press(toastBox.locator('.hp-toaster-close'));
      await toastBox.waitFor({ state: 'detached', timeout: 1500 });
    },
  };

  return { api, settle, state, tag, locate, press, until, focus, install, reload, open, close, toast };
}
