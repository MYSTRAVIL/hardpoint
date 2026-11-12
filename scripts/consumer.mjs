// Consumer test: checks the package the way an npm user gets it. The repo's own gates read the .svelte
// sources; this one installs the packed tarball into consumer/, a Vite + Svelte app without SvelteKit.
// Steps: npm pack into consumer/, npm ci there, then for the locked Svelte and again for the Svelte peer
// floor: install the tarball, svelte-check, vite build, and consumer/run.mjs (every scene under
// `style-src 'self'` at two viewports and both themes; see consumer/README.md).
// Usage: npm run consumer. Exits 1 at the first failing step. The tarball stays in consumer/.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const app = join(root, 'consumer');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tarball = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
const floor = pkg.peerDependencies.svelte.match(/\d+\.\d+\.\d+/)[0];
const quiet = ['--no-audit', '--no-fund'];

function run(label, cmd, args, cwd, shell = false) {
  console.log(`\n== ${label}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell });
  if (r.status !== 0) {
    console.error(`\nconsumer test failed: ${label} (exit ${r.status ?? r.signal ?? r.error?.message})`);
    process.exit(1);
  }
}

// Under `npm run`, npm_execpath is npm's CLI script; outside it, fall back to the npm on PATH.
const npmCli = process.env.npm_execpath;
const npm = (label, args, cwd) =>
  npmCli && /\.c?js$/.test(npmCli)
    ? run(label, process.execPath, [npmCli, ...args], cwd)
    : run(label, 'npm', args, cwd, process.platform === 'win32');
const node = (label, args) => run(label, process.execPath, args, app);

for (const f of readdirSync(app)) if (f.endsWith('.tgz')) rmSync(join(app, f));
npm(`pack ${tarball}`, ['pack', '--pack-destination', 'consumer'], root);
npm('npm ci in consumer/', ['ci', ...quiet], app);

for (const svelte of [null, floor]) {
  const round = svelte ? `Svelte ${floor} (peer floor)` : 'locked Svelte';
  npm(`${round}: install ${tarball}`, ['install', '--no-save', ...quiet, `./${tarball}`, ...(svelte ? [`svelte@${svelte}`] : [])], app);
  const installed = JSON.parse(readFileSync(join(app, 'node_modules/svelte/package.json'), 'utf8')).version;
  if (svelte && installed !== svelte) {
    console.error(`consumer test failed: expected svelte ${svelte}, found ${installed}`);
    process.exit(1);
  }
  console.log(`svelte ${installed}`);
  node(`${round}: svelte-check`, ['node_modules/svelte-check/bin/svelte-check', '--tsconfig', './tsconfig.json']);
  node(`${round}: vite build`, ['node_modules/vite/bin/vite.js', 'build']);
  node(`${round}: run.mjs (CSP scenes)`, ['run.mjs']);
}
console.log(`\nconsumer test passed: ${tarball} at svelte locked and ${floor}`);
