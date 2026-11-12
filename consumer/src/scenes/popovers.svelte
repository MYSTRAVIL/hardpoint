<script>
	import { Button, Popover, CheckboxGroup } from '@mystravil/hardpoint';
	const items = [
		{ value: 'open', label: 'Open' },
		{ value: 'done', label: 'Done', hint: 'Hidden from the board.' }
	];
	let value = $state(['open']);
	let more = $state(false);
</script>

<main class="page">
	<div class="row">
		<!-- Default width. Popover form from 600px, sheet below. -->
		<Popover title="Filter">
			{#snippet trigger({ props })}<Button {...props}>Plain popover</Button>{/snippet}
			<CheckboxGroup label="Status" {items} bind:value />
			{#snippet actions({ close })}<Button onclick={close}>Close</Button>{/snippet}
		</Popover>
		<!-- A style prop on the component. -->
		<Popover title="Wide by style" style="--popover-width: 480px">
			{#snippet trigger({ props })}<Button {...props}>Style prop</Button>{/snippet}
			<p id="style-body">A long line of text that needs more room than the default cap gives a popover when it runs on and on and on.</p>
		</Popover>
		<!-- A class with a rule in the app's stylesheet. -->
		<Popover title="Wide by class" class="wide-popover">
			{#snippet trigger({ props })}<Button {...props}>Class</Button>{/snippet}
			<p id="class-body">A long line of text that needs more room than the default cap gives a popover when it runs on and on and on.</p>
		</Popover>
	</div>
	<div class="row">
		<Button onclick={() => (more = true)}>Mount three popovers</Button>
		{#if more}
			{#each [1, 2, 3] as i (i)}
				<Popover title={`Filter ${i}`}>
					{#snippet trigger({ props })}<Button {...props}>Filter {i}</Button>{/snippet}
					<p>Body {i}</p>
					{#snippet actions({ close })}<Button onclick={close}>Done</Button>{/snippet}
				</Popover>
			{/each}
		{/if}
	</div>
</main>
