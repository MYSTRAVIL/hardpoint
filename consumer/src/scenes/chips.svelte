<script>
	import { Button, Chip, ChipField } from '@mystravil/hardpoint';

	let filters = $state(['Owner: Ada', 'Status: Open', 'Label: Web', 'Size: Large']);
	let linked = $state(['Doc A', 'Doc B']);
	let tags = $state(['alpha', 'beta']);
	let posted = $state('');
	/** @param {SubmitEvent & { currentTarget: HTMLFormElement }} event */
	function submit(event) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		posted = JSON.stringify({ tags: data.getAll('tags'), frozen: data.getAll('frozen') });
	}
</script>

<main class="page">
	<!-- Display, link, count, tentative, category, link + remove. -->
	<ul class="row" aria-label="Kinds">
		<li><Chip label="Plain value" /></li>
		<li><Chip id="link-chip" label="Design" count={42} href="#chips" /></li>
		<li><Chip id="tentative-chip" label="Maybe" tentative href="#chips" /></li>
		<li><Chip id="category-chip" label="Teal" category={3} /></li>
		<li><Chip id="unlink-chip" label="Linked doc" href="#chips" removeLabel="Unlink Linked doc" onremove={() => {}} /></li>
	</ul>

	<!-- A row of removable chips: focus after a removal. -->
	<ul class="row" aria-label="Active filters">
		{#each filters as filter (filter)}
			<li><Chip label={filter} onremove={() => (filters = filters.filter((f) => f !== filter))} /></li>
		{/each}
	</ul>
	<ul class="row" aria-label="Linked">
		{#each linked as doc (doc)}
			<li><Chip label={doc} href="#chips" removeLabel={`Unlink ${doc}`} onremove={() => (linked = linked.filter((d) => d !== doc))} /></li>
		{/each}
	</ul>
	<Button id="outside">Outside</Button>

	<form id="chip-form" onsubmit={submit}>
		<ChipField
			id="tags-field"
			label="Tags"
			name="tags"
			hint="Press Enter to add a tag."
			suggestions={['alpha', 'gamma', 'delta', 'gamma']}
			bind:value={tags}
		/>
		<ChipField label="Frozen" name="frozen" value={['one', 'two']} disabled />
		<ChipField label="Repeats" value={['x', 'x', 'y']} readonly />
		<Button type="submit">Send</Button>
	</form>
	<p id="chips-state">value={JSON.stringify(tags)} posted={posted}</p>
	<!-- The control for the triangle check: a plain field with a datalist keeps the browser's own. -->
	<input id="plain-list" list="plain-options" aria-label="Plain list" />
	<datalist id="plain-options"><option value="one"></option></datalist>
</main>
