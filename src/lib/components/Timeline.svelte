<script lang="ts" module>
	import type { HTMLOlAttributes } from 'svelte/elements';

	/** A status hue for an event's node: `ok` done, `warn` waiting or needs you, `danger` failed. */
	export type TimelineTone = 'ok' | 'warn' | 'danger';

	export type TimelineEvent = {
		/** What happened, as the app or a user wrote it. */
		title: string;
		/** A supporting line in `--muted`. */
		detail?: string;
		/** The date as shown. */
		date: string;
		/** The time as shown, after the date. */
		time?: string;
		/**
		 * The machine-readable moment for `<time datetime>`. Defaults to
		 * `date`, or `dateTtime` with a time, so ISO dates need nothing else.
		 */
		datetime?: string;
		/**
		 * Colours the node in a status hue. The title must say the same, because
		 * colour is never the only signal.
		 */
		tone?: TimelineTone;
	};

	export type TimelineProps = Omit<HTMLOlAttributes, 'children'> & {
		/** Oldest first or newest first, in the order given. */
		events: TimelineEvent[];
	};
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { useMotion } from '../motion/index.js';

	let { events, class: className, ...rest }: TimelineProps = $props();

	// Expressive stagger (motion rule 7), as in Table: only the events of the
	// first render enter, by their index. Each <li> carries its node and its
	// rail segment, so they enter with it. Any change to `events` (a new array
	// or a changed length) ends the entrance, and so does its last animation.
	const motion = useMotion();
	const firstEvents = untrack(() => events);
	const firstCount = untrack(() => events.length);
	let entering = $state.raw(motion.expressive);
	let root: HTMLOListElement;

	$effect.pre(() => {
		if (events !== firstEvents || events.length !== firstCount) entering = false;
	});

	onMount(() => {
		if (!entering) return;
		const running = root
			.getAnimations({ subtree: true })
			.filter((a) => a instanceof CSSAnimation && a.animationName === 'hp-enter');
		Promise.allSettled(running.map((a) => a.finished)).then(() => {
			entering = false;
		});
	});
</script>

<!--
	Square nodes on a 2px titanium rail (BRIEF, visual rule 7; da3-60), in
	Geist Mono. Extra attributes and `class` go to the <ol>.
-->
<ol {...rest} bind:this={root} class={['hp-timeline', className]}>
	{#each events as event, i}
		<li data-tone={event.tone} class={[entering && 'hp-enter']} style:--i={entering ? i : undefined}>
			<span>{event.title}</span>
			{#if event.detail}
				<span class="detail">{event.detail}</span>
			{/if}
			<span class="when"
				><time datetime={event.datetime ?? (event.time ? `${event.date}T${event.time}` : event.date)}
					>{event.date}</time
				>{#if event.time}<span>{event.time}</span>{/if}</span
			>
		</li>
	{/each}
</ol>

<style>
	/* 16px on touch, the dense 14px on fine pointers. A long identifier or
	   path breaks anywhere rather than widen the page. */
	.hp-timeline {
		margin: 0;
		padding: 0 0 0 var(--space-8);
		font-family: var(--mono);
		font-size: var(--type-body);
		line-height: 24px;
		list-style: none;
		overflow-wrap: anywhere;
	}
	@media (pointer: fine) {
		.hp-timeline {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	li {
		position: relative;
		display: grid;
		padding-bottom: var(--space-6);
	}
	li:last-child {
		padding-bottom: 0;
	}

	/* The node: a 12px square, titanium or the event's status hue, centred on
	   the first line (4px from the top at 20px lines, 6px at 24px). */
	li::before {
		content: '';
		position: absolute;
		top: calc((1lh - 12px) / 2);
		left: calc(-1 * var(--space-8));
		width: 12px;
		height: 12px;
		background: var(--accent);
	}
	li[data-tone='ok']::before {
		background: var(--ok);
	}
	li[data-tone='warn']::before {
		background: var(--warn);
	}
	li[data-tone='danger']::before {
		background: var(--danger);
	}

	/* The rail: 2px, centred under the node, from its bottom edge down to the
	   next node's top edge. */
	li:not(:last-child)::after {
		content: '';
		position: absolute;
		top: calc((1lh + 12px) / 2);
		bottom: calc((12px - 1lh) / 2);
		/* matches the approved specimen */
		left: calc(-1 * var(--space-8) + 5px);
		/* matches the approved specimen */
		width: 2px;
		background: var(--accent);
	}

	.detail {
		color: var(--muted);
	}
	.when {
		display: flex;
		/* matches the approved specimen */
		gap: 4ch;
	}
</style>
