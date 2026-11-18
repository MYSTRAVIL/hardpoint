<script lang="ts">
	import type { AppShellCompactNav, AppShellWideNav } from '@mystravil/hardpoint';
	import { AppShell, Button } from '@mystravil/hardpoint';
	const q = new URLSearchParams(location.search);
	const compactNav = (q.get('compact') ?? 'bar') as AppShellCompactNav;
	const wideNav = (q.get('wide') ?? 'sidebar') as AppShellWideNav;
	const long = q.get('labels') === 'long';
	const destinations = long
		? [
				{ href: '#shell?a', label: 'Opportunities' },
				{ href: '#shell?b', label: 'Breaking now' },
				{ href: '#shell?c', label: 'Saved searches' },
				{ href: '#shell?d', label: 'Recent files' },
				{ href: '#shell?e', label: 'Account settings', icon }
			]
		: [
				{ href: '#shell?a', label: 'Home' },
				{ href: '#shell?b', label: 'Projects' },
				{ href: '#shell?c', label: 'Settings' }
			];
	// The drawer form mounts from a button, so the driver can count what a
	// closed drawer adds to <body>.
	let mounted = $state(compactNav !== 'drawer');
</script>

{#snippet icon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 4.5h12M2 11.5h12M5.5 2.5v4M10.5 9.5v4" /></svg>
{/snippet}

{#if mounted}
	<AppShell
		title="Projects"
		{destinations}
		current="#shell?b"
		{compactNav}
		{wideNav}
		class={q.get('rail') === 'wide' ? 'wide-rail' : undefined}
	>
		{#snippet brand()}<span>HARD</span>{/snippet}
		{#snippet controls()}<Button>Filter</Button>{/snippet}
		<p>Main content</p>
	</AppShell>
{:else}
	<main class="page">
		<div class="row"><Button onclick={() => (mounted = true)}>Mount shell</Button></div>
	</main>
{/if}
