import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The consuming app's production policy, verbatim.
export const CSP =
	"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

export default defineConfig({
	plugins: [svelte()],
	preview: { host: '127.0.0.1', port: Number(process.env.CONSUMER_PORT || 4180), strictPort: true, headers: { 'Content-Security-Policy': CSP } }
});
