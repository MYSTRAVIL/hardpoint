import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from 'svelte/motion';

/**
 * A way a swipe sends the panel off screen: `down` for a bottom sheet,
 * `left` for a drawer from the left edge, and `left`, `right` or `down` for
 * the toast.
 */
export type SwipeDirection = 'down' | 'left' | 'right';

export interface SwipeDismissOptions {
	/** The way a swipe dismisses, or several ways. Default `down`. */
	direction?: SwipeDirection | readonly SwipeDirection[];
	/** Share of the panel's height (`down`) or width (`left`, `right`) a release must pass to dismiss. Default 0.25. */
	distance?: number;
	/** Release speed in px/ms towards a direction that dismisses at any distance. Default 0.5. */
	velocity?: number;
}

type Axis = 'x' | 'y';

/** Each direction's axis, and the sign of a screen coordinate moving that way. */
const WAYS: Record<SwipeDirection, { axis: Axis; sign: 1 | -1 }> = {
	down: { axis: 'y', sign: 1 },
	left: { axis: 'x', sign: -1 },
	right: { axis: 'x', sign: 1 }
};

/** Travel before a touch counts as a drag; it is not added to the panel's offset. */
const SLOP = 8;
/** A flick counts only if the finger was still moving this recently (ms). */
const FLICK_WINDOW = 100;

/**
 * Swipe to dismiss: down for a bottom sheet (BRIEF, Apps and phones:
 * Overlays), left for the shell's drawer, and left, right or down for the
 * toast. Attach it to the panel:
 * `{@attach swipeDismiss(() => (open = false))}`,
 * `{@attach swipeDismiss(close, { direction: 'left' })}`, or
 * `{@attach swipeDismiss(away, { direction: ['left', 'right', 'down'] })}`.
 *
 * The panel follows the finger through the CSS `translate` property, so
 * `transform` stays free for the transitions: after a dismiss the exit plays
 * on from where the finger let go, and under reduced motion it fades in
 * place. A release past `distance` of the panel's size along the swipe, or a
 * flick the way the panel moved, calls `onDismiss` with that direction, so
 * the exit can carry on that way; a shorter drag springs back over
 * `--dur-sheet-exit` (at once under reduced motion).
 *
 * With several directions, a drag takes the first one the finger moves
 * towards more than across it and stays on that axis: a panel that takes
 * `left` and `right` follows the finger both ways along it, with the slop
 * on either side of where the touch began.
 *
 * A touch that starts inside a list that can still scroll the way the
 * finger moves scrolls the list: a sheet moves only once its list sits at
 * its top. A move no direction takes (sideways on a sheet, up or down in a
 * drawer) is the browser's, so the gesture never fights the scroll; give a
 * drawer `touch-action: pan-y`, so a sideways move reaches the swipe, and a
 * panel that swipes along both axes `touch-action: pinch-zoom`. A drag never
 * activates what it started on: its `pointerup` and any `click` stop at the
 * panel. Touch only; a mouse closes a panel through its close button, the
 * scrim or Escape.
 */
export function swipeDismiss(
	onDismiss: (direction: SwipeDirection) => void,
	{ direction = 'down', distance = 0.25, velocity = 0.5 }: SwipeDismissOptions = {}
): Attachment<HTMLElement> {
	const ways: readonly SwipeDirection[] = typeof direction === 'string' ? [direction] : direction;
	const usesX = ways.some((w) => WAYS[w].axis === 'x');
	const usesY = ways.some((w) => WAYS[w].axis === 'y');
	/** The panel's direction along `axis` towards `sign`, if it takes one. */
	const wayTo = (axis: Axis, sign: number) => ways.find((w) => WAYS[w].axis === axis && WAYS[w].sign === sign);

	return (node) => {
		let phase: 'idle' | 'pending' | 'dragging' = 'idle';
		let dragged = false;
		let startX = 0;
		let startY = 0;
		// While dragging: the axis it moves on, the panel's offset along it in
		// screen pixels, and the finger's last travel from the start and its
		// speed along it (px/ms).
		let axis: Axis = 'y';
		let offset = 0;
		let last = 0;
		let lastT = 0;
		let speed = 0;
		let scrollerX: HTMLElement | null = null;
		let scrollerY: HTMLElement | null = null;

		function place(shift: number, animate: boolean) {
			node.style.transition = animate ? 'translate var(--dur-sheet-exit) var(--settle)' : '';
			node.style.translate = shift !== 0 ? (axis === 'x' ? `${shift}px 0` : `0 ${shift}px`) : '';
		}

		/** The nearest ancestor of the touch, inside the panel, that scrolls along `along`. */
		function scrollerOf(target: EventTarget | null, along: Axis): HTMLElement | null {
			for (let el = target instanceof Element ? target : null; el && el !== node; el = el.parentElement) {
				if (!(el instanceof HTMLElement)) continue;
				if (along === 'x' ? el.scrollWidth <= el.clientWidth : el.scrollHeight <= el.clientHeight) continue;
				const style = getComputedStyle(el);
				const overflow = along === 'x' ? style.overflowX : style.overflowY;
				if (overflow === 'auto' || overflow === 'scroll') return el;
			}
			return null;
		}

		/**
		 * Whether a list under the touch still scrolls the way the finger
		 * moves: a sheet's list away from its top, a drawer's row short of its
		 * end, a row scrolled away from its start.
		 */
		function scrolls(way: SwipeDirection): boolean {
			if (way === 'down') return !!scrollerY && scrollerY.scrollTop > 0;
			if (!scrollerX) return false;
			if (way === 'left') return Math.ceil(scrollerX.scrollLeft) + scrollerX.clientWidth < scrollerX.scrollWidth;
			return scrollerX.scrollLeft > 0;
		}

		function release() {
			if (phase === 'dragging') place(0, !prefersReducedMotion.current);
			phase = 'idle';
			offset = 0;
		}

		function onTouchStart(e: TouchEvent) {
			if (e.touches.length !== 1) {
				// A second finger is not a swipe.
				release();
				return;
			}
			const touch = e.touches[0];
			startX = touch.clientX;
			startY = touch.clientY;
			lastT = e.timeStamp;
			speed = 0;
			offset = 0;
			scrollerX = usesX ? scrollerOf(e.target, 'x') : null;
			scrollerY = usesY ? scrollerOf(e.target, 'y') : null;
			phase = 'pending';
		}

		function onTouchMove(e: TouchEvent) {
			if (phase === 'idle') return;
			const touch = e.touches[0];
			const dx = touch.clientX - startX;
			const dy = touch.clientY - startY;

			if (phase === 'pending') {
				// The first direction the finger moves towards more than across it.
				const way = ways.find((w) => {
					const { axis: a, sign } = WAYS[w];
					const travel = sign * (a === 'x' ? dx : dy);
					return travel > 0 && travel >= Math.abs(a === 'x' ? dy : dx);
				});
				if (!way || scrolls(way)) {
					// Back, across, or a list with room to scroll: the browser's gesture.
					if (Math.abs(dx) + Math.abs(dy) > 2) phase = 'idle';
					return;
				}
				// Towards dismissal: the panel takes the gesture, so the list
				// neither scrolls nor overscrolls.
				if (e.cancelable) e.preventDefault();
				const { axis: a, sign } = WAYS[way];
				const along = a === 'x' ? dx : dy;
				if (sign * along < SLOP) return;
				phase = 'dragging';
				dragged = true;
				axis = a;
				last = along;
				lastT = e.timeStamp;
			}

			if (e.cancelable) e.preventDefault();
			// The travel from the touch's start less the slop, towards the
			// panel's directions only.
			const moved = axis === 'x' ? dx : dy;
			offset = moved > SLOP && wayTo(axis, 1) ? moved - SLOP : moved < -SLOP && wayTo(axis, -1) ? moved + SLOP : 0;
			const dt = e.timeStamp - lastT;
			if (dt > 0) speed = (moved - last) / dt;
			last = moved;
			lastT = e.timeStamp;
			place(offset, false);
		}

		function onTouchEnd(e: TouchEvent) {
			if (phase !== 'dragging') {
				phase = 'idle';
				return;
			}
			// The way the panel moved; at rest, the way the finger was going.
			const way = wayTo(axis, Math.sign(offset || speed));
			const flick = !!way && WAYS[way].sign * speed > velocity && e.timeStamp - lastT < FLICK_WINDOW;
			const size = axis === 'x' ? node.offsetWidth : node.offsetHeight;
			if (way && (Math.abs(offset) > size * distance || flick)) {
				// Keep the offset: the exit transition continues from here.
				phase = 'idle';
				onDismiss(way);
			} else {
				release();
			}
		}

		// Any new press clears the flag left by the last drag.
		function onPointerDown() {
			dragged = false;
		}

		// Pointer events fire before their touch events, so the drag is still
		// in progress when its pointerup arrives.
		function onPointerUp(e: PointerEvent) {
			if (e.pointerType === 'touch' && phase === 'dragging') e.stopPropagation();
		}

		// A drag's click, if the browser sends one, never reaches the content.
		// A click from the keyboard or from code (detail 0) is never a drag's,
		// and it comes with no press to clear the flag.
		function onClick(e: MouseEvent) {
			if (!dragged || e.detail === 0) return;
			dragged = false;
			e.stopPropagation();
			e.preventDefault();
		}

		const capture = { capture: true };
		node.addEventListener('touchstart', onTouchStart, { passive: true });
		node.addEventListener('touchmove', onTouchMove, { passive: false });
		node.addEventListener('touchend', onTouchEnd, { passive: true });
		node.addEventListener('touchcancel', release, { passive: true });
		node.addEventListener('pointerdown', onPointerDown, capture);
		node.addEventListener('pointerup', onPointerUp, capture);
		node.addEventListener('click', onClick, capture);

		return () => {
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('touchmove', onTouchMove);
			node.removeEventListener('touchend', onTouchEnd);
			node.removeEventListener('touchcancel', release);
			node.removeEventListener('pointerdown', onPointerDown, capture);
			node.removeEventListener('pointerup', onPointerUp, capture);
			node.removeEventListener('click', onClick, capture);
		};
	};
}
