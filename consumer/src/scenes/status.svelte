<script lang="ts">
	import { Button, Status } from '@mystravil/hardpoint';
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
	<Button onclick={() => (paused = !paused)}>{paused ? 'Resume' : 'Pause'} animations</Button>
</main>
