// Builds the next commit of the `public` branch from master's tree without the private paths below.
// `public` is the source on GitHub (remote `github`, branch `main`); master stays on the private origin.
// It works in a temporary index, so the working tree, the index and HEAD stay as they are.
// Usage: node scripts/public-snapshot.mjs "<commit message>"
import { execFileSync, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Never public: agent memory, session handoffs, overnight runs, the reference reel's frames
// (third-party stills; the text measurements in docs/ stay) and audit reports.
const PRIVATE = ['memory', 'handoffs', 'overnight', 'docs/reference', 'docs/audit-*.md'];
// Personal identifiers that must not reach a public commit: the private Git host, local paths,
// the personal mail address and private network addresses.
const IDENTIFIERS = [
  String.raw`git\.local`,
  String.raw`[a-z]:[/\\]users[/\\]`,
  String.raw`[a-z]:[/\\]dev[/\\]`,
  'localappdata',
  String.raw`@gmail\.com`,
  String.raw`(^|[^0-9.])10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}`,
  String.raw`(^|[^0-9.])192\.168\.[0-9]{1,3}\.[0-9]{1,3}`,
].join('|');
// Public commits carry GitHub's noreply address, never the mail address in the local git config.
// Tag a release with the same identity (AGENTS.md, Release).
const IDENTITY = { name: 'MYSTRAVIL', email: '58272034+MYSTRAVIL@users.noreply.github.com' };

const message = process.argv[2];
if (!message) {
  console.error('Usage: node scripts/public-snapshot.mjs "<commit message>"');
  process.exit(2);
}

const cwd = fileURLToPath(new URL('..', import.meta.url));
const git = (args, env = {}) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
const tryRev = (ref) => spawnSync('git', ['rev-parse', '--verify', '-q', ref], { cwd, encoding: 'utf8' }).stdout.trim();

const index = git(['rev-parse', '--git-path', 'public-snapshot.index']);
let tree;
try {
  const env = { GIT_INDEX_FILE: index };
  git(['read-tree', 'master'], env);
  git(['rm', '-r', '--cached', '-q', '-f', '--ignore-unmatch', '--', ...PRIVATE], env);
  tree = git(['write-tree'], env);
} finally {
  rmSync(index, { force: true });
}

const parent = tryRev('refs/heads/public');
if (parent && tryRev(`${parent}^{tree}`) === tree) {
  console.log(`public (${parent.slice(0, 7)}) already matches master; no commit made.`);
  process.exit(0);
}

const hits = spawnSync(
  'git',
  ['grep', '-I', '-n', '-i', '-E', IDENTIFIERS, tree, '--', '.', ':!scripts/public-snapshot.mjs'],
  { cwd, encoding: 'utf8' },
);
if (hits.status === 0) {
  console.error(`Personal identifiers in the snapshot; fix them on master first:\n${hits.stdout}`);
  process.exit(1);
}
if (hits.status !== 1) throw new Error(`git grep failed: ${hits.stderr}`);

const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message], {
  GIT_AUTHOR_NAME: IDENTITY.name,
  GIT_AUTHOR_EMAIL: IDENTITY.email,
  GIT_COMMITTER_NAME: IDENTITY.name,
  GIT_COMMITTER_EMAIL: IDENTITY.email,
});
git(['update-ref', 'refs/heads/public', commit, ...(parent ? [parent] : [])]);
const files = git(['ls-tree', '-r', '--name-only', commit]).split('\n').length;
const stat = parent ? git(['diff', '--shortstat', parent, commit]) : 'first snapshot';
console.log(`public -> ${commit.slice(0, 7)}: ${files} files; ${stat}`);
