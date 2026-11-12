<script>
	import { Button, Toaster, toast } from '@mystravil/hardpoint';
</script>

<main class="page">
	<Button onclick={() => toast('Wide toast with a long message that runs on and on and on so the cap shows', { duration: 20000 })}>Wide</Button>
</main>
<Toaster style="--toast-width: 36rem" />
