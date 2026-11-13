<script>
	import { Button } from '@mystravil/hardpoint';
	let clicks = $state(0);
	/** @type {HTMLElement | null} */
	let ref = $state(null);
</script>

<main class="page">
	<div id="icon-host" class="row">
		<Button id="b-icon" variant="tertiary" icon type="button" aria-label="Copy" bind:ref onclick={() => clicks++}>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 3h8v8H3z" /></svg>
		</Button>
	</div>
	<p id="button-state">clicks={clicks} ref={ref?.tagName}</p>
	<div class="row">
		<Button id="b-primary" variant="primary">Primary</Button>
		<Button id="b-opens" opens>Opens</Button>
		<Button id="b-disabled" disabled>Disabled</Button>
		<Button id="b-link" href="#buttons">Link</Button>
		<Button id="b-link-disabled" href="#buttons" disabled>Disabled link</Button>
	</div>
	<div class="row">
		<Button id="b-danger" tone="danger">Delete</Button>
		<Button id="b-danger-tertiary" variant="tertiary" tone="danger">Remove</Button>
		<Button id="b-danger-disabled" tone="danger" disabled>Delete disabled</Button>
		<Button id="b-danger-icon" variant="tertiary" tone="danger" icon aria-label="Delete item">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 4h10M6 4V2h4v2M4 4l.5 9h7L12 4" /></svg>
		</Button>
		<Button id="b-danger-link" tone="danger" href="#buttons">Danger link</Button>
	</div>
</main>
