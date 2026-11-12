<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * `standard` (default): the size for a row of several stats. `display`:
	 * the 32 to 56px display size, for the view's one display subject.
	 */
	export type StatVariant = 'standard' | 'display';

	/** A status hue for the delta: `ok` good, `warn` needs attention, `danger` bad. */
	export type StatTone = 'ok' | 'warn' | 'danger';

	export type StatProps = Omit<HTMLAttributes<HTMLDListElement>, 'children'> & {
		/** The caps label. A fixed string the app defines. */
		label: string;
		/**
		 * The value in Geist with tabular figures. A string is shown as given
		 * and changes at once. A number is shown through `format`; when it
		 * changes after the first render, it ticks from the shown figure to
		 * the new one (BRIEF, motion rule 5).
		 */
		value: string | number;
		/**
		 * Formats a number `value` at rest and at every step of a tick, for
		 * example `(n) => n.toLocaleString('en-US')`. Each step is rounded to
		 * the larger number of decimal places of the old and new value before
		 * it is formatted. Without `format` a number shows as `String(value)`,
		 * and the steps show those decimal places.
		 */
		format?: (value: number) => string;
		/** A unit after the value, smaller and in the muted ink: `EUR`, `ms`, `tasks`. */
		unit?: string;
		/**
		 * The change, in the muted ink. A number gets its sign: `+12`, `−3`
		 * (a true minus), `0`. A string is shown as written, sign included.
		 */
		delta?: string | number;
		/** What the delta compares with, after it: `since last week`. */
		deltaNote?: string;
		/**
		 * Colours the delta in a status hue. Without it the delta stays muted.
		 * The label or `deltaNote` must say the same, because colour is never
		 * the only signal.
		 */
		tone?: StatTone;
		variant?: StatVariant;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { curve, duration, useMotion } from '../motion/index.js';

	let {
		label,
		value,
		format,
		unit,
		delta,
		deltaNote,
		tone,
		variant = 'standard',
		class: className,
		...rest
	}: StatProps = $props();

	const change = $derived(
		typeof delta === 'number'
			? delta > 0
				? `+${delta}`
				: delta < 0
					? `\u2212${-delta}`
					: String(delta)
			: delta
	);

	// ---- Tick (BRIEF, motion rule 5) ---------------------------------------

	// A number value that changes after the first render ticks from the
	// figure on screen to the new one. Quiet motion, so it runs in both tiers.
	// Strings, reduced motion and live regions change at once.
	const LIVE = '[aria-live]:not([aria-live="off"]), [role="status"], [role="log"], [role="alert"]';

	const motion = useMotion();
	let valueEl: HTMLElement | undefined;
	// Starts on the first value, so nothing moves on the first render.
	const tween = new Tween(untrack(() => (typeof value === 'number' ? value : 0)));
	let last = untrack(() => value);
	// The decimal places of the running tick's steps.
	let places = $state(0);
	// The figure on screen when the tick began. A hidden copy keeps its width.
	let from = $state('');

	/** The decimal places of `n` as `String()` writes it, exponent included. */
	function decimals(n: number): number {
		const [digits, exp = '0'] = String(n).split('e');
		return Math.min(100, Math.max(0, (digits.split('.')[1]?.length ?? 0) - Number(exp)));
	}
	const atRest = (n: number) => (format ? format(n) : String(n));
	/** One step: rounded to `p` places, never `-0`, then formatted. */
	function atStep(n: number, p: number): string {
		const r = Number(n.toFixed(p)) || 0;
		return format ? format(r) : r.toFixed(p);
	}

	const text = $derived(typeof value === 'number' ? atRest(value) : value);
	const ticking = $derived(
		typeof value === 'number' && !Number.isNaN(value) && tween.current !== value
	);
	const step = $derived(ticking ? atStep(tween.current, places) : '');

	// Before the DOM updates, so the first frame after a change still shows
	// the old figure. Duration and curve are read from the value element at
	// the change, so a retuned token applies. A change during a tick starts
	// from the step on screen.
	$effect.pre(() => {
		const to = value;
		untrack(() => {
			const was = last;
			last = to;
			if (typeof to !== 'number' || to === was) return;
			const resting = tween.current === tween.target;
			const shown = resting ? tween.current : Number(tween.current.toFixed(places)) || 0;
			const ms =
				valueEl && typeof was === 'number' && !motion.reduced && !valueEl.closest(LIVE)
					? duration(valueEl, '--dur-tick')
					: 0;
			if (!valueEl || ms <= 0 || !Number.isFinite(shown) || !Number.isFinite(to)) {
				void tween.set(to, { duration: 0 });
				return;
			}
			from = resting ? atRest(shown) : atStep(shown, places);
			places = Math.max(decimals(shown), decimals(to));
			// Tween would run the old tick for one more frame before the new
			// one starts; stop it on the step on screen first.
			if (!resting) void tween.set(shown, { duration: 0 });
			void tween.set(to, { duration: ms, easing: curve(valueEl, '--tick') });
		});
	});
</script>

<!--
	A caps label over a key figure in Geist with tabular figures (BRIEF, visual
	rules 3 and 4; da3-65). A number value ticks to a new value over
	`--dur-tick` on the `--tick` curve, never on the first render. The final
	value stays in the accessible text; the moving steps are aria-hidden. The
	root carries `data-ticking` during a tick. Extra attributes and `class` go
	to the <dl>.
-->
<dl
	{...rest}
	class={['hp-stat', className]}
	data-variant={variant}
	data-tone={tone}
	data-ticking={ticking ? '' : undefined}
>
	<dt class="hp-stat-label hp-label">{label}</dt>
	<dd
		bind:this={valueEl}
		class={['hp-stat-value', variant === 'display' ? 'hp-display' : 'hp-page-title hp-num']}
	>
		<span class="hp-stat-figure"
			><span class="hp-stat-final">{text}</span>{#if ticking}<span
					class="hp-stat-from"
					aria-hidden="true">{from}</span
				><span class="hp-stat-step" aria-hidden="true">{step}</span>{/if}</span
		>{#if unit}{' '}<span class="hp-stat-unit">{unit}</span>{/if}
	</dd>
	{#if change !== undefined && change !== ''}
		<dd class="hp-stat-delta">
			<span class="hp-stat-change">{change}</span>{#if deltaNote}{' '}{deltaNote}{/if}
		</dd>
	{/if}
</dl>

<style>
	.hp-stat {
		display: grid;
		align-content: start;
		gap: var(--space-1);
		min-width: 0;
	}
	.hp-stat[data-variant='display'] {
		gap: var(--space-2);
	}

	.hp-stat-label {
		color: var(--muted);
	}

	/* Geist even inside a mono context such as a table cell. The size comes
	   from base.css: .hp-page-title (24px, 20px on compact) with .hp-num, or
	   .hp-display. A long figure breaks rather than widen a phone page. */
	.hp-stat-value {
		font-family: var(--sans);
		overflow-wrap: anywhere;
	}

	/* During a tick the figure stacks three layers in one grid cell: the
	   final value (transparent, read by screen readers), a hidden copy of
	   the figure shown when the tick began, and the moving step. The cell is
	   as wide as the wider of the old and new figure, so the unit after it
	   holds still; the steps lie between the two in value, and with tabular
	   figures in width too. */
	.hp-stat[data-ticking] .hp-stat-figure {
		display: inline-grid;
	}
	.hp-stat[data-ticking] .hp-stat-figure > * {
		grid-area: 1 / 1;
	}
	.hp-stat[data-ticking] .hp-stat-final {
		opacity: 0;
	}
	.hp-stat-from {
		visibility: hidden;
	}

	.hp-stat-unit {
		color: var(--muted);
		font-size: var(--type-body);
		font-weight: 400;
		letter-spacing: 0;
	}
	.hp-stat[data-variant='display'] .hp-stat-unit {
		font-size: var(--type-section);
	}

	/* 16px on touch, the dense 14px on fine pointers. */
	.hp-stat-delta {
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	@media (pointer: fine) {
		.hp-stat-delta {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	.hp-stat[data-tone='ok'] .hp-stat-change {
		color: var(--ok);
	}
	.hp-stat[data-tone='warn'] .hp-stat-change {
		color: var(--warn);
	}
	.hp-stat[data-tone='danger'] .hp-stat-change {
		color: var(--danger);
	}
</style>
