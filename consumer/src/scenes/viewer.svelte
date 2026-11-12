<script>
	import { ImageViewer, Button } from '@mystravil/hardpoint';
	const dataUrl =
		'data:image/svg+xml;charset=utf-8,' +
		encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#888"/><circle cx="320" cy="240" r="120" fill="#ccc"/></svg>');
	let which = $state('same');
</script>

<main class="page">
	<div class="row">
		<ImageViewer src="/staircase.jpg" alt="A staircase" title="Staircase" downloadName="staircase.jpg">
			{#snippet trigger({ props })}<Button {...props}>Open same-origin</Button>{/snippet}
		</ImageViewer>
		<ImageViewer src={dataUrl} alt="A grey disc" title="Disc" downloadName="disc.svg">
			{#snippet trigger({ props })}<Button {...props}>Open data URL</Button>{/snippet}
		</ImageViewer>
	</div>
</main>
