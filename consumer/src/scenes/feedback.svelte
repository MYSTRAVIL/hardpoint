<script>
	import { Progress, Skeleton, Spinner, EmptyState, ErrorState, Button } from '@mystravil/hardpoint';
</script>

<main class="page">
	<Progress value={40} label="Upload" valueText="40%" />
	<Progress value={3} max={8} segments={8} label="Segments" />
	<Skeleton lines={3} />
	<Skeleton variant="block" width="200px" height="48px" />
	<Spinner label="Loading" />
	<Spinner label="Instant" class="instant-spinner" />
	<Spinner label="Styled" style="--spinner-delay: 0ms" />
	<EmptyState title="Nothing here" description="Add an item." variant="standard">
		{#snippet action()}<Button>Add</Button>{/snippet}
	</EmptyState>
	<EmptyState title="Empty display" variant="display" />
	<ErrorState title="Failed" description="Try again." onretry={() => {}} />
	<ErrorState title="Failed display" variant="display" onretry={() => {}} />
</main>
