// Audit routes against the Hardpoint done-gate. Exit code 1 on any failure.
// Usage: node scripts/audit.mjs [routes...] [--serve] [--theme dark|light] [--motion] [--update-baseline] [--json] [--verbose] [--wait ms]
//   routes     paths ("/specimen") or full URLs ("https://example.com"); default: every static +page.svelte
//              under src/routes (dynamic [param] routes are skipped). A path waits for html[data-hydrated],
//              which Hardpoint's own layout sets once the app has mounted; a full URL gets the settle time
//              only. The theme reaches only apps that read localStorage "hardpoint:theme".
//   --serve    start a private Vite dev server on a free port (otherwise SHOT_BASE, default http://localhost:5173)
//   --theme    audit one theme only (default: both, dark then light; every route, every viewport, in each)
//   --motion   also run the motion pass (dark only), see below. The release workflow runs it; here it is opt-in
//   --update-baseline  rewrite scripts/audit-baseline.json with this run's counts (see "Counts" below)
//   --json     print machine-readable results instead of the report
//   --verbose  also list every unchecked finding (default: first 3 per viewport), and every timed animation
//   --wait ms  settle time after the page has hydrated, or loaded for a full URL (default 600)
// Viewports: 320x640, 390x844, 768x1024 (touch, coarse pointer) and 1440x900 (fine pointer), in each theme.
// A theme is chosen the way an app's user does: the saved choice (localStorage "hardpoint:theme") is set before
// the page loads, and src/app.html applies it before first paint. Each result is labelled with its theme.
// After the settle time every pass waits until the page has finished its own loading: no aria-busy region,
// reveal, skeleton, eager image download or running animation (scripts/lib/page-ready.mjs). So /app is
// checked after its simulated network, not during it, however busy the machine is. A page still loading
// after 10 s fails (check 'load'), unless the baseline records that it stays busy on purpose (the states
// docs); a full URL then gets a note.
// Checks per route and viewport: console errors, horizontal overflow, target size (44px coarse / 24px fine,
// hit-tested), input font-size >= 16px, text contrast (4.5:1, 3:1 large), control boundary contrast (3:1).
// Opt a control out of the target check with data-audit-exempt="<reason>" (reported separately).
// Reduced motion is emulated so entrance animations cannot skew colours mid-flight.
// Overlays: then every closed overlay trigger ([aria-haspopup], [aria-expanded], tooltip triggers on the fine
// pointer) is opened, the same checks run on the layer it opened (and nowhere else), and it is closed;
// triggers inside an open layer too, two levels deep; a page with a Toaster also shows a toast. Details in
// scripts/lib/audit-layers.mjs.
// Counts: a route that checked 0 texts fails. Each route's counts per viewport and theme (texts and targets
// on the page; overlays opened, and texts and targets in them) are compared with scripts/audit-baseline.json:
// a count below half its baseline fails, and every such drop is listed. A route without a baseline entry gets
// a note and is not compared. An entry with "stillBusy" marks a page that never finishes loading on purpose.
// --update-baseline rewrites the file (the whole file on a run of every route in both themes, otherwise only
// the entries this run checked), lists the pages it recorded as staying busy, and compares nothing.
// Motion pass: at 390x844 touch (sheets) and 1440x900 fine (floating content), each with and without reduced
// motion, it opens and closes every overlay trigger and checks animation durations against the --dur-* tokens,
// that arrow keys inside an open list start no animation, and that nothing moves under reduced motion.
// Details in scripts/lib/audit-motion.mjs.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChromium } from './lib/browser.mjs';
import { auditPage } from './lib/audit-page.mjs';
import { auditLayers } from './lib/audit-layers.mjs';
import { auditMotion } from './lib/audit-motion.mjs';
import { LOAD_TIMEOUT, afterLoad } from './lib/page-ready.mjs';
import { normalizeTarget, resolveBase, root } from './lib/server.mjs';

const args = process.argv.slice(2);
// Options that take a value; the value is not a route.
const VALUED = ['--wait', '--theme'];
const flags = new Set(args.filter((a) => a.startsWith('--') && !VALUED.includes(a)));
const valueOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const wait = valueOf('--wait') !== undefined ? Number(valueOf('--wait')) : 600;
const routeArgs = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])).map(normalizeTarget);
const asJson = flags.has('--json');
const verbose = flags.has('--verbose');
const motion = flags.has('--motion');
const updateBaseline = flags.has('--update-baseline');
const THEMES = ['dark', 'light'];
const onlyTheme = valueOf('--theme');
if (onlyTheme !== undefined && !THEMES.includes(onlyTheme)) {
  console.error(`--theme takes ${THEMES.join(' or ')}`);
  process.exit(2);
}
const themes = onlyTheme ? [onlyTheme] : THEMES;
const BASELINE = join(root, 'scripts', 'audit-baseline.json');
const isUrl = (route) => /^https?:\/\//i.test(route);

const VIEWPORTS = [
  { w: 320, h: 640, touch: true },
  { w: 390, h: 844, touch: true },
  { w: 768, h: 1024, touch: true },
  { w: 1440, h: 900, touch: false },
].map((v) => ({ ...v, name: `${v.w}x${v.h} ${v.touch ? 'touch' : 'fine'}` }));
const MOTION_VIEWPORTS = [
  { w: 390, h: 844, touch: true },
  { w: 1440, h: 900, touch: false },
].flatMap((v) => [false, true].map((reduced) => ({
  ...v,
  reduced,
  name: `${v.w}x${v.h} ${v.touch ? 'touch' : 'fine'}, ${reduced ? 'reduced motion' : 'motion'}`,
})));
const CHECKS = ['console', 'load', 'overflow', 'targets', 'inputs', 'contrast', 'boundaries', 'overlays', 'counts', ...(motion ? ['motion'] : [])];

// The counts kept in the baseline, read from a page result's `checked`.
const COUNTS = {
  texts: (c) => c.contrast,
  targets: (c) => c.targets,
  overlays: (c) => c.layers.opened,
  overlayTexts: (c) => c.layers.contrast,
  overlayTargets: (c) => c.layers.targets,
};
const countsOf = (checked) => Object.fromEntries(Object.entries(COUNTS).map(([k, f]) => [k, f(checked)]));

function discoverRoutes() {
  const dir = join(root, 'src', 'routes');
  const routes = [];
  for (const f of readdirSync(dir, { recursive: true })) {
    if (!/(^|[\\/])\+page\.svelte$/.test(f)) continue;
    const segs = f.split(/[\\/]/).slice(0, -1).filter((s) => !/^\(.*\)$/.test(s));
    if (segs.some((s) => s.includes('['))) continue;
    routes.push('/' + segs.join('/'));
  }
  return routes.sort();
}

// Load the route in a fresh context and run `inspect(page, ready)`, which returns { checked, findings, ... }.
// `ready(page)` is the wait after a load, which a pass repeats when it reloads the page.
async function visit(browser, base, route, vp, reducedMotion, inspect, theme) {
  const url = isUrl(route) ? route : base + route;
  const ready = async (page) => {
    // src/routes/+layout.svelte sets this once the app has mounted; until then client-only parts are missing.
    // Another site never sets it, so a full URL gets the settle time only.
    if (!isUrl(route)) await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 30000 });
    return afterLoad(page, wait);
  };
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    hasTouch: vp.touch,
    isMobile: vp.touch,
    reducedMotion,
  });
  if (theme) await ctx.addInitScript((t) => localStorage.setItem('hardpoint:theme', t), theme);
  const page = await ctx.newPage();
  let consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  let result = null;
  let failure = null;
  // The first dev-server load may re-optimise dependencies and reload the page mid-run; retry that case only.
  for (let attempt = 0; attempt < 3; attempt++) {
    consoleErrors = [];
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      const load = await ready(page);
      result = { ...(await inspect(page, ready)), load };
      failure = null;
      break;
    } catch (e) {
      failure = String(e);
      if (!/context was destroyed|navigation/i.test(failure)) break;
      await page.waitForTimeout(1000);
    }
  }
  await ctx.close();
  const findings = [];
  for (const e of consoleErrors) findings.push({ check: 'console', status: 'fail', selector: null, text: null, message: e.split('\n')[0].slice(0, 300) });
  if (failure) findings.push({ check: 'console', status: 'fail', selector: null, text: null, message: failure.split('\n')[0].slice(0, 300) });
  if (result) findings.push(...result.findings);
  return { result, findings };
}

async function auditOne(browser, base, route, vp, theme) {
  const check = { width: vp.w, coarse: vp.touch, minTarget: vp.touch ? 44 : 24, minInputFont: 16 };
  const inspect = async (page, ready) => {
    const own = await page.evaluate(auditPage, check);
    const layers = await auditLayers(page, { coarse: vp.touch, ready, check });
    return { checked: { ...own.checked, layers: layers.checked }, findings: [...own.findings, ...layers.findings] };
  };
  const { result, findings } = await visit(browser, base, route, vp, 'reduce', inspect, theme);
  if (result && result.checked.contrast === 0) {
    findings.push({ check: 'counts', status: 'fail', selector: null, text: null, message: 'checked 0 texts: the page rendered nothing' });
  }
  const viewport = `${vp.name}, ${theme}`;
  return { route, theme, viewport, key: viewport, checked: result?.checked ?? null, load: result?.load ?? null, findings };
}

// The motion pass stays dark only: its checks are about timing, not colour.
async function motionOne(browser, base, route, vp) {
  const { result, findings } = await visit(
    browser,
    base,
    route,
    vp,
    vp.reduced ? 'reduce' : 'no-preference',
    (page, ready) => auditMotion(page, { coarse: vp.touch, ready }),
    'dark',
  );
  return {
    route,
    theme: 'dark',
    viewport: `${vp.name}, dark`,
    // The baseline entry of the page run at the same size, which says whether the page stays busy.
    key: `${vp.w}x${vp.h} ${vp.touch ? 'touch' : 'fine'}, dark`,
    motion: true,
    checked: result?.checked ?? null,
    load: result?.load ?? null,
    timings: result?.timings ?? [],
    findings,
  };
}

const { base, server } = await resolveBase(flags.has('--serve'));
const routes = routeArgs.length ? routeArgs : discoverRoutes();
const started = Date.now();
const browser = await launchChromium();
const results = [];
try {
  for (const route of routes) {
    for (const theme of themes) {
      results.push(...(await Promise.all(VIEWPORTS.map((vp) => auditOne(browser, base, route, vp, theme)))));
    }
    if (motion) results.push(...(await Promise.all(MOTION_VIEWPORTS.map((vp) => motionOne(browser, base, route, vp)))));
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
const seconds = Math.round((Date.now() - started) / 100) / 10;

// ---- Loading and counts against the baseline -----------------------------------------------------------
const pageResults = results.filter((r) => !r.motion);
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const stillLoading = (r) => r.load && !r.load.loaded;
const notes = [];
const drops = [];
let baselineWritten = null;
if (updateBaseline) {
  // A run of every route in both themes rewrites the file; a narrower run updates only what it checked.
  const whole = !routeArgs.length && !onlyTheme;
  const next = whole ? {} : structuredClone(baseline);
  let entries = 0;
  const busy = new Map();
  for (const r of pageResults) {
    if (isUrl(r.route) || !r.checked || r.checked.contrast === 0) continue;
    (next[r.route] ??= {})[r.viewport] = { ...countsOf(r.checked), ...(stillLoading(r) ? { stillBusy: r.load.busy } : {}) };
    if (stillLoading(r)) busy.set(r.route, (busy.get(r.route) ?? 0) + 1);
    entries++;
  }
  const order = THEMES.flatMap((t) => VIEWPORTS.map((vp) => `${vp.name}, ${t}`));
  const rank = (k) => (order.includes(k) ? order.indexOf(k) : order.length);
  const lines = Object.keys(next)
    .sort()
    .map((route) => {
      const vps = Object.keys(next[route]).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
      return `  ${JSON.stringify(route)}: {\n${vps.map((v) => `    ${JSON.stringify(v)}: ${JSON.stringify(next[route][v])}`).join(',\n')}\n  }`;
    });
  writeFileSync(BASELINE, `{\n${lines.join(',\n')}\n}\n`);
  baselineWritten = { entries, routes: Object.keys(next).length, whole, stillBusy: Object.fromEntries(busy) };
} else {
  // A page still loading at the timeout was checked mid-load: a failure, unless it stays busy on purpose.
  for (const r of results.filter(stillLoading)) {
    const at = `still loading after ${LOAD_TIMEOUT / 1000}s (${r.load.busy})`;
    if (isUrl(r.route)) notes.push(`${r.route} [${r.viewport}]: ${at}; checked as it was`);
    else if (!baseline[r.route]?.[r.key]?.stillBusy) {
      r.findings.push({
        check: 'load', status: 'fail', selector: null, text: null,
        message: `${at}, so it was checked mid-load. If it stays busy on purpose, record that with --update-baseline`,
      });
    }
  }
  for (const route of routes) {
    const entry = baseline[route];
    if (!entry) {
      notes.push(
        isUrl(route)
          ? `${route}: a full URL has no baseline; counts not compared`
          : `${route}: no baseline entry, counts not compared (add one with --update-baseline)`,
      );
      continue;
    }
    for (const r of pageResults.filter((x) => x.route === route && x.checked)) {
      const want = entry[r.viewport];
      if (!want) {
        notes.push(`${route} [${r.viewport}]: no baseline entry, counts not compared`);
        continue;
      }
      const now = countsOf(r.checked);
      for (const [k, was] of Object.entries(want)) {
        if (!(k in now) || now[k] >= was / 2) continue;
        drops.push({ route, viewport: r.viewport, count: k, now: now[k], baseline: was });
        r.findings.push({ check: 'counts', status: 'fail', selector: null, text: null, message: `${k} ${now[k]}, below half its baseline ${was}` });
      }
    }
  }
}

const count = (status) => {
  const c = Object.fromEntries(CHECKS.map((k) => [k, 0]));
  for (const r of results) for (const f of r.findings) if (f.status === status) c[f.check]++;
  return c;
};
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const fails = count('fail');
const unchecked = count('unchecked');
const exempt = count('exempt');
const failTotal = sum(fails);
const failThemes = motion && !themes.includes('dark') ? ['dark', ...themes] : themes;
const failsByTheme = Object.fromEntries(
  failThemes.map((t) => [t, results.filter((r) => r.theme === t).reduce((n, r) => n + r.findings.filter((f) => f.status === 'fail').length, 0)]),
);
const layerTotals = pageResults.reduce(
  (t, r) => (r.checked ? { overlays: t.overlays + r.checked.layers.overlays, opened: t.opened + r.checked.layers.opened } : t),
  { overlays: 0, opened: 0 },
);
const summary = {
  base,
  routes: routes.length,
  viewports: VIEWPORTS.length,
  themes,
  ...(motion ? { motionRuns: MOTION_VIEWPORTS.length } : {}),
  seconds,
  overlays: layerTotals,
  failures: failTotal,
  failuresByCheck: fails,
  failuresByTheme: failsByTheme,
  unchecked: sum(unchecked),
  uncheckedByCheck: unchecked,
  exempt: sum(exempt),
  exemptByCheck: exempt,
  drops,
  notes,
  ...(baselineWritten ? { baselineWritten } : {}),
  pass: failTotal === 0,
};

if (asJson) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  const line = (f) => {
    const where = f.selector ? ` ${f.selector}${f.text ? ` "${f.text}"` : ''}` : '';
    let s = `    ${f.status === 'fail' ? 'FAIL' : f.status.toUpperCase().padEnd(4)} ${f.check.padEnd(10)}${where}  ${f.message}`;
    for (const o of f.offenders ?? []) s += `\n         - ${o.selector} (right edge ${o.right}px, width ${o.width}px)`;
    return s;
  };
  for (const route of routes) {
    console.log(`\n${route}`);
    for (const r of results.filter((x) => x.route === route)) {
      const f = r.findings.filter((x) => x.status === 'fail');
      const c = r.checked;
      const l = c?.layers;
      const tally = !c
        ? 'not audited'
        : r.motion
          ? `opened ${c.opened} of ${c.overlays} overlays` +
            (c.nested || c.byKeyboard
              ? ` (${[c.nested && `${c.nested} inside another`, c.byKeyboard && `${c.byKeyboard} from the keyboard`].filter(Boolean).join(', ')})`
              : '') +
            ', ' +
            `timed ${c.animations} animations, arrow keys in ${c.lists} lists` +
            (c.skipped ? `; ${c.skipped} tooltip triggers left alone on touch` : '')
          : `checked ${c.targets} targets, ${c.inputs} inputs, ${c.contrast} texts, ${c.boundaries} boundaries` +
            (l.overlays
              ? `; opened ${l.opened} of ${l.overlays} overlays: ${l.targets} targets, ${l.inputs} inputs, ${l.contrast} texts, ${l.boundaries} boundaries`
              : '');
      const busy = r.load && !r.load.loaded ? `; still loading after ${LOAD_TIMEOUT / 1000}s (${r.load.busy})` : '';
      console.log(`  ${r.viewport}: ${f.length ? `${f.length} failure(s)` : 'ok'} (${tally}${busy})`);
      for (const x of f) console.log(line(x));
      if (verbose) {
        for (const t of r.timings ?? []) {
          const kind = t.type === 'Animation' ? 'transition' : t.type + (t.property ? ' ' + t.property : '');
          const verdict = t.phase === 'keys' ? 'started by arrow keys' : t.match ? `= ${t.match}` : `expected ${t.expected.join(' or ') || 'none'}`;
          console.log(`    time ${t.phase.padEnd(5)} "${t.trigger}" ${t.target} (${kind}) ${t.ms}ms ${verdict}`);
        }
      }
      const u = r.findings.filter((x) => x.status === 'unchecked');
      for (const x of verbose ? u : u.slice(0, 3)) console.log(line(x));
      if (!verbose && u.length > 3) console.log(`    … ${u.length - 3} more unchecked (use --verbose)`);
    }
  }
  const ex = results.flatMap((r) => r.findings.filter((f) => f.status === 'exempt').map((f) => ({ ...f, route: r.route, viewport: r.viewport })));
  if (ex.length) {
    console.log('\nExempt:');
    for (const f of ex) console.log(`  ${f.route} [${f.viewport}] ${f.check} ${f.selector}  ${f.message}`);
  }
  if (drops.length) {
    console.log('\nCounts below half their baseline (scripts/audit-baseline.json):');
    for (const d of drops) console.log(`  ${d.route} [${d.viewport}] ${d.count} ${d.now}, baseline ${d.baseline}`);
  }
  if (notes.length) {
    console.log('\nNotes:');
    for (const n of notes) console.log(`  ${n}`);
  }
  if (baselineWritten) {
    console.log(
      `\nbaseline: wrote ${baselineWritten.entries} entries (${baselineWritten.whole ? 'the whole file' : 'merged into the file'}, ` +
        `${baselineWritten.routes} routes) to scripts/audit-baseline.json; counts not compared`,
    );
    const busy = Object.entries(baselineWritten.stillBusy);
    if (busy.length) {
      console.log(`Recorded as still loading after ${LOAD_TIMEOUT / 1000}s on purpose (check each one; a page that should finish is a fault):`);
      for (const [route, n] of busy) console.log(`  ${route} (${n} of ${themes.length * VIEWPORTS.length} viewports)`);
    }
  }
  const by = (o) => CHECKS.filter((k) => o[k]).map((k) => `${k} ${o[k]}`).join(', ') || 'none';
  console.log(
    `\naudit ${summary.pass ? 'PASS' : 'FAIL'}: ${routes.length} routes x ${VIEWPORTS.length} viewports x ${themes.length} theme${themes.length > 1 ? 's' : ''}` +
      `, ${layerTotals.opened} of ${layerTotals.overlays} overlays opened` +
      `${motion ? `, and ${MOTION_VIEWPORTS.length} motion runs per route (dark)` : ''} in ${seconds}s; ` +
      `failures ${failTotal} (${failThemes.map((t) => `${t} ${failsByTheme[t]}`).join(', ')}; ${by(fails)}); ` +
      `${summary.unchecked} unchecked (${by(unchecked)}); ${summary.exempt} exempt (${by(exempt)})`,
  );
}
process.exit(summary.pass ? 0 : 1);
