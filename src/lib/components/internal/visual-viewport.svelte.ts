import { untrack } from 'svelte';

/**
 * The visual viewport while it is at least 1px shorter than the layout
 * viewport, as when the on-screen keyboard is up: its top and bottom edges,
 * measured from the layout viewport's top, and its height, in px.
 */
export interface VisualViewportLift {
	top: number;
	bottom: number;
	height: number;
}

/** Room kept round a field the body scrolls into view: its focus contour (2px, 4px out) and some air. */
const REVEAL_MARGIN = 8;

/**
 * The on-screen keyboard for a panel fixed to the layout viewport: the
 * shared Sheet and the full-screen Dialog follow the visual viewport while
 * they are open (decided 2026-11-10). A fixed panel sits on the layout
 * viewport, and the keyboard shrinks only the visual viewport (Chrome on
 * Android by default, iOS always), so it covers the panel's lower part.
 * Call this while the component initialises; place the panel from
 * `current`, which is null while the visual viewport is not shorter.
 *
 * While `open()` is true it listens to `visualViewport` `resize` and
 * `scroll`. A pinch zoom shrinks the visual viewport on purpose; the panel
 * then keeps its last place, as omp-remote's shell does. Each opening
 * starts from the layout viewport, so a keyboard line left from the last
 * opening never carries over; closing keeps the last place, so the exit
 * plays from there. The listeners start before the panel mounts, so it
 * opens in place.
 *
 * When the panel moves or shrinks, the focused element inside `body()` (the
 * panel's scrolling body) stays in sight: the body scrolls it into view,
 * the nearest way, top first if it is taller than the body. Only the body,
 * so neither the page nor the visual viewport moves.
 */
export function followVisualViewport(
	open: () => boolean,
	body: () => HTMLElement | null
): { readonly current: VisualViewportLift | null } {
	let lifted = $state<VisualViewportLift | null>(null);

	$effect.pre(() => {
		if (!open()) return;
		const viewport = window.visualViewport;
		if (!viewport) return;
		const sync = () => {
			if (Math.abs(viewport.scale - 1) > 0.01) return;
			if (document.documentElement.clientHeight - viewport.height < 1) {
				lifted = null;
				return;
			}
			const top = viewport.offsetTop;
			const bottom = top + viewport.height;
			if (lifted?.top !== top || lifted.bottom !== bottom || lifted.height !== viewport.height) {
				lifted = { top, bottom, height: viewport.height };
			}
		};
		untrack(() => {
			lifted = null;
			sync();
		});
		viewport.addEventListener('resize', sync);
		viewport.addEventListener('scroll', sync);
		return () => {
			viewport.removeEventListener('resize', sync);
			viewport.removeEventListener('scroll', sync);
		};
	});

	$effect(() => {
		const scroller = lifted && body();
		if (!scroller) return;
		const field = document.activeElement;
		if (!(field instanceof HTMLElement) || !scroller.contains(field) || field === scroller) return;
		const view = scroller.getBoundingClientRect();
		const box = field.getBoundingClientRect();
		const above = view.top - (box.top - REVEAL_MARGIN);
		const below = box.bottom + REVEAL_MARGIN - view.bottom;
		if (above > 0) scroller.scrollTop -= above;
		else if (below > 0) scroller.scrollTop += Math.min(below, -above);
	});

	return {
		get current() {
			return lifted;
		}
	};
}
