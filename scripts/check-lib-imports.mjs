// Fail when a file the package ships imports something a consumer cannot resolve.
// The package ships src/lib as dist/. `#lib` maps to ./src/lib, which is not shipped, and the
// consumers (topic-map, omp-remote) are Svelte apps without SvelteKit, so `$app`, `$env` and
// `@sveltejs/kit` do not exist there. Files in src/lib import each other by relative path.
// Second rule: a component must not give a Bits UI import the local name of its own file.
// svelte-package names the generated default export after the file (`declare const Button`), so
// `import type { Button } from 'bits-ui'` in Button.svelte makes the .d.ts clash and `<Button>`
// becomes type-only for the consumer. Alias the import (`Button as BitsButton`).
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { root } from './lib/server.mjs';

const lib = join(root, 'src', 'lib');
const banned = /(?:from|import)\s*\(?\s*['"]((?:#lib|\$lib|\$app|\$env|@sveltejs\/kit)(?:\/[^'"]*)?)['"]/g;

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(svelte|ts|js)$/.test(e.name) ? [join(dir, e.name)] : []
  );

const hits = [];
for (const file of files(lib)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(banned)) hits.push(`${relative(root, file)}:${i + 1}: ${m[1]}`);
  });
}

const clashes = [];
const bitsImport = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]bits-ui['"]/g;
for (const file of files(join(lib, 'components'))) {
  if (!file.endsWith('.svelte')) continue;
  const base = basename(file, '.svelte');
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(bitsImport)) {
    for (const spec of m[1].split(',')) {
      const parts = spec.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const local = parts[parts.length - 1].trim();
      if (local !== base) continue;
      const line = text.slice(0, m.index).split('\n').length;
      clashes.push(`${relative(root, file)}:${line}: ${local}`);
    }
  }
}

if (hits.length || clashes.length) {
  if (hits.length) {
    console.log('src/lib imports that consumers cannot resolve (use a relative path; no SvelteKit modules):');
    for (const h of hits) console.log('  ' + h);
  }
  if (clashes.length) {
    console.log(
      "bits-ui imports named like their component file (svelte-package names the default export after the file, so the generated .d.ts would clash; alias it, e.g. `Button as BitsButton`):"
    );
    for (const c of clashes) console.log('  ' + c);
  }
  process.exit(1);
}
console.log('lib imports ok');
