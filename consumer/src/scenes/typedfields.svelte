<script lang="ts">
	import { Button, TextField } from '@mystravil/hardpoint';
	let seats = $state('12');
	let weight = $state('');
	let offset = $state('');
	let day = $state('');
	let at = $state('');
	let until = $state('');
	let heard = $state(0);
	let inForm = $state('');
</script>

<main class="page">
	<p id="typed-state">seats=[{seats}] weight=[{weight}] offset=[{offset}] day=[{day}] at=[{at}] until=[{until}] heard={heard}</p>
	<TextField label="Plain" value="text" />
	<TextField label="Seats" type="number" min="1" max="500" bind:value={seats} oninput={() => heard++} />
	<TextField label="Weight" type="number" min="0" step="0.5" bind:value={weight} />
	<TextField label="Offset" type="number" bind:value={offset} />
	<TextField label="Forced mode" type="number" min="0" inputmode="text" />
	<TextField label="Day" type="date" min="2026-01-01" max="2026-12-31" bind:value={day} />
	<TextField label="At" type="time" step="900" bind:value={at} />
	<TextField label="Until" type="datetime-local" bind:value={until} error="Pick a later time." />
	<form>
		<TextField label="In a form" type="number" bind:value={inForm} />
		<button type="reset">Reset form</button>
		<span id="form-state">inForm=[{inForm}]</span>
	</form>
	<TextField label="Locked day" type="date" value="2026-11-18" disabled />
	<div class="row">
		<Button onclick={() => (seats = '42')}>Set seats</Button>
		<Button onclick={() => (weight = '')}>Clear weight</Button>
	</div>
</main>
