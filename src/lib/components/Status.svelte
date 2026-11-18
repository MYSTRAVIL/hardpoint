<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** A status hue: `ok` done or online, `warn` waiting or needs you, `danger` failed. */
	export type StatusTone = 'ok' | 'warn' | 'danger';

	export type StatusProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		/**
		 * Colours the mark in a status hue. Only where the value means that
		 * status. Without it the mark is untoned, in `--muted`: an
		 * informational or idle state gets no hue, and the label carries the
		 * meaning.
		 */
		tone?: StatusTone;
		/**
		 * Work in progress: the mark pulses slowly. The pulse holds still under
		 * reduced motion and while the app sets `<Motion paused>`. An app that
		 * shows a live Status also offers a visible control that sets it.
		 */
		live?: boolean;
		/** The label. It says the status in words; the mark never does. */
		children: Snippet;
		/** The root `span`. */
		ref?: HTMLSpanElement | null;
	};
</script>

<script lang="ts">
	import { useMotion } from '../motion/context.js';

	let { tone, live = false, ref = $bindable(null), class: className, children, ...rest }: StatusProps = $props();

	const motion = useMotion();
</script>

<!--
	An inline status: a square mark and a label, for lists and lines of text
	outside tables (a table colours its own marks through Column `mark`, and
	this mark matches that one). The mark is an 8px square in the tone's hue,
	or in --muted without a tone, centred on the label's first line. It is
	decorative and hidden from assistive technology: the label carries the
	status, so write it in words ("Online", not just a green square).

	`live` pulses the mark's opacity between 1 and 0.4 over --dur-pulse (2.4s:
	about 0.42 flashes a second). Nothing else moves. The pulse is off under
	prefers-reduced-motion and while the app pauses ongoing motion with
	<Motion paused> (data-paused on the root), so WCAG 2.2.2's pause control
	is the app's own visible control. It is not a live region; pass
	role="status" for a Status that changes text while the user is on the page.
-->
<span
	{...rest}
	bind:this={ref}
	class={['hp-status', className]}
	data-tone={tone}
	data-live={live ? '' : undefined}
	data-paused={live && motion.paused ? '' : undefined}
>
	<span class="mark" aria-hidden="true"></span>
	<span class="label">{@render children()}</span>
</span>

<style>
	/* The mark sits beside the label's lines, not under them, and a long
	   label wraps inside its own column. */
	.hp-status {
		display: inline-flex;
		align-items: flex-start;
		gap: var(--space-2);
		max-width: 100%;
		vertical-align: top;
	}

	/* The same 8px square as a Table's status mark, centred on the first
	   line with 1lh. */
	.mark {
		flex: none;
		width: 8px;
		height: 8px;
		margin-block-start: calc((1lh - 8px) / 2);
		background: var(--muted);
	}
	.label {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	[data-tone='ok'] > .mark {
		background: var(--ok);
	}
	[data-tone='warn'] > .mark {
		background: var(--warn);
	}
	[data-tone='danger'] > .mark {
		background: var(--danger);
	}

	/* A live mark: opacity only, slowly. Off while paused and under reduced
	   motion, where the mark simply stays lit. */
	@media (prefers-reduced-motion: no-preference) {
		[data-live]:not([data-paused]) > .mark {
			animation: pulse var(--dur-pulse) ease-in-out infinite;
		}
	}

	@keyframes pulse {
		50% {
			opacity: 0.4;
		}
	}
</style>
