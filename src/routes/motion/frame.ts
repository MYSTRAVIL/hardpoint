import { duration } from '#lib/motion/index.js';

/** One reel frame at 24 fps, used when `--decode-frame` is not set. */
const DEFAULT_FRAME = 42;

/**
 * One frame of the /motion lab effects, in ms: the element's
 * `--decode-frame`, as the decode reads it, or 42ms when it is not set. The
 * flicker steps on it. The property is not in tokens.css; the /motion
 * tuning sets it on <html>, and slow motion multiplies it, so the lab
 * effects slow down with the rest of the page.
 */
export function reelFrame(el: Element): number {
	const set = getComputedStyle(el).getPropertyValue('--decode-frame').trim() !== '';
	return set ? duration(el, '--decode-frame') : DEFAULT_FRAME;
}
