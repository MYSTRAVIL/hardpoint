// The photo the docs load into a MediaImage, on /motion and on
// /components/media-frame. Route-local: the package never ships it.
//
// "Staircase at Küppersmühle museum" (Duisburg) by Duesseljan, CC0 1.0:
// https://commons.wikimedia.org/wiki/File:Staircase_at_K%C3%BCppersm%C3%BChle_museum.jpg
// Made greyscale with crushed blacks, cropped to 3:2 and scaled to
// 1200x800.
import url from './staircase.jpg';

export const staircase = {
	src: url,
	alt: 'A concrete staircase seen from above, winding down around a narrow stairwell',
	width: 1200,
	height: 800
};

/**
 * A fresh copy of the photo as a new object URL, `ms` after the call or
 * later if the fetch takes longer, as a slow network would deliver it. The
 * local file would otherwise load at once. The copy is fetched with
 * `no-store` and is not decoded, so the image that shows it still loads and
 * decodes. Revoke the URL once it is replaced. An abort rejects.
 */
export async function delayedPhoto(ms: number, signal: AbortSignal): Promise<string> {
	const wait = Promise.withResolvers<void>();
	const timer = setTimeout(wait.resolve, ms);
	signal.addEventListener('abort', () => {
		clearTimeout(timer);
		wait.reject(signal.reason);
	});
	const fetched = fetch(url, { cache: 'no-store', signal }).then((response) => {
		if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
		return response.blob();
	});
	// Together, so an abort that rejects both reports once.
	const [blob] = await Promise.all([fetched, wait.promise]);
	signal.throwIfAborted();
	return URL.createObjectURL(blob);
}
