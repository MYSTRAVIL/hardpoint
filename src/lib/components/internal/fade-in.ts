import { duration } from '../../motion/transitions.js';

/**
 * Short motion (BRIEF): fades `node` in from opacity 0 over the duration
 * token `token`, such as `--dur-panel`, on `--settle`. Both are read from the
 * node now, so a retuned token applies. At 0ms it does nothing and the node
 * shows at once, as it did before the token existed. Opacity only, so it
 * runs under reduced motion too. Call it after the change is in the DOM and
 * before the next frame, so the first frame already shows opacity 0. Returns
 * the fade, or null when there is none.
 */
export function fadeIn(node: Element, token: string): Animation | null {
	const ms = duration(node, token);
	if (ms <= 0) return null;
	const settle = getComputedStyle(node).getPropertyValue('--settle').trim();
	return node.animate([{ opacity: 0 }, { opacity: 1 }], {
		duration: ms,
		easing: CSS.supports('transition-timing-function', settle) ? settle : 'ease-out'
	});
}
