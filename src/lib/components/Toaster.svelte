<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** Attributes and `class` go to the toast box while one shows. */
	export type ToasterProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		/** The toast region's name, for landmark navigation (default "Notifications"). */
		label?: string;
		/** The close button's accessible name (default "Dismiss"). */
		closeLabel?: string;
	};
</script>

<script lang="ts">
	import { Portal } from 'bits-ui';
	import { onMount, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import { curve, duration } from '../motion/index.js';
	import Button from './Button.svelte';
	import { swipeDismiss, type SwipeDirection } from './internal/swipe-dismiss.js';
	import { followVisualViewport } from './internal/visual-viewport.svelte.js';
	import { toastSlot as slot, type ShownToast } from './toast.svelte.js';

	let { label = 'Notifications', closeLabel = 'Dismiss', class: className, ...rest }: ToasterProps = $props();

	/** How far the box rises as it enters and drops as it leaves (px). */
	const RISE = 16;
	/** How far below rest a replacement's short entrance starts (px). */
	const REPLAY_RISE = 8;

	// The first Toaster mounted renders the slot; another one renders
	// nothing until the first unmounts.
	const self = {};
	onMount(() => slot.register(self));
	const active = $derived(slot.renders(self));
	const shown = $derived(active ? slot.current : null);

	let box = $state<HTMLElement | null>(null);
	// Where focus was before it entered the toast, to give it back.
	let origin: HTMLElement | null = null;
	// The way a swipe sent the box off, until it is gone or back at rest.
	let swiped: SwipeDirection | null = null;
	// Svelte's transition on the box, from its start event to its end.
	let transit: 'in' | 'out' | null = null;
	// The id shown before the last change, and the replacement's entrance.
	let lastId: number | null = null;
	let replay: Animation | null = null;

	// Above the on-screen keyboard (internal/visual-viewport.svelte.ts): while
	// it shortens the visual viewport, the toast stands on that edge instead.
	const viewport = followVisualViewport(
		() => shown !== null,
		() => null
	);

	// A hidden page holds the timer, so a toast is never used up unseen.
	$effect(() => {
		if (!active) return;
		const sync = () => (document.hidden ? slot.hold('hidden') : slot.release('hidden'));
		untrack(sync);
		document.addEventListener('visibilitychange', sync);
		return () => {
			document.removeEventListener('visibilitychange', sync);
			untrack(() => {
				slot.release('hidden');
				slot.release('pointer');
				slot.release('focus');
			});
		};
	});

	// Before the box changes: focus on a part that goes away (the whole box,
	// or the action when the next toast has none) returns to where it came
	// from. A box that goes away under a resting pointer or with focus gets
	// no leave event, so its holds end here.
	$effect.pre(() => {
		const next = shown;
		untrack(() => {
			const focused = document.activeElement;
			if (
				box &&
				focused &&
				box.contains(focused) &&
				(!next || (focused.matches('.hp-toaster-action') && !next.action))
			) {
				giveFocusBack();
			}
			if (!next && box) {
				slot.release('pointer');
				slot.release('focus');
			}
		});
	});

	// After the box changed: a toast that replaces the one on screen replays
	// a short entrance. While Svelte's transition moves the box (entering,
	// or leaving and reversed by this toast), the new text rides it.
	$effect(() => {
		const id = shown?.id ?? null;
		untrack(() => {
			const replaced = id !== null && lastId !== null && id !== lastId;
			lastId = id;
			if (replaced && box && !transit) replayEntrance(box);
		});
	});

	/**
	 * The replacement's entrance: from 8px down and transparent to rest over
	 * --dur-pop on --settle, both read from the box. One that arrives during
	 * it starts again from where the box is. Reduced motion: opacity only.
	 */
	function replayEntrance(node: HTMLElement) {
		const ms = duration(node, '--dur-pop');
		if (ms <= 0) return;
		const moves = !prefersReducedMotion.current;
		const now = getComputedStyle(node);
		const running = replay?.playState === 'running';
		const from: Keyframe = { opacity: running ? now.opacity : 0 };
		if (moves) from.transform = running ? now.transform : `translateY(${REPLAY_RISE}px)`;
		const settle = now.getPropertyValue('--settle').trim();
		replay?.cancel();
		replay = node.animate([from, moves ? { opacity: 1, transform: 'none' } : { opacity: 1 }], {
			duration: ms,
			easing: CSS.supports('transition-timing-function', settle) ? settle : 'ease-out'
		});
	}

	/**
	 * Showing and dismissing, at the sheet timing read from the box
	 * (--dur-sheet in, --dur-sheet-exit out, on --settle): a 16px rise with
	 * a fade, and a 16px drop with a fade. After a swipe the box leaves the
	 * way the finger went, by its own size, from where the finger let go; a
	 * toast sent during that exit brings it back the same way. Reduced
	 * motion: a fade in place.
	 */
	function motion(node: Element) {
		return ({ direction }: { direction?: 'in' | 'out' } = {}): TransitionConfig => {
			const way = swiped;
			const path = (u: number) =>
				way === 'left' || way === 'right'
					? `translateX(${(way === 'left' ? -u : u) * 100}%)`
					: way === 'down'
						? `translateY(${u * 100}%)`
						: `translateY(${u * RISE}px)`;
			return {
				duration: duration(node, direction === 'out' ? '--dur-sheet-exit' : '--dur-sheet'),
				easing: curve(node),
				css: prefersReducedMotion.current
					? (t) => `opacity: ${t}`
					: (t, u) => `opacity: ${t}; transform: ${path(u)}`
			};
		};
	}

	function giveFocusBack() {
		const focused = document.activeElement;
		if (!box || !(focused instanceof HTMLElement) || !box.contains(focused)) return;
		if (origin?.isConnected) origin.focus({ preventScroll: true });
		else focused.blur();
		origin = null;
	}

	// F8 moves focus to the action, or to the close button when there is none.
	function jump(e: KeyboardEvent) {
		if (e.key !== 'F8' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !box) return;
		e.preventDefault();
		box.querySelector<HTMLElement>('.hp-toaster-action, .hp-toaster-close')?.focus();
	}

	// The close button, Escape, a swipe and the action: focus inside goes
	// back to where it came from, and the box leaves.
	function dismiss(toast: ShownToast) {
		giveFocusBack();
		slot.dismiss(toast.id);
	}

	function run(toast: ShownToast) {
		dismiss(toast);
		toast.action?.onclick();
	}

	function swipeAway(way: SwipeDirection) {
		if (!shown) return;
		swiped = way;
		dismiss(shown);
	}

	function escape(e: KeyboardEvent) {
		if (e.key !== 'Escape' || !shown) return;
		// Escape here belongs to the toast, not to a dialog or menu under it.
		e.stopPropagation();
		dismiss(shown);
	}

	function focusIn(e: FocusEvent) {
		// An open dialog's focus trap may already have pulled focus back.
		if (!box?.contains(document.activeElement)) return;
		const from = e.relatedTarget;
		if (!(from instanceof Node) || !box.contains(from)) origin = from instanceof HTMLElement ? from : null;
		slot.hold('focus');
	}

	function focusOut(e: FocusEvent) {
		const to = e.relatedTarget;
		if (to instanceof Node && box?.contains(to)) return;
		slot.release('focus');
	}

	// A press keeps focus where it is, so a field keeps the on-screen
	// keyboard up, and it is not a press outside an open dialog, popover or
	// menu, which would close it. The action's and close button's clicks
	// still run.
	function press(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	// A pointer over the box holds the timer. On touch the finger is over it
	// from touchdown to lift, so a drag holds it too.
	const enter = () => slot.hold('pointer');
	const leave = () => slot.release('pointer');

	function introStart() {
		transit = 'in';
		// A toast sent during a swipe's exit brings the box back on the
		// swipe's path; the finger's offset springs back with it.
		if (swiped && box) {
			box.style.transition = prefersReducedMotion.current ? '' : 'translate var(--dur-sheet) var(--settle)';
			box.style.translate = '';
		}
	}
	const outroStart = () => (transit = 'out');
	function atRest() {
		transit = null;
		swiped = null;
	}

	// On the box itself, not delegated, so a stopped press or Escape never
	// reaches Bits UI's listeners on the document.
	function listen(node: HTMLElement) {
		// A new box carries nothing over from one that left mid-transition.
		atRest();
		replay = null;
		node.addEventListener('pointerdown', press);
		node.addEventListener('pointerenter', enter);
		node.addEventListener('pointerleave', leave);
		node.addEventListener('focusin', focusIn);
		node.addEventListener('focusout', focusOut);
		node.addEventListener('keydown', escape);
		node.addEventListener('introstart', introStart);
		node.addEventListener('introend', atRest);
		node.addEventListener('outrostart', outroStart);
		node.addEventListener('outroend', atRest);
		return () => {
			node.removeEventListener('pointerdown', press);
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', leave);
			node.removeEventListener('focusin', focusIn);
			node.removeEventListener('focusout', focusOut);
			node.removeEventListener('keydown', escape);
			node.removeEventListener('introstart', introStart);
			node.removeEventListener('introend', atRest);
			node.removeEventListener('outrostart', outroStart);
			node.removeEventListener('outroend', atRest);
		};
	}
</script>

<!--
	The one toast, at the bottom centre over everything but tooltips. It
	rises 16px with a fade over --dur-sheet and drops 16px with a fade over
	--dur-sheet-exit (reduced motion fades only). A new toast replaces the
	text in place: the box keeps its place, changes size at once and replays
	a short entrance (8px over --dur-pop); a toast sent while the box leaves
	takes it back instead.

	It dismisses on its timer, the close button at its end, Escape (with
	focus inside), running the action, and on touch a swipe left, right or
	down (internal/swipe-dismiss.ts). After a swipe it leaves the way the
	finger went.

	Screen readers hear each message from a visually hidden role="status"
	line that stays mounted. Each toast is a new node in it, so the same
	message twice is announced twice. The box is not a live region and never
	takes focus by itself: it is a region landmark named by `label`, last in
	the page. F8 moves focus to the action, or to the close button when
	there is none; Escape, the close button and the action dismiss it and
	give focus back. The timer waits while a pointer or finger is on the
	box, while focus is inside it and while the page is hidden.
-->
<svelte:window onkeydown={jump} />

{#if active}
	<Portal>
		<p class="hp-visually-hidden hp-toaster-status" role="status">
			{#if shown}{#key shown.id}<span>{shown.message}</span>{/key}{/if}
		</p>
		{#if shown}
			{@const lifted = viewport.current}
			<section
				bind:this={box}
				{...rest}
				class={['hp-toaster', className]}
				aria-label={label}
				aria-keyshortcuts="F8"
				data-action={shown.action ? '' : undefined}
				data-lifted={lifted ? '' : undefined}
				style:bottom={lifted ? `calc(100% - ${lifted.bottom}px + var(--gutter))` : undefined}
				{@attach listen}
				{@attach swipeDismiss(swipeAway, { direction: ['left', 'right', 'down'] })}
				transition:motion
			>
				<p class="hp-toaster-message">{shown.message}</p>
				{#if shown.action}
					<Button variant="tertiary" class="hp-toaster-action" onclick={() => shown && run(shown)}>
						{shown.action.label}
					</Button>
				{/if}
				<Button
					variant="tertiary"
					icon
					class="hp-toaster-close"
					aria-label={closeLabel}
					onclick={() => shown && dismiss(shown)}
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="square"
						aria-hidden="true"
					>
						<path d="M3 3l10 10M13 3L3 13" />
					</svg>
				</Button>
			</section>
		{/if}
	</Portal>
{/if}

<style>
	/* The Tooltip's box at the bottom centre: black, the control boundary,
	   square. As wide as its text up to --toast-width, 30rem unless set (an
	   app sets it with a class on the Toaster and a rule in its stylesheet;
	   the default is the var() fallback, so any rule wins whatever its
	   specificity), inside the page gutters and the safe areas, so it never
	   meets a screen edge. Bits UI sets
	   pointer-events: none on <body> while a dialog or a list is open; the
	   toast takes presses anyway. A drag along either axis is the swipe's,
	   so it never scrolls the page under the toast; pinch zoom stays the
	   browser's. */
	.hp-toaster {
		position: fixed;
		right: calc(var(--gutter) + env(safe-area-inset-right));
		bottom: calc(var(--gutter) + env(safe-area-inset-bottom));
		left: calc(var(--gutter) + env(safe-area-inset-left));
		z-index: var(--layer-toast);
		display: flex;
		align-items: center;
		box-sizing: border-box;
		width: fit-content;
		max-width: var(--toast-width, 30rem);
		margin: 0 auto;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
		font-size: var(--type-body);
		line-height: 24px;
		pointer-events: auto;
		touch-action: pinch-zoom;
	}

	/* Over AppShell's bottom bar (compact widths, data-bar), which is
	   --header-height high above the bottom safe area. While the on-screen
	   keyboard is up, the inline bottom wins: the bar is under the keyboard. */
	@media (max-width: 599px) {
		:global(:where(html:has(.hp-app-shell[data-bar]))) .hp-toaster {
			bottom: calc(var(--header-height) + var(--gutter) + env(safe-area-inset-bottom));
		}
	}

	/* 16px where a coarse pointer reads it, the dense 14px on fine pointers. */
	@media (pointer: fine) {
		.hp-toaster {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	/* One control high on one line, so a box with an action and one without
	   match; longer text wraps, never truncates. */
	.hp-toaster-message {
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		min-width: 0;
		min-height: var(--control-height);
		padding: var(--space-2) var(--space-3);
		overflow-wrap: anywhere;
	}

	/* At the end: the action, a text button with its own padding, then the
	   close button, Dialog's × as a square tertiary icon button
	   (--control-height: 36px fine, 44px coarse). */
	.hp-toaster :global(.hp-toaster-action),
	.hp-toaster :global(.hp-toaster-close) {
		flex: none;
	}
</style>
