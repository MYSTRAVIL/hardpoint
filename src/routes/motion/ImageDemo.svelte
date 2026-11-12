<!--
	A /motion demo: the docs photo in a MediaImage in a MediaFrame (3:2),
	loaded on demand, so a page can show how an image takes over from its
	skeleton block. The page puts each demo in the tier it shows.

	The photo is local and would load at once, so each load holds it back to
	act like a network: `src` is undefined while it waits, and after the time
	on the button (or later, if the fetch takes longer) it becomes a fresh
	object URL of the photo (staircase.ts). MediaImage does the rest. It
	starts with the bundled file, which is there before hydration, so it
	shows at once. A visually hidden status line before the frame says when
	a load starts and when the photo has loaded, outside the frame.

	The page lays the demos out on a grid: the root spans four rows of it
	(heading, note, buttons, frame) as a subgrid, so frames side by side
	line up. `load(ms)` starts a load from outside, for a "Load both".
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import MediaFrame from '#lib/components/MediaFrame.svelte';
	import MediaImage from '#lib/components/MediaImage.svelte';
	import { delayedPhoto, staircase } from '../staircase';

	let {
		name,
		title,
		children
	}: {
		/** Names the photo in the status line: "Loading the {name} photo". */
		name: string;
		title: string;
		/** The note under the title. */
		children: Snippet;
	} = $props();

	const id = $props.id();

	let src = $state<string | undefined>(staircase.src);
	let status = $state('');
	let request: AbortController | undefined;
	let objectUrl: string | undefined;

	function stop() {
		request?.abort();
		request = undefined;
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = undefined;
	}

	/** Loads the photo again; it arrives after `ms`, or later if the fetch takes longer. */
	export function load(ms: number) {
		stop();
		const controller = (request = new AbortController());
		src = undefined;
		status = `Loading the ${name} photo`;
		delayedPhoto(ms, controller.signal).then(
			(url) => {
				request = undefined;
				objectUrl = src = url;
			},
			() => {
				if (controller.signal.aborted) return;
				request = undefined;
				status = `The ${name} photo did not load`;
			}
		);
	}

	$effect(() => stop);
</script>

<div class="image-demo" role="group" aria-labelledby="{id}-title">
	<h3 class="sub" id="{id}-title">{title}</h3>
	<div class="hp-dense note">{@render children()}</div>
	<div class="buttons">
		<Button onclick={() => load(1200)}>Load in 1.2s</Button>
		<Button onclick={() => load(150)}>Load in 150ms</Button>
	</div>
	<div>
		<p class="hp-visually-hidden" role="status">{status}</p>
		<MediaFrame ratio="3 / 2">
			<MediaImage
				{src}
				alt={staircase.alt}
				width={staircase.width}
				height={staircase.height}
				onload={() => {
					if (status) status = `The ${name} photo loaded`;
				}}
				onerror={() => (status = `The ${name} photo did not load`)}
			/>
		</MediaFrame>
	</div>
</div>

<style>
	/* Four rows of the page's grid: heading, note, buttons, frame. */
	.image-demo {
		display: grid;
		grid-row: span 4;
		grid-template-rows: subgrid;
		row-gap: var(--space-3);
		min-width: 0;
	}
	.sub {
		font-weight: 500;
	}
	.note {
		color: var(--muted);
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
	}
</style>
