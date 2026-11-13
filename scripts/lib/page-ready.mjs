// The audit's wait for a page to finish what it loads after it hydrated (scripts/audit.mjs), so every pass
// checks the page as it settles, not a moment of its first load. /app loads its rows and its photo over a
// simulated network and crossfades them in; checked after a fixed settle time, it was sometimes caught
// mid-crossfade, failed contrast and changed its counts from run to run, more often on a busy machine.
// A page is loaded once, for three frames in a row, it has no [aria-busy="true"] region, no reveal running
// ([data-revealing], LoadRegion's crossfade), no skeleton (.hp-skeleton, also the block of a MediaImage
// still waiting for its src), no eager image still downloading and no finite animation running.
// After LOAD_TIMEOUT ms it gives up and says what was still busy. audit.mjs then fails the run, unless
// scripts/audit-baseline.json records that the page stays busy on purpose (the states docs show loading
// regions that never finish).
export const LOAD_TIMEOUT = 10000;

export function untilLoaded(page, timeout = LOAD_TIMEOUT) {
  return page.evaluate(loading, timeout);
}

/** The wait after a load once the page has mounted: its fonts, `wait` ms to settle, then its own loading. */
export async function afterLoad(page, wait = 600) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  return untilLoaded(page);
}

// In-page, serialised by Playwright: self-contained. Resolves { loaded, ms, busy }.
function loading(timeout) {
  const finite = (a) => !!a.effect && a.effect.getComputedTiming().endTime !== Infinity;
  const busy = () => {
    if (document.querySelector('[aria-busy="true"]')) return 'an aria-busy region';
    if (document.querySelector('[data-revealing]')) return 'a reveal';
    if (document.querySelector('.hp-skeleton')) return 'a skeleton';
    if ([...document.images].some((i) => i.currentSrc && !i.complete && i.loading !== 'lazy')) return 'an image download';
    if (document.getAnimations().some((a) => (a.pending || a.playState === 'running') && finite(a))) return 'an animation';
    return null;
  };
  return new Promise((resolve) => {
    const start = performance.now();
    let quiet = 0;
    const step = () => {
      const now = busy();
      quiet = now ? 0 : quiet + 1;
      const ms = Math.round(performance.now() - start);
      if (quiet >= 3) resolve({ loaded: true, ms, busy: null });
      else if (ms > timeout) resolve({ loaded: false, ms, busy: now });
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
