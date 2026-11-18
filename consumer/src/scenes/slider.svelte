<script lang="ts">
	import { Slider, TextField } from '@mystravil/hardpoint';
	let opacity = $state(60);
	let changes = $state(0);
	let commits = $state(0);
	let threshold = $state(0.4);
	let level = $state(3);
	let locked = $state(20);
	let score = $state(0.6);
	let count = $state('3');
	let zoom = $state(100);
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
	<div class="toolbar-row">
		<Slider label="Min score" min={0} max={1} step={0.05} format={(n) => n.toFixed(2)} labelBeside bind:value={score} />
		<TextField label="Min count" type="number" labelBeside bind:value={count} />
	</div>
	<Slider label="Zoom" min={50} max={200} step={10} format={(n) => `${n}%`} labelHidden bind:value={zoom} />
</main>
