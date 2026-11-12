<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	export type MediaFrameProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/**
		 * The frame's aspect ratio, any CSS `aspect-ratio` value such as
		 * `16 / 9`. Without it the frame takes its content's height, unless an
		 * ancestor sets `--media-frame-ratio` (a page sets that custom property
		 * in its media queries to change the ratio by breakpoint).
		 */
		ratio?: string;
		/** The inner width in px, inside the 1px frame. Bindable, read-only. */
		width?: number;
		/** The inner height in px, inside the 1px frame. Bindable, read-only. */
		height?: number;
		/** The image, diagram or chart. */
		children?: Snippet;
	};
</script>

<script lang="ts">
	let {
		ratio,
		width = $bindable(),
		height = $bindable(),
		class: className,
		children,
		...rest
	}: MediaFrameProps = $props();
</script>

<!--
	A 1px hairline frame with small + registration marks over its corners and
	top centre (BRIEF, visual rule 8; da3-55, da3-61), for images and
	diagrams, never text blocks. The marks paint over the content. Content
	that fills the frame positions itself (absolute, inset 0) and reads
	bind:width and bind:height to draw at the frame's real size.
-->
<div
	{...rest}
	class={['hp-media-frame', className]}
	style:--media-frame-ratio={ratio}
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{@render children?.()}
	<span class="reg top left" aria-hidden="true"></span>
	<span class="reg top mid" aria-hidden="true"></span>
	<span class="reg top right" aria-hidden="true"></span>
	<span class="reg bottom left" aria-hidden="true"></span>
	<span class="reg bottom right" aria-hidden="true"></span>
</div>

<style>
	.hp-media-frame {
		position: relative;
		aspect-ratio: var(--media-frame-ratio, auto);
		border: 1px solid var(--border);
	}

	/* A 13px + whose 1px strokes cross at its centre pixel, 12px in from
	   the frame's inner edge. */
	.reg {
		position: absolute;
		/* matches the approved specimen */
		width: 13px;
		/* matches the approved specimen */
		height: 13px;
		pointer-events: none;
	}
	.top {
		top: 12px;
	}
	.bottom {
		bottom: 12px;
	}
	.left {
		left: 12px;
	}
	.right {
		right: 12px;
	}
	.mid {
		/* matches the approved specimen */
		left: calc(50% - 6px);
	}
	.reg::before,
	.reg::after {
		content: '';
		position: absolute;
		background: var(--text);
	}
	.reg::before {
		/* matches the approved specimen */
		top: 6px;
		left: 0;
		/* matches the approved specimen */
		width: 13px;
		height: 1px;
	}
	.reg::after {
		top: 0;
		/* matches the approved specimen */
		left: 6px;
		width: 1px;
		/* matches the approved specimen */
		height: 13px;
	}
</style>
