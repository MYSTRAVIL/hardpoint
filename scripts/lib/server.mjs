// Shared by shot.mjs and audit.mjs: free-port lookup, private Vite dev server, base-URL resolution.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Git Bash can rewrite a leading single-letter path (e.g. "/t/…") into a drive path ("T:/…"); undo that so bash callers work too.
export function normalizeTarget(target) {
  return target.replace(/^[A-Za-z]:[\\/]/, '/').replace(/\\/g, '/');
}

export function freePort() {
  return new Promise((res) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });
}

export async function startVite(port) {
  const bin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [bin, '--port', String(port), '--strictPort', '--host', '127.0.0.1', '--logLevel', 'silent'],
    { cwd: root, stdio: 'ignore', windowsHide: true });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, { method: 'HEAD' });
      if (r.ok || r.status === 404) return child;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('vite did not start within 30s');
}

// Resolve the base URL: a private Vite server with `serve`, otherwise SHOT_BASE (default http://localhost:5173).
// `server` is the child process to kill when done (null when not serving).
export async function resolveBase(serve) {
  if (serve) {
    const port = await freePort();
    const server = await startVite(port);
    return { base: `http://127.0.0.1:${port}`, server };
  }
  return { base: process.env.SHOT_BASE ?? 'http://localhost:5173', server: null };
}
