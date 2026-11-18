<script lang="ts">
	import { Button, TabNav } from '@mystravil/hardpoint';
	const items = [
		{ href: '#general', label: 'General' },
		{ href: '#members', label: 'Members' },
		{ href: '#notifications', label: 'Notifications' },
		{ href: '#integrations', label: 'Integrations' },
		{ href: '#webhooks', label: 'Webhooks' },
		{ href: '#billing', label: 'Billing' },
		{ href: '#security', label: 'Security' },
		{ href: '#advanced', label: 'Advanced' }
	];
	let current = $state('#security');
	let nav = $state<HTMLElement | null>(null);
</script>

<main class="page">
	<p id="nav-state">current=[{current}] ref={nav ? nav.tagName : 'none'}</p>
	<TabNav {items} {current} label="Settings pages" bind:ref={nav} class="settings-nav" />
	<div class="row">
		<Button onclick={() => (current = '#general')}>Show general</Button>
		<Button onclick={() => (current = '#advanced')}>Show advanced</Button>
		<Button onclick={() => (current = '#elsewhere')}>Show none</Button>
	</div>
	<TabNav items={items.slice(0, 3)} current="#members" label="Short list" />
</main>
