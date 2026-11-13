// Fail on three style rules of the package that the type checker cannot see (docs/BRIEF.md, AGENTS.md):
// 1. No static `style` attribute in component markup. Consumers such as omp-remote serve
//    `Content-Security-Policy: style-src 'self'`, which blocks a style attribute parsed from markup.
//    `style:` directives and `style={…}` (or a quoted value with an expression) are allowed: Svelte
//    writes those through the CSSOM.
// 2. Colours only through tokens: no hex colour (`#fff`, or `%23fff` in a URL-encoded SVG) and no colour
//    function (`rgb(`, `hsl(`, `oklch(`, `color(srgb …` and kin) in src/lib outside tokens.css. Comments
//    are skipped. Named colours are not checked.
// 3. The palette blocks of tokens.css (`:root`, `:root[data-theme='light']` and `:root[data-theme='system']`
//    under `prefers-color-scheme: light`) give every colour token a value: a name that holds a colour in
//    one block must be set in all three. The two light blocks must also stay identical.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { root } from './lib/server.mjs';

const lib = join(root, 'src', 'lib');
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(svelte|ts|js|css)$/.test(e.name) ? [join(dir, e.name)] : []
  );
const blank = (s) => s.replace(/[^\n]/g, ' ');
// Comments out, line breaks kept so line numbers still match. A `//` comment needs a space or a line start
// before it, so `https://` and `url(//…)` stay.
const stripComments = (text) =>
  text
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[\s;{}])(\/\/[^\n]*)/g, (_, before, comment) => before + blank(comment));
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const where = (file, text, index) => `${relative(root, file).replace(/\\/g, '/')}:${lineOf(text, index)}`;

// ---- 1. static style attributes -------------------------------------------------------------------
// Markup only: script and style blocks are blanked first. A value counts as static when it holds no `{`.
const styleAttr = /(?<![\w:.$-])style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`{][^\s>]*))/g;
const styles = [];
for (const file of files(lib)) {
  if (!file.endsWith('.svelte')) continue;
  const text = stripComments(readFileSync(file, 'utf8')).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, blank);
  for (const m of text.matchAll(styleAttr)) {
    const value = m[1] ?? m[2] ?? m[3];
    if (!value.includes('{')) styles.push(`${where(file, text, m.index)}: ${m[0].trim()}`);
  }
}

// ---- 2. colour literals outside tokens.css --------------------------------------------------------
const HEX = '(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})';
const colour = new RegExp(
  [
    // #abc in CSS or a string. Not an HTML entity (&#123;), a URL fragment (/#abc), a private member
    // (this.#fade, `#fade = …`, `#fade(`), an id selector followed by a block or a pseudo-class, or part
    // of a longer word.
    `(?<![\\w&#.%$/-])#${HEX}(?![\\w-])(?!\\s*[=(:{!?])`,
    // %23abc: a colour inside a URL-encoded SVG.
    `%23${HEX}(?![0-9a-fA-F])`,
    // A colour function with a literal first argument (a number, `none`, `from`).
    `\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(\\s*(?:[\\d.+-]|none\\b|from\\b)`,
    `\\bcolor\\(\\s*(?:from\\b|srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz)`,
  ].join('|'),
  'g'
);
const tokensFile = join(lib, 'tokens.css');
const colours = [];
for (const file of files(lib)) {
  if (file === tokensFile) continue;
  const text = stripComments(readFileSync(file, 'utf8'));
  for (const m of text.matchAll(colour)) {
    // A colour function is shown up to its closing parenthesis.
    const shown = m[0].includes('(') ? text.slice(m.index, text.indexOf(')', m.index) + 1) : m[0];
    colours.push(`${where(file, text, m.index)}: ${shown}`);
  }
}

// ---- 3. palette blocks in tokens.css --------------------------------------------------------------
const tokens = stripComments(readFileSync(tokensFile, 'utf8'));
// The body of the first block opened by `selector` after `from`, braces matched.
function block(selector, from = 0) {
  const at = tokens.indexOf(selector, from);
  if (at < 0) return null;
  const open = tokens.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < tokens.length; i++) {
    if (tokens[i] === '{') depth++;
    else if (tokens[i] === '}' && --depth === 0) return { start: open + 1, end: i, body: tokens.slice(open + 1, i) };
  }
  return null;
}
// The custom properties a block sets at its own level, name -> value.
function declarations(body) {
  const out = new Map();
  let depth = 0;
  let flat = '';
  for (const ch of body) {
    if (ch === '{') depth++;
    if (depth === 0) flat += ch;
    if (ch === '}') depth--;
  }
  for (const m of flat.matchAll(/(--[\w-]+)\s*:\s*([^;]*);/g)) out.set(m[1], m[2].trim());
  return out;
}
const palette = [];
const dark = block(':root {');
const light = block(":root[data-theme='light']");
const scheme = block('@media (prefers-color-scheme: light)');
const system = scheme ? block(":root[data-theme='system']", scheme.start - 1) : null;
const blocks = [
  [':root', dark],
  [":root[data-theme='light']", light],
  [":root[data-theme='system'] (prefers-color-scheme: light)", system],
];
for (const [name, b] of blocks) if (!b) palette.push(`src/lib/tokens.css: no ${name} block found`);
if (!palette.length) {
  const sets = blocks.map(([name, b]) => ({ name, decl: declarations(b.body) }));
  const isColour = (value) => new RegExp(colour.source).test(value) || /^#[0-9a-fA-F]{3,8}$/.test(value);
  const colourNames = new Set(sets.flatMap(({ decl }) => [...decl].filter(([, v]) => isColour(v)).map(([k]) => k)));
  for (const token of [...colourNames].sort()) {
    const missing = sets.filter(({ decl }) => !decl.has(token)).map(({ name }) => name);
    if (missing.length) palette.push(`src/lib/tokens.css: ${token} has no value in ${missing.join(' and ')}`);
  }
  const [, l, s] = sets;
  for (const token of new Set([...l.decl.keys(), ...s.decl.keys()])) {
    if (l.decl.get(token) !== s.decl.get(token))
      palette.push(
        `src/lib/tokens.css: ${token} differs between the light blocks (${l.decl.get(token) ?? 'unset'} against ${s.decl.get(token) ?? 'unset'})`
      );
  }
}

const sections = [
  ['Static style attributes in component markup (blocked by style-src without unsafe-inline; use style: or style={…}):', styles],
  ['Colour literals in src/lib outside tokens.css (use a token from tokens.css):', colours],
  ['Palette blocks in tokens.css out of step (every colour token needs a value in all three; the light blocks stay identical):', palette],
];
let failed = false;
for (const [title, hits] of sections) {
  if (!hits.length) continue;
  failed = true;
  console.log(title);
  for (const h of hits) console.log('  ' + h);
}
if (failed) process.exit(1);
console.log('lib styles ok');
