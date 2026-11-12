// The docs photo 1.5 seconds late, as a slow network would deliver it, so
// the image viewer's spinner shows. Part of the docs site only; the package
// never ships it. Never cached, so every open waits again. The bytes come
// from the bundled file's own URL on this server.
import photo from '../../../staircase.jpg';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const late = Promise.withResolvers<void>();
	setTimeout(late.resolve, 1500);
	const [file] = await Promise.all([fetch(new URL(photo, url)), late.promise]);
	if (!file.ok) return new Response(null, { status: file.status });
	return new Response(file.body, {
		headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' }
	});
};
