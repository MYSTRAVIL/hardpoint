<script>
	import { Meter, Button } from '@mystravil/hardpoint';
	let used = $state(30);
</script>

<main class="page">
	<Meter label="Storage used" value={used} max={100} warnAt={60} dangerAt={85} valueText="{used} of 100 GB" detail="Plan resets monthly" />
	<Button onclick={() => (used += 30)}>Add 30</Button>
	<Button onclick={() => (used = 30)}>Reset</Button>
	<Meter label="Marker" value={34} max={50} marker={40} valueText="34 of 50" />
	<Meter label="Segments" value={5} max={8} segments={8} warnAt={5} valueText="5 of 8" />
	<Meter label="Forced ok" value={95} tone="ok" warnAt={60} dangerAt={85} />
	<Meter label="Warn" value={70} warnAt={60} dangerAt={85} />
	<Meter label="Danger" value={90} warnAt={60} dangerAt={85} />
</main>
