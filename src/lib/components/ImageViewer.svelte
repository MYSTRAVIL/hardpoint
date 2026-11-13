<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { Dialog as BitsDialog } from 'bits-ui';

	export type ImageViewerTriggerSnippetProps = {
		/**
		 * Spread onto the button that opens the viewer, usually around a
		 * thumbnail, so the image opens from the keyboard too.
		 */
		props: Record<string, unknown>;
	};

	/**
	 * Attributes and handlers not listed here go to the viewer element (Bits
	 * UI `Dialog.Content`), among them `onOpenAutoFocus`, `onCloseAutoFocus`,
	 * `onEscapeKeydown` and `onInteractOutside`.
	 */
	export type ImageViewerProps = Omit<
		BitsDialog.ContentProps,
		'child' | 'children' | 'forceMount' | 'ref' | 'title'
	> & {
		open?: boolean;
		/** The image's URL. A different URL while open starts a new load at scale 1. */
		src: string;
		/**
		 * The text alternative, required. It also names the viewer when there
		 * is no `title`, so it should describe the image, never be empty.
		 */
		alt: string;
		/**
		 * A line in the top bar, shown as written (a file name, a caption) on
		 * one line, cut with an ellipsis. It names the viewer when set.
		 */
		title?: string;
		/** The button that opens the viewer: spread `props` onto it. */
		trigger?: Snippet<[ImageViewerTriggerSnippetProps]>;
		/**
		 * Shows the Download button, which saves `src` under this file name
		 * through a link with `download`. A `data:` URL becomes a `blob:` URL
		 * first. Browsers ignore `download` on a link to another origin, so an
		 * image from another origin needs `ondownload`.
		 */
		downloadName?: string;
		/**
		 * Shows the Download button and replaces the built-in save, for an app
		 * with its own save picker or confirmation. While its promise is
		 * pending, another press does nothing. Errors are the app's to catch.
		 */
		ondownload?: () => void | Promise<void>;
		/** The close button's accessible name. */
		closeLabel?: string;
		/** The Download button's label. */
		downloadLabel?: string;
		/** The spinner's label while the image loads. */
		loadingLabel?: string;
		/** The viewer element. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { duration, fade } from '../motion/index.js';
	import Button from './Button.svelte';
	import Spinner from './Spinner.svelte';
	import { mountOnFirstOpen } from './internal/first-open.svelte.js';
	import { swipeDismiss } from './internal/swipe-dismiss.js';

	/** The largest scale, of the size that fits the screen. */
	const MAX_SCALE = 6;
	/** How far a pinch may shrink the image before it lets go. */
	const PINCH_MIN = 0.5;
	/** A pinch released below this settles to scale 1, so the image never rests a few pixels too large. */
	const SNAP = 1.05;
	/** The scale a double-tap or double-click zooms to. */
	const DOUBLE_SCALE = 2.5;
	/** One key press of + or - multiplies or divides the scale by this. */
	const KEY_STEP = 1.5;
	/** One arrow key press pans this share of the stage. */
	const KEY_PAN = 1 / 8;
	/** Travel before a press counts as a drag (px): touch and pen, then mouse. */
	const SLOP = { touch: 8, mouse: 4 };
	/** A second tap within this time (ms) and distance (px) is a double-tap. */
	const DOUBLE_TIME = { touch: 300, mouse: 500 };
	const DOUBLE_DISTANCE = { touch: 40, mouse: 8 };
	/** A blob: URL made for a download is revoked after this (ms); a browser may read it after click() returns. */
	const REVOKE_AFTER = 60_000;

	const uid = $props.id();

	let {
		open = $bindable(false),
		src,
		alt,
		title,
		trigger,
		downloadName,
		ondownload,
		closeLabel = 'Close',
		downloadLabel = 'Download',
		loadingLabel = 'Loading image',
		ref = $bindable(null),
		onOpenAutoFocus,
		class: className,
		...rest
	}: ImageViewerProps = $props();

	const titleId = `${uid}-title`;
	const downloadable = $derived(ondownload !== undefined || downloadName !== undefined);

	// loading: the image has not arrived; a spinner shows after its delay.
	// loaded: decoded and on screen. error: it failed; the alt shows instead.
	let phase = $state<'loading' | 'loaded' | 'error'>('loading');

	// The view: the image's scale of its fitted size, and its offset from
	// the stage's centre in px. transform: translate(x, y) scale(scale),
	// about the image's centre.
	let scale = $state(1);
	let x = $state(0);
	let y = $state(0);
	// A pan or a pinch in progress, for the cursor and for apps.
	let gesture = $state<'pan' | 'pinch' | null>(null);
	const atRest = $derived(scale === 1);

	let stage = $state<HTMLElement | null>(null);
	let image = $state<HTMLImageElement | null>(null);

	type Kind = 'touch' | 'mouse';
	type Press = { id: number; kind: Kind; x0: number; y0: number; tx0: number; ty0: number; moved: boolean };
	type Pinch = { d0: number; s0: number; qx: number; qy: number };

	// Pointers on the stage by id, at their last position.
	const pointers = new Map<number, { x: number; y: number; kind: Kind }>();
	// One pointer down: a tap, a pan, or a swipe's drag.
	let press: Press | null = null;
	// Two pointers down: the scale and the image point under their midpoint
	// when the pinch began.
	let pinch: Pinch | null = null;
	// The last tap, for a double-tap.
	let lastTap: { t: number; x: number; y: number; kind: Kind } | null = null;
	// The animation of a double-tap zoom or a settle back to 1.
	let settle: Animation | null = null;
	// A pending ondownload.
	let saving = false;

	function resetView() {
		settle?.cancel();
		settle = null;
		scale = 1;
		x = 0;
		y = 0;
		gesture = null;
		pointers.clear();
		press = null;
		pinch = null;
		lastTap = null;
	}

	// Every open, and every new src, starts at scale 1 with a new load.
	$effect.pre(() => {
		if (!open) return;
		void src;
		untrack(() => {
			resetView();
			phase = 'loading';
		});
	});

	// Bits UI's portal and content mount on the first open, so a closed
	// viewer costs only its trigger.
	const layers = mountOnFirstOpen(() => open);

	function close() {
		open = false;
	}

	// Focus starts on the close button (Bits UI would pick the first
	// control, which is Download when there is one). An app's own
	// onOpenAutoFocus may take over by calling preventDefault().
	function openAutoFocus(e: Event) {
		onOpenAutoFocus?.(e);
		if (e.defaultPrevented) return;
		e.preventDefault();
		const closeButton = () => ref?.querySelector<HTMLElement>('.hp-image-viewer-close');
		const now = closeButton();
		if (now) now.focus({ preventScroll: true });
		else requestAnimationFrame(() => closeButton()?.focus({ preventScroll: true }));
	}

	// ---- Loading -----------------------------------------------------------

	// One <img> per src (see the {#key} below), so this runs once per load.
	// The image shows once it is decoded, so its first frame is never blank.
	function watch(img: HTMLImageElement) {
		return untrack(() => {
			let alive = true;
			const done = () => {
				if (alive) phase = 'loaded';
			};
			const fail = () => {
				if (alive && phase === 'loading') phase = 'error';
			};
			const onload = () => {
				img.decode().then(done, () => (img.naturalWidth > 0 ? done() : fail()));
			};
			if (img.complete) {
				// Cached: at once. A complete image without a size is broken,
				// unless it is an SVG without one.
				if (img.naturalWidth > 0) phase = 'loaded';
				else img.decode().then(done, fail);
			}
			img.addEventListener('load', onload);
			img.addEventListener('error', fail);
			return () => {
				alive = false;
				img.removeEventListener('load', onload);
				img.removeEventListener('error', fail);
			};
		});
	}

	// ---- Geometry ------------------------------------------------------------

	const transform = (s: number, tx: number, ty: number) => `translate(${tx}px, ${ty}px) scale(${s})`;

	/** The stage's centre and size, and the image's size at scale 1 (it is centred in the stage). */
	function frame() {
		const r = stage?.getBoundingClientRect();
		return {
			cx: r ? r.left + r.width / 2 : 0,
			cy: r ? r.top + r.height / 2 : 0,
			sw: r?.width ?? 0,
			sh: r?.height ?? 0,
			w: image?.offsetWidth ?? 0,
			h: image?.offsetHeight ?? 0
		};
	}
	type Frame = ReturnType<typeof frame>;

	/**
	 * The offset held so the image leaves no gap at an edge it can fill:
	 * along an axis where it is larger than the stage its edges stay at or
	 * past the stage's; along one where it is not, it stays centred.
	 */
	function hold(s: number, tx: number, ty: number, f: Frame): [number, number] {
		const mx = Math.max(0, (s * f.w - f.sw) / 2);
		const my = Math.max(0, (s * f.h - f.sh) / 2);
		return [Math.min(mx, Math.max(-mx, tx)), Math.min(my, Math.max(-my, ty))];
	}

	/** The view at scale `s` that keeps the image point under (px, py) where it is. */
	function about(s: number, px: number, py: number, f = frame()): [number, number, number] {
		const k = s / scale;
		return [s, ...hold(s, px - f.cx - k * (px - f.cx - x), py - f.cy - k * (py - f.cy - y), f)];
	}

	function onImage(px: number, py: number) {
		if (phase !== 'loaded' || !image) return false;
		const r = image.getBoundingClientRect();
		return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
	}

	// ---- Motion ------------------------------------------------------------

	/** Ends a double-tap zoom or a settle where it is on screen, so a new gesture starts from there. */
	function stop() {
		if (!settle) return;
		if (image && settle.playState === 'running') {
			const m = new DOMMatrixReadOnly(getComputedStyle(image).transform);
			scale = m.a;
			x = m.e;
			y = m.f;
		}
		settle.cancel();
		settle = null;
	}

	/** Pinch, pan, wheel and keys: the view follows at once. */
	function place([s, tx, ty]: [number, number, number]) {
		stop();
		scale = s;
		x = tx;
		y = ty;
	}

	/**
	 * A double-tap zoom and the settle back to 1: the transform moves over
	 * --dur-pop on --settle, both read from the image. Reduced motion jumps.
	 */
	function animate([s, tx, ty]: [number, number, number]) {
		stop();
		const from = transform(scale, x, y);
		scale = s;
		x = tx;
		y = ty;
		const to = transform(s, tx, ty);
		if (!image || from === to || prefersReducedMotion.current) return;
		const ms = duration(image, '--dur-pop');
		if (ms <= 0) return;
		const curve = getComputedStyle(image).getPropertyValue('--settle').trim();
		const run = image.animate([{ transform: from }, { transform: to }], {
			duration: ms,
			easing: CSS.supports('transition-timing-function', curve) ? curve : 'ease-out'
		});
		settle = run;
		run.onfinish = () => {
			if (settle === run) settle = null;
		};
	}

	/** The view at rest: scale 1, centred. */
	const REST: [number, number, number] = [1, 0, 0];

	function toggle(px: number, py: number) {
		animate(scale > 1 ? REST : about(DOUBLE_SCALE, px, py));
	}

	// ---- Pointers ----------------------------------------------------------

	const kindOf = (e: PointerEvent): Kind => (e.pointerType === 'mouse' ? 'mouse' : 'touch');

	function startPinch() {
		const [a, b] = pointers.values();
		const f = frame();
		const mx = (a.x + b.x) / 2;
		const my = (a.y + b.y) / 2;
		pinch = {
			d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
			s0: scale,
			qx: (mx - f.cx - x) / scale,
			qy: (my - f.cy - y) / scale
		};
		gesture = 'pinch';
	}

	function movePinch() {
		if (!pinch) return;
		const [a, b] = pointers.values();
		const f = frame();
		const mx = (a.x + b.x) / 2;
		const my = (a.y + b.y) / 2;
		const s = Math.min(MAX_SCALE, Math.max(PINCH_MIN, (pinch.s0 * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d0));
		place([s, ...hold(s, mx - f.cx - s * pinch.qx, my - f.cy - s * pinch.qy, f)]);
	}

	function down(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		// Focus stays where it is, as on a scrim.
		e.preventDefault();
		stop();
		const kind = kindOf(e);
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, kind });
		stage?.setPointerCapture(e.pointerId);
		if (pointers.size === 1) {
			press = { id: e.pointerId, kind, x0: e.clientX, y0: e.clientY, tx0: x, ty0: y, moved: false };
		} else {
			// A second finger: never a tap, and a pinch once the image is there.
			if (press) press.moved = true;
			if (pointers.size === 2 && phase === 'loaded') startPinch();
		}
	}

	function move(e: PointerEvent) {
		const p = pointers.get(e.pointerId);
		if (!p) return;
		p.x = e.clientX;
		p.y = e.clientY;
		if (pinch) {
			movePinch();
			return;
		}
		if (!press || press.id !== e.pointerId) return;
		const dx = e.clientX - press.x0;
		const dy = e.clientY - press.y0;
		if (!press.moved && Math.hypot(dx, dy) > SLOP[press.kind]) {
			press.moved = true;
			// Zoomed: the image follows the pointer. At scale 1 a drag is the
			// swipe's, or nothing.
			if (scale > 1 && phase === 'loaded') gesture = 'pan';
		}
		if (gesture === 'pan') {
			const f = frame();
			place([scale, ...hold(scale, press.tx0 + dx, press.ty0 + dy, f)]);
		}
	}

	function up(e: PointerEvent) {
		if (!pointers.delete(e.pointerId)) return;
		if (pinch) {
			if (pointers.size >= 2) {
				// A third finger lifted, or one of the two: pinch on with the two left.
				startPinch();
				return;
			}
			pinch = null;
			gesture = null;
			if (scale < SNAP) animate(REST);
			// The finger left over pans from here, if the image is still zoomed.
			const left = [...pointers.entries()][0];
			press = left
				? { id: left[0], kind: left[1].kind, x0: left[1].x, y0: left[1].y, tx0: x, ty0: y, moved: true }
				: null;
			if (press && scale > 1) gesture = 'pan';
			return;
		}
		if (!press || press.id !== e.pointerId) return;
		const done = press;
		press = null;
		gesture = null;
		if (!done.moved && e.type === 'pointerup') tap(done, e);
	}

	// A tap: the second of a double-tap toggles the zoom about the pressed
	// point; a single one on the backdrop, outside the image, closes at
	// scale 1. A tap on the image waits for its second.
	function tap(start: Press, e: PointerEvent) {
		const t = e.timeStamp;
		const last = lastTap;
		if (
			last &&
			last.kind === start.kind &&
			t - last.t < DOUBLE_TIME[start.kind] &&
			Math.hypot(start.x0 - last.x, start.y0 - last.y) < DOUBLE_DISTANCE[start.kind]
		) {
			lastTap = null;
			if (phase === 'loaded') toggle(start.x0, start.y0);
			return;
		}
		lastTap = { t, x: start.x0, y: start.y0, kind: start.kind };
		if (scale === 1 && !onImage(start.x0, start.y0)) close();
	}

	// The wheel zooms about the cursor; a trackpad pinch arrives as a wheel
	// with ctrlKey and smaller steps.
	function wheel(e: WheelEvent) {
		e.preventDefault();
		if (phase !== 'loaded' || pinch) return;
		stop();
		const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? (stage?.clientHeight ?? 800) : 1;
		const rate = e.ctrlKey ? 0.01 : 0.002;
		const s = Math.min(MAX_SCALE, Math.max(1, scale * Math.exp(-e.deltaY * unit * rate)));
		place(about(s, e.clientX, e.clientY));
	}

	function gestures(node: HTMLElement) {
		const capture = { capture: true };
		// Capture, so a swipe that stops a drag's pointerup at the stage
		// cannot hide it from here.
		node.addEventListener('pointerdown', down, capture);
		node.addEventListener('pointermove', move, capture);
		node.addEventListener('pointerup', up, capture);
		node.addEventListener('pointercancel', up, capture);
		node.addEventListener('wheel', wheel, { passive: false });
		return () => {
			node.removeEventListener('pointerdown', down, capture);
			node.removeEventListener('pointermove', move, capture);
			node.removeEventListener('pointerup', up, capture);
			node.removeEventListener('pointercancel', up, capture);
			node.removeEventListener('wheel', wheel);
		};
	}

	// ---- Keys --------------------------------------------------------------

	/** Each arrow key's pan, as a share of the stage: it shows more of that side, so the image moves the other way. */
	const ARROWS: Record<string, [number, number]> = {
		ArrowLeft: [KEY_PAN, 0],
		ArrowRight: [-KEY_PAN, 0],
		ArrowUp: [0, KEY_PAN],
		ArrowDown: [0, -KEY_PAN]
	};

	// + or = zooms in, - zooms out, 0 goes back to 1, about the stage's
	// centre; arrow keys pan while zoomed. Each press jumps: no motion
	// repeats on a key press. Keys with Ctrl, Alt or Meta stay the browser's.
	function key(e: KeyboardEvent) {
		if (e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented || phase !== 'loaded') return;
		const arrow = ARROWS[e.key];
		if (arrow ? scale <= 1 : !['+', '=', '-', '0'].includes(e.key)) return;
		e.preventDefault();
		stop();
		const f = frame();
		if (arrow) place([scale, ...hold(scale, x + arrow[0] * f.sw, y + arrow[1] * f.sh, f)]);
		else if (e.key === '0') place(REST);
		else if (e.key === '-') place(about(Math.max(1, scale / KEY_STEP), f.cx, f.cy, f));
		else place(about(Math.min(MAX_SCALE, scale * KEY_STEP), f.cx, f.cy, f));
	}

	function keys(node: HTMLElement) {
		node.addEventListener('keydown', key);
		return () => node.removeEventListener('keydown', key);
	}

	// ---- Download ----------------------------------------------------------

	/** A `data:` URL's bytes as a Blob, decoded here, so no fetch() meets a Content Security Policy. */
	function dataBlob(url: string): Blob {
		const comma = url.indexOf(',');
		const head = url.slice(5, comma);
		const raw = url.slice(comma + 1);
		const body = raw.includes('%') ? decodeURIComponent(raw) : raw;
		const base64 = /;base64$/i.test(head);
		const type = (base64 ? head.slice(0, -7) : head) || 'text/plain';
		if (!base64) return new Blob([body], { type });
		const text = atob(body);
		const bytes = new Uint8Array(text.length);
		for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
		return new Blob([bytes], { type });
	}

	// A link with `download` saves the file under its name. It opens in a
	// new tab, so an image from another origin, whose `download` the browser
	// ignores, never replaces the app.
	function save(name: string) {
		const made = /^data:/i.test(src) ? URL.createObjectURL(dataBlob(src)) : null;
		const link = document.createElement('a');
		link.href = made ?? src;
		link.download = name;
		link.target = '_blank';
		link.rel = 'noopener';
		(ref ?? document.body).append(link);
		link.click();
		link.remove();
		if (made) setTimeout(() => URL.revokeObjectURL(made), REVOKE_AFTER);
	}

	async function download() {
		if (!ondownload) {
			if (downloadName !== undefined) save(downloadName);
			return;
		}
		if (saving) return;
		saving = true;
		try {
			await ondownload();
		} finally {
			saving = false;
		}
	}
</script>

<!--
	One image over everything, to look at closely: a top bar with the
	`title`, Download and Close, and the image fitted inside the rest of the
	screen at scale 1, centred. Full screen at every width, on
	--layer-dialog, filled with --canvas. Bits UI Dialog traps focus, locks
	the page's scroll, closes on Escape and gives focus back to the opener;
	focus starts on Close.

	Zoom (1 to 6 times the fitted size): a pinch about the fingers'
	midpoint, a double-tap or double-click (1 and 2.5 about the pressed
	point), the wheel about the cursor, + = - and 0. While zoomed, one
	pointer or the arrow keys pan, held so the image leaves no gap at an edge
	it can fill. A pinch released below 1, or less than 5 percent above it,
	settles back to 1.

	Closing: Close, Escape, and at scale 1 a swipe down
	(internal/swipe-dismiss.ts) or a press on the backdrop outside the
	image. A drag is never a press. No gesture closes it while zoomed. The
	system back gesture is the app's: push a history entry on open and close
	on popstate (see the docs).

	Motion: the viewer fades in over --dur-sheet and out over
	--dur-sheet-exit. Pinch, pan, wheel and keys follow at once. A
	double-tap zoom and the settle back to 1 move the transform over
	--dur-pop on --settle, read from the image; reduced motion jumps.

	The stage `.hp-image-viewer-stage` carries `data-state` loading |
	loaded | error, `data-zoomed` above scale 1 and `data-gesture` pan |
	pinch. While loading, a Spinner shows after its delay; on an error the
	alt shows as a muted caption and Download stays. Nothing is announced on
	zoom.
-->
<BitsDialog.Root bind:open={() => layers.open, (value) => (open = value)}>
	{#if trigger}
		<BitsDialog.Trigger>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</BitsDialog.Trigger>
	{/if}

	{#if layers.mounted}
		<BitsDialog.Portal>
			<BitsDialog.Content
				forceMount
				bind:ref
				aria-labelledby={title ? titleId : undefined}
				aria-label={title ? undefined : alt}
				onOpenAutoFocus={openAutoFocus}
				{...rest}
			>
				{#snippet child({
					props: { interactOutsideBehavior: _outside, escapeKeydownBehavior: _escape, ...props },
					open: shown
				})}
					{#if shown}
						<div {...props} class={['hp-image-viewer', className]} {@attach keys} transition:fade>
							<div class="hp-image-viewer-bar">
								{#if title}
									<h2 id={titleId} class="hp-image-viewer-title">{title}</h2>
								{/if}
								{#if downloadable}
									<Button class="hp-image-viewer-download" onclick={download}>{downloadLabel}</Button>
								{/if}
								<Button
									variant="tertiary"
									icon
									class="hp-image-viewer-close"
									aria-label={closeLabel}
									onclick={close}
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
							</div>
							<div
								class="hp-image-viewer-stage"
								data-state={phase}
								data-zoomed={scale > 1 ? '' : undefined}
								data-gesture={gesture ?? undefined}
								bind:this={stage}
								{@attach gestures}
								{@attach atRest ? swipeDismiss(close) : undefined}
							>
								{#key src}
									<img
										class="hp-image-viewer-image"
										{src}
										{alt}
										draggable="false"
										style:transform={transform(scale, x, y)}
										bind:this={image}
										{@attach watch}
									/>
								{/key}
								{#if phase === 'loading'}
									<div class="hp-image-viewer-spinner"><Spinner label={loadingLabel} /></div>
								{:else if phase === 'error' && alt}
									<span class="hp-image-viewer-caption hp-caption" aria-hidden="true">{alt}</span>
								{/if}
							</div>
						</div>
					{/if}
				{/snippet}
			</BitsDialog.Content>
		</BitsDialog.Portal>
	{/if}
</BitsDialog.Root>

<style>
	/* The whole screen in --canvas, so it follows the theme. The side and
	   bottom safe areas keep the stage clear of the screen's cut-outs; the
	   bar adds the top one. Bits UI may have turned pointer events off on
	   <body>. */
	.hp-image-viewer {
		position: fixed;
		inset: 0;
		z-index: var(--layer-dialog);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
		background: var(--canvas);
		color: var(--text);
		overscroll-behavior: contain;
		pointer-events: auto;
	}

	/* The shell header's height under the top safe area: the title takes
	   what the buttons leave and ends in an ellipsis; without a title the
	   buttons keep the end. Download and Close keep their size, 8px apart,
	   with Close 8px from the edge, so its focus contour (4px out, 2px wide)
	   stays on screen. */
	.hp-image-viewer-bar {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
		box-sizing: border-box;
		min-height: calc(var(--header-height) + env(safe-area-inset-top));
		padding: env(safe-area-inset-top) var(--space-2) 0 var(--gutter);
	}
	.hp-image-viewer-bar > :global(.hp-button) {
		flex: none;
	}
	.hp-image-viewer-title {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		font-size: var(--type-body);
		line-height: 24px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The rest of the screen. Every touch is the viewer's: no browser pan,
	   zoom or overscroll. The image never shows outside it, so the bar stays
	   clear. */
	.hp-image-viewer-stage {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		overflow: hidden;
		overscroll-behavior: contain;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.hp-image-viewer-stage[data-zoomed] {
		cursor: grab;
	}
	.hp-image-viewer-stage[data-gesture] {
		cursor: grabbing;
	}

	/* Fitted inside the stage at its own size or smaller, centred. Hidden by
	   opacity only while it loads or after an error, so it stays in the
	   accessibility tree and no broken-image glyph shows. */
	.hp-image-viewer-image {
		position: absolute;
		inset: 0;
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		margin: auto;
		transform-origin: 50% 50%;
		-webkit-user-drag: none;
	}
	.hp-image-viewer-stage[data-state='loading'] > .hp-image-viewer-image,
	.hp-image-viewer-stage[data-state='error'] > .hp-image-viewer-image {
		opacity: 0;
	}

	/* The spinner in the middle, on whole pixels (Spinner: never centre
	   pixel text in odd free space). Browsers without round() centre it. */
	.hp-image-viewer-spinner {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		top: round(down, 50%, 1px);
		left: round(down, 50%, 1px);
		translate: round(down, -50%, 1px) round(down, -50%, 1px);
		pointer-events: none;
	}

	/* The alt of an image that failed, as MediaImage shows it. */
	.hp-image-viewer-caption {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: var(--space-8);
		overflow: hidden;
		color: var(--muted);
		text-align: center;
		pointer-events: none;
	}
</style>
