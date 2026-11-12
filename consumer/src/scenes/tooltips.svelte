<script>
	import { Button, Tooltip, TooltipGroup } from '@mystravil/hardpoint';
	let more = $state(false);
</script>

<main class="page">
	<div class="row">
		<Tooltip text="Save the file" delayDuration={0}>
			{#snippet trigger({ props })}<Button {...props}>Plain</Button>{/snippet}
		</Tooltip>
		<Tooltip text="A longer tooltip that runs on and on and on and on past the default cap, so that it has to wrap onto lines" class="wide-tooltip" delayDuration={0}>
			{#snippet trigger({ props })}<Button {...props}>Class</Button>{/snippet}
		</Tooltip>
		<Tooltip text="A longer tooltip that runs on and on and on and on past the default cap, so that it has to wrap onto lines" style="--tooltip-width: 360px" delayDuration={0}>
			{#snippet trigger({ props })}<Button {...props}>Style</Button>{/snippet}
		</Tooltip>
		<TooltipGroup>
			<Tooltip text="Group one">{#snippet trigger({ props })}<Button {...props}>G1</Button>{/snippet}</Tooltip>
			<Tooltip text="Group two">
				{#snippet trigger({ props })}<Button {...props}>G2</Button>{/snippet}
			</Tooltip>
		</TooltipGroup>
	</div>
	<div class="row">
		<Button onclick={() => (more = true)}>Mount three tooltips</Button>
		{#if more}
			{#each [1, 2, 3] as i (i)}
				<Tooltip text={`Upload ${i}`} delayDuration={0}>
					{#snippet trigger({ props })}<Button {...props}>T{i}</Button>{/snippet}
				</Tooltip>
			{/each}
		{/if}
	</div>
</main>
