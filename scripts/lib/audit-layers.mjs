// Layer pass of the default audit (scripts/audit.mjs), run on a loaded page after the page checks. Menus,
// sheets, dialogs, popovers, select and combobox lists, tooltips, disclosures and the image viewer are
// closed when a page loads, so the page checks never see them. For every visible, enabled trigger the
// motion pass opens ([aria-haspopup], [aria-expanded], and Bits UI tooltip triggers on fine pointers; touch
// never opens a tooltip) that is closed when the pass reaches it, it:
//   1. opens it as the motion pass does (scripts/lib/overlays.mjs: tap on touch, click with a mouse, hover
//      for a tooltip, ArrowDown on the focused trigger when the pointer opened nothing) and waits for its
//      animations;
//   2. runs the page checks of scripts/lib/audit-page.mjs (overflow, hit areas, 16 px inputs, text
//      contrast, control boundaries) on the layer it opened, and on nothing else, so a fault on the page
//      behind is reported once, by the page checks;
//   3. does the same for every trigger inside the open layer (a select in a dialog), two levels deep;
//   4. closes it (Escape; a disclosure with another press).
// The layer is what the opening added to <body> (Bits UI portals the content, its floating wrapper and
// the scrim there), plus the element the trigger's aria-controls names when it lies outside those (a
// disclosure's content). On a page with a Toaster it also shows a toast through the page's own toast()
// and checks it.
// A trigger that opens and closes again by itself fails (the tap-through the shared Sheet guards against);
// one that does not open or close is reported unchecked and the page is reloaded.
import { auditPage } from './audit-page.mjs';
import { TRIGGERS, overlayDriver } from './overlays.mjs';

const DEPTH = 2; // layers opened inside an open layer, at most this many levels

/**
 * Returns { checked, findings }. `check` is the page checks' argument for this viewport; `ready(page)` is
 * the wait after a load, used again when the pass reloads the page (optional, as for auditMotion).
 * Findings from a layer name the trigger that opened it; problems driving a trigger use check 'overlays'.
 */
export async function auditLayers(page, { coarse, ready, check }) {
  const findings = [];
  const checked = { overlays: 0, opened: 0, targets: 0, inputs: 0, contrast: 0, boundaries: 0 };
  const driver = overlayDriver(page, { coarse, selector: TRIGGERS, ready });
  const { api, settle, state, tag, reload } = driver;
  const report = (trig, status, message) => findings.push({ check: 'overlays', status, selector: trig.selector, text: trig.text, message });

  // Remembers <body>'s children before an opening, so the layer is what the opening added.
  const before = () =>
    api(() => {
      window.__hpLayerBase = new Set(document.body.children);
    });
  // Marks the layer's roots with data-audit-layer, the scope of auditPage({ layer: true }); returns how many.
  const mark = (id, selector) =>
    api(
      ([i, fixed]) => {
        const skip = /^(SCRIPT|STYLE|TEMPLATE|LINK|NOSCRIPT)$/;
        const roots = fixed
          ? [...document.querySelectorAll(fixed)]
          : [...document.body.children].filter((el) => !window.__hpLayerBase.has(el) && !skip.test(el.tagName));
        const trig = i == null ? null : document.querySelector(`[data-motion-audit="${i}"]`);
        for (const ref of (trig?.getAttribute('aria-controls') || '').split(/\s+/).filter(Boolean)) {
          const el = document.getElementById(ref);
          if (el && !roots.some((r) => r.contains(el))) roots.push(el);
        }
        for (const r of roots) r.setAttribute('data-audit-layer', '');
        return roots.length;
      },
      [id, selector],
    );
  const unmark = () =>
    api(() => {
      for (const el of document.querySelectorAll('[data-audit-layer]')) el.removeAttribute('data-audit-layer');
    });
  // The page checks on the marked layer, their findings labelled with what opened it.
  async function inspect(trig) {
    const result = await page.evaluate(auditPage, { ...check, layer: true });
    for (const k of ['targets', 'inputs', 'contrast', 'boundaries']) checked[k] += result.checked[k];
    for (const f of result.findings) findings.push({ ...f, layer: trig.text, message: `with "${trig.text}" open: ${f.message}` });
  }

  // Opens, checks and closes one trigger, and on the way every trigger inside the layer it opened.
  // Returns false when it reloaded the page, which also closed every layer under it.
  async function visit(trig, depth) {
    if (trig.tooltip && coarse) return true;
    const now = await state(trig.id);
    // Open already (a disclosure that starts open, a combobox sheet's own search field): the page checks,
    // or the check of the layer it sits in, saw it.
    if (now === 'open') return true;
    checked.overlays++;
    if (now !== 'closed') {
      report(trig, 'unchecked', 'trigger gone before the pass reached it');
      await reload();
      return false;
    }
    await settle();
    await before();
    const opening = await driver.open(trig);
    if (opening.error) {
      report(trig, 'unchecked', opening.error);
      await reload();
      return false;
    }
    if (opening.closedItself) report(trig, 'fail', `the ${opening.verb} opened it, and it closed again by itself at once`);
    if (!opening.open) {
      report(trig, 'unchecked', 'did not open; its layer is not checked');
      await reload();
      return false;
    }
    checked.opened++;
    await settle();
    if (await mark(trig.id)) await inspect(trig);
    else report(trig, 'unchecked', 'opened, but added no layer to check');
    await unmark();

    if (depth < DEPTH) {
      for (const inner of await tag()) if (!(await visit(inner, depth + 1))) return false;
    }

    await settle();
    if (!(await driver.close(trig))) {
      report(trig, 'unchecked', `did not close with ${trig.disclosure ? 'a press' : 'Escape'}`);
      await reload();
      return false;
    }
    await settle();
    return true;
  }

  async function visitToast() {
    const trig = { selector: driver.toast.selector, text: 'toast()' };
    checked.overlays++;
    await settle();
    try {
      await driver.toast.show('Audit');
    } catch (e) {
      report(trig, 'unchecked', `toast() failed: ${String(e).split('\n')[0].slice(0, 200)}`);
      return;
    }
    if (!(await driver.toast.shown())) {
      report(trig, 'unchecked', 'toast() showed no toast; not checked');
      return;
    }
    checked.opened++;
    await settle();
    await mark(null, driver.toast.selector);
    await inspect(trig);
    await unmark();
    try {
      await driver.toast.dismiss();
    } catch (e) {
      report(trig, 'unchecked', `the close button did not dismiss it (${String(e).split('\n')[0].slice(0, 200)})`);
    }
  }

  for (const trig of await driver.install()) await visit(trig, 0);
  if (await driver.toast.present()) await visitToast();
  return { checked, findings };
}
