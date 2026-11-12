<script>
	import { Button, TextField } from '@mystravil/hardpoint';
	let query = $state('');
	let inputs = $state(0);
</script>

<main class="page">
	<!-- A find bar: the field with a hidden label, a count and icon buttons in one row. -->
	<div class="toolbar" role="search">
		<div class="toolbar-field">
			<TextField
				id="page-search"
				type="search"
				label="Search this page"
				labelHidden
				placeholder="Search"
				bind:value={query}
				oninput={() => inputs++}
			/>
		</div>
		<span>{query ? '3 of 12' : ''}</span>
		<Button variant="tertiary" icon aria-label="Close search">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
		</Button>
	</div>
	<p id="search-state">value=[{query}] inputs={inputs}</p>
	<TextField type="search" label="Search with messages" value="text" labelBeside hint="A hint" error="An error" clearLabel="Clear search" />
	<TextField type="search" label="Disabled search" value="text" disabled />
	<!-- The control for the cancel-button check: a plain search input keeps the browser's own. -->
	<input id="plain-search" type="search" value="plain" aria-label="Plain search" />
</main>
