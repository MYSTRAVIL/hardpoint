<script>
	import { Button, Toaster, toast } from '@mystravil/hardpoint';
	let undone = $state(0);
</script>

<main class="page">
	<div class="row">
		<Button onclick={() => toast('Saved')}>Plain toast</Button>
		<Button onclick={() => toast('Archived', { action: { label: 'Undo', onclick: () => undone++ } })}>Action toast</Button>
		<Button onclick={() => toast('Replacement ' + Math.round(Math.random() * 1000))}>Replace</Button>
		<Button onclick={() => toast('Wide toast with a long message that runs on and on and on so the cap shows', { duration: 20000 })}>Wide</Button>
	</div>
	<p id="undone">{undone}</p>
</main>
<Toaster class="wide-toast" />
