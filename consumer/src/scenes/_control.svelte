<!-- Negative control: these must each be blocked by the policy. `node run.mjs _control` must exit 1. -->
<script>
	import { onMount } from 'svelte';
	onMount(() => {
		const s = document.createElement('style');
		s.textContent = 'p { color: red }';
		document.head.append(s);
		const d = document.createElement('div');
		d.setAttribute('style', 'color: red');
		document.body.append(d);
	});
</script>

<p style="color: red">A static style attribute.</p>
