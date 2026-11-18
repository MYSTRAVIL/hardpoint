<script lang="ts">
	import { Slider } from '@mystravil/hardpoint';
	let opacity = $state(60);
	let changes = $state(0);
	let commits = $state(0);
	let threshold = $state(0.4);
	let level = $state(3);
	let locked = $state(20);
</script>

<main class="page">
	<p id="slider-state">opacity={opacity} changes={changes} commits={commits} threshold={threshold} level={level} locked={locked}</p>
	<Slider
		label="Opacity"
		hint="How much of the image shows."
		format={(n) => `${n}%`}
		bind:value={opacity}
		onValueChange={() => changes++}
		onValueCommit={() => commits++}
	/>
	<Slider label="Match threshold" min={0} max={1} step={0.05} format={(n) => n.toFixed(2)} bind:value={threshold} />
	<Slider label="Quality" min={1} max={10} valueText={(n) => `Level ${n} of 10`} bind:value={level} />
	<Slider label="Locked" disabled format={(n) => `${n}%`} bind:value={locked} />
</main>
