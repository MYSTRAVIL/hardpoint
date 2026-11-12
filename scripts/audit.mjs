// Audit routes against the Hardpoint done-gate. Exit code 1 on any failure.
// Usage: node scripts/audit.mjs [routes...] [--serve] [--theme dark|light] [--motion] [--json] [--verbose] [--wait ms]
//   routes     paths ("/specimen") or full URLs; default: every static +page.svelte under src/routes
//              (dynamic [param] routes are skipped)
//   --serve    start a private Vite dev server on a free port (otherwise SHOT_BASE, default http://localhost:5173)
//   --theme    audit one theme only (default: both, dark then light; every route, every viewport, in each)
//   --motion   also run the motion pass (opt-in; not part of the default gate; dark only), see below
//   --json     print machine-readable results instead of the report
//   --verbose  also list every unchecked finding (default: first 3 per viewport), and every timed animation
//   --wait ms  settle time after the page has hydrated (default 600)
// Viewports: 320x640, 390x844, 768x1024 (touch, coarse pointer) and 1440x900 (fine pointer), in each theme.
// A theme is chosen the way an app's user does: the saved choice (localStorage "hardpoint:theme") is set before
// the page loads, and src/app.html applies it before first paint. Each result is labelled with its theme.
// Checks per route and viewport: console errors, horizontal overflow, target size (44px coarse / 24px fine,
// hit-tested), input font-size >= 16px, text contrast (4.5:1, 3:1 large), control boundary contrast (3:1).
// Opt a control out of the target check with data-audit-exempt="<reason>" (reported separately).
// Reduced motion is emulated so entrance animations cannot skew colours mid-flight.
// Motion pass: at 390x844 touch (sheets) and 1440x900 fine (floating content), each with and without reduced
// motion, it opens and closes every overlay trigger and checks animation durations against the --dur-* tokens,
// that arrow keys inside an open list start no animation, and that nothing moves under reduced motion.
// Details in scripts/lib/audit-motion.mjs.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { launchChromium } from './lib/browser.mjs';
import { auditPage } from './lib/audit-page.mjs';
import { auditMotion } from './lib/audit-motion.mjs';
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
const THEMES = ['dark', 'light'];
const onlyTheme = valueOf('--theme');
if (onlyTheme !== undefined && !THEMES.includes(onlyTheme)) {
  console.error(`--theme takes ${THEMES.join(' or ')}`);
  process.exit(2);
}
const themes = onlyTheme ? [onlyTheme] : THEMES;

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
const CHECKS = ['console', 'overflow', 'targets', 'inputs', 'contrast', 'boundaries', ...(motion ? ['motion'] : [])];

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

// Load the route in a fresh context and run `inspect(page)`, which returns { checked, findings, ... }.
async function visit(browser, base, route, vp, reducedMotion, inspect, theme) {
  const url = route.startsWith('http') ? route : base + route;
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
      // src/routes/+layout.svelte sets this once the app has mounted; until then client-only parts are missing.
      await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(wait);
      result = await inspect(page);
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
  const arg = { width: vp.w, coarse: vp.touch, minTarget: vp.touch ? 44 : 24, minInputFont: 16 };
  const { result, findings } = await visit(browser, base, route, vp, 'reduce', (page) => page.evaluate(auditPage, arg), theme);
  return { route, theme, viewport: `${vp.name}, ${theme}`, checked: result?.checked ?? null, findings };
}

// The motion pass stays dark only: its checks are about timing, not colour.
async function motionOne(browser, base, route, vp) {
  const { result, findings } = await visit(
    browser,
    base,
    route,
    vp,
    vp.reduced ? 'reduce' : 'no-preference',
    (page) => auditMotion(page, { coarse: vp.touch, wait }),
    'dark',
  );
  return { route, theme: 'dark', viewport: `${vp.name}, dark`, motion: true, checked: result?.checked ?? null, timings: result?.timings ?? [], findings };
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
const summary = {
  base,
  routes: routes.length,
  viewports: VIEWPORTS.length,
  themes,
  ...(motion ? { motionRuns: MOTION_VIEWPORTS.length } : {}),
  seconds,
  failures: failTotal,
  failuresByCheck: fails,
  failuresByTheme: failsByTheme,
  unchecked: sum(unchecked),
  uncheckedByCheck: unchecked,
  exempt: sum(exempt),
  exemptByCheck: exempt,
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
          : `checked ${c.targets} targets, ${c.inputs} inputs, ${c.contrast} texts, ${c.boundaries} boundaries`;
      console.log(`  ${r.viewport}: ${f.length ? `${f.length} failure(s)` : 'ok'} (${tally})`);
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
  const by = (o) => CHECKS.filter((k) => o[k]).map((k) => `${k} ${o[k]}`).join(', ') || 'none';
  console.log(
    `\naudit ${summary.pass ? 'PASS' : 'FAIL'}: ${routes.length} routes x ${VIEWPORTS.length} viewports x ${themes.length} theme${themes.length > 1 ? 's' : ''}` +
      `${motion ? ` and ${MOTION_VIEWPORTS.length} motion runs per route (dark)` : ''} in ${seconds}s; ` +
      `failures ${failTotal} (${failThemes.map((t) => `${t} ${failsByTheme[t]}`).join(', ')}; ${by(fails)}); ` +
      `${summary.unchecked} unchecked (${by(unchecked)}); ${summary.exempt} exempt (${by(exempt)})`,
  );
}
process.exit(summary.pass ? 0 : 1);
