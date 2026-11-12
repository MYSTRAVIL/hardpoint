<script lang="ts">
	import type { AppShellCompactNav, AppShellWideNav } from '@mystravil/hardpoint';
	import { AppShell, Button } from '@mystravil/hardpoint';
	const q = new URLSearchParams(location.search);
	const compactNav = (q.get('compact') ?? 'bar') as AppShellCompactNav;
	const wideNav = (q.get('wide') ?? 'sidebar') as AppShellWideNav;
	const destinations = [
		{ href: '#shell?a', label: 'Home' },
		{ href: '#shell?b', label: 'Projects' },
		{ href: '#shell?c', label: 'Settings' }
	];
</script>

<AppShell title="Projects" {destinations} current="#shell?b" {compactNav} {wideNav}>
	{#snippet brand()}<span>HARD</span>{/snippet}
	{#snippet controls()}<Button>Filter</Button>{/snippet}
	<p>Main content</p>
</AppShell>
