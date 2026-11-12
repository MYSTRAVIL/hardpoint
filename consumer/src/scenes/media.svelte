<script>
	import { Motion } from '@mystravil/hardpoint/motion';
	import { MediaFrame, MediaImage, Stat, LoadRegion, Skeleton, Button } from '@mystravil/hardpoint';
	let value = $state(120);
	let loading = $state(true);
</script>

<main class="page">
	<div class="row">
		<Motion tier="expressive">
			<div class="photo"><MediaFrame ratio="4 / 3"><MediaImage src="/staircase.jpg" alt="Expressive staircase" /></MediaFrame></div>
		</Motion>
		<Motion tier="quiet">
			<div class="photo"><MediaFrame ratio="4 / 3"><MediaImage src="/staircase.jpg?q" alt="Quiet staircase" /></MediaFrame></div>
		</Motion>
	</div>
	<Stat label="Total" {value} unit="MB" delta={4} tone="ok" />
	<Stat label="Display" {value} variant="display" />
	<Button onclick={() => (value += 37)}>Tick</Button>
	<Button onclick={() => (loading = !loading)}>Load</Button>
	<LoadRegion {loading} status="Loading items">
		{#snippet placeholder()}<Skeleton lines={3} /><Skeleton variant="block" height="64px" />{/snippet}
		<p>Content arrived.</p>
		<p>More content.</p>
	</LoadRegion>
</main>
