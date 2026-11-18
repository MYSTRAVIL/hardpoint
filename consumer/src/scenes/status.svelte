<script lang="ts">
	import { Button, Stat, Status } from '@mystravil/hardpoint';
	import { Motion } from '@mystravil/hardpoint/motion';
	let paused = $state(false);
</script>

<main class="page">
	<div id="static">
		<Status tone="ok">Online</Status>
		<Status tone="warn">Behind</Status>
		<Status tone="danger">Down</Status>
		<Status>Idle</Status>
	</div>
	<Motion {paused}>
		<div id="live">
			<Status live tone="ok">Syncing</Status>
			<Status live>Indexing</Status>
		</div>
		<Motion tier="expressive">
			<div id="nested"><Status live tone="warn">Waiting</Status></div>
		</Motion>
	</Motion>
	<!-- A Stat whose value is markup: a Status in the value's place. -->
	<div id="stats">
		<Stat label="Sync allowed" unit="jobs" delta={2} deltaNote="since noon"><Status tone="ok">Yes</Status></Stat>
		<Stat label="Deploy window" variant="display"><Status>Open</Status></Stat>
		<Stat label="Open tasks" value={18} variant="display" />
	</div>
	<Button onclick={() => (paused = !paused)}>{paused ? 'Resume' : 'Pause'} animations</Button>
</main>
