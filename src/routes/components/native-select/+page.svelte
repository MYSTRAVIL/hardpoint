<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import NativeSelect, { type NativeSelectItem } from '#lib/components/NativeSelect.svelte';

	const sortOptions: NativeSelectItem[] = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'name', label: 'Name, A to Z' }
	];
	const sizeOptions: NativeSelectItem<number>[] = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
	const zoneOptions: NativeSelectItem[] = [
		{ value: 'utc', label: 'Coordinated Universal Time (UTC)' },
		{ value: 'cet', label: 'Central European Time (UTC+1)' },
		{ value: 'ist', label: 'India Standard Time (UTC+5:30)' },
		{ value: 'jst', label: 'Japan Standard Time (UTC+9)', disabled: true }
	];
	const paperOptions: NativeSelectItem[] = [
		{ value: 'document', label: 'Match the document' },
		{ value: 'a3', label: 'A3', group: 'ISO' },
		{ value: 'a4', label: 'A4', group: 'ISO' },
		{ value: 'a5', label: 'A5', group: 'ISO' },
		{ value: 'letter', label: 'Letter', group: 'North American' },
		{ value: 'legal', label: 'Legal', group: 'North American' },
		{ value: 'tabloid', label: 'Tabloid', group: 'North American' }
	];
	const officeOptions: NativeSelectItem[] = [
		{ value: 'bogota', label: 'Bogotá', group: 'Americas' },
		{ value: 'toronto', label: 'Toronto', group: 'Americas' },
		{ value: 'berlin', label: 'Berlin', group: 'Europe' },
		{ value: 'lisbon', label: 'Lisbon', group: 'Europe' },
		{ value: 'singapore', label: 'Singapore', group: 'Asia' },
		{ value: 'tokyo', label: 'Tokyo', group: 'Asia' }
	];

	let sort = $state('newest');
	let language = $state('en');
	let pageSize = $state(25);
	let zone = $state('cet');
	let view = $state('list');
	let theme = $state('dark');
	let paper = $state('a4');
	let office = $state('lisbon');

	// The live form: the page validates, the select shows the error it is
	// given. Validate on submit, and once a select shows an error, check it
	// again on change so the error clears as soon as it is fixed.
	const teamItems: NativeSelectItem[] = [
		{ value: '', label: 'Choose a team' },
		{ value: 'design', label: 'Design' },
		{ value: 'platform', label: 'Platform' },
		{ value: 'support', label: 'Support' }
	];
	let team = $state('');
	let teamError = $state<string>();
	let teamRef = $state<HTMLSelectElement | null>(null);
	let assigned = $state('');

	function checkTeam() {
		teamError = team ? undefined : 'Choose the team that owns the project.';
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		checkTeam();
		assigned = '';
		if (teamError) teamRef?.focus();
		else assigned = `Project assigned to ${teamItems.find((t) => t.value === team)?.label}.`;
	}
</script>

<svelte:head>
	<title>Native select · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Native select</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A single choice from a short fixed list. <code>NativeSelect</code> is a real
		<code>&lt;select&gt;</code>, so phones keep their own picker. It is a black well with a 3:1 boundary
		and a drawn chevron, never a filled block, because a filled select reads as a button. Its text is
		16px at every width, so iOS does not zoom on focus.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label.</strong> <code>label</code> is required and shows as a caps label above the well,
				linked to the select. <code>labelBeside</code> moves it beside the well: <code>true</code> at every
				width, or <code>'medium'</code>, <code>'expanded'</code> or <code>'large'</code> from 600px, 900px
				or 1200px up.
			</li>
			<li>
				<strong>Hint and error.</strong> <code>hint</code> shows guidance under the well in the muted
				ink. <code>error</code> shows a message under it with an icon, sets
				<code>aria-invalid</code> and turns the boundary red. Both are linked by
				<code>aria-describedby</code>, the error first, then the hint, then your own. Say how to fix the
				problem. An error that appears after the first render fades in with the red boundary over
				<code>--dur-message</code> (120ms); one that clears goes at once. With
				<code>labelBeside</code> the messages stay under the well.
			</li>
			<li>
				<strong>Validation stays with the app.</strong> The select shows the error it is given.
				<code>bind:ref</code> holds the <code>&lt;select&gt;</code>, so on submit the app can focus the
				first field with an error. Never disable the submit button to signal errors.
			</li>
			<li>
				<strong>Choices.</strong> Pass <code>items</code> as
				<code>{'{ value, label, group, disabled }'}</code>, or <code>&lt;option&gt;</code> elements as
				children. Values keep their type, so numbers stay numbers. <code>bind:value</code> holds the
				choice.
			</li>
			<li>
				<strong>Groups.</strong> Options with the same <code>group</code> sit in one
				<code>&lt;optgroup&gt;</code> with that label, as written. Options without a group come first;
				then each group, in the order its first option appears, with its options in their order. The
				system picker draws the group labels, which cannot be chosen. Groups do not fold or expand: a
				listbox has no groups that open and close; a list that does is a tree, a different control.
			</li>
			<li>
				The well fills its column and is never narrower than 136px. Extra attributes, event handlers and
				<code>class</code> go to the <code>&lt;select&gt;</code>.
			</li>
			<li>
				For searchable or rich options use <a href="/components/select">Select</a>, which opens as a
				sheet on phones.
			</li>
		</ul>
	</section>

	<section aria-labelledby="above">
		<h2 id="above" class="hp-section-title">Label above</h2>
		<p class="lede">The default, for forms and for filters on phones.</p>
		<div class="fields">
			<NativeSelect label="Sort by" items={sortOptions} bind:value={sort} />
			<NativeSelect label="Language" bind:value={language}>
				<option value="en">English</option>
				<option value="de">Deutsch</option>
				<option value="es">Español</option>
				<option value="fr">Français</option>
			</NativeSelect>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">sort = '{sort}'</span> · <span class="hp-mono">language = '{language}'</span>
		</p>
	</section>

	<section aria-labelledby="beside">
		<h2 id="beside" class="hp-section-title">Label beside</h2>
		<p class="lede">
			<code>labelBeside</code>: the label sits beside the well at every width. Numbers as values stay
			numbers.
		</p>
		<div class="row">
			<NativeSelect label="Per page" labelBeside items={sizeOptions} bind:value={pageSize} />
		</div>
		<p class="value hp-caption"><span class="hp-mono">pageSize = {pageSize}</span></p>
	</section>

	<section aria-labelledby="responsive">
		<h2 id="responsive" class="hp-section-title">Beside from a width</h2>
		<p class="lede">
			<code>labelBeside="expanded"</code>: above the well below 900px, beside it from 900px, as in a
			filter row under the header. Resize the window to see it move.
		</p>
		<div class="filters">
			<NativeSelect label="View" labelBeside="expanded" bind:value={view}>
				<option value="list">List</option>
				<option value="grid">Grid</option>
				<option value="calendar">Calendar</option>
			</NativeSelect>
			<NativeSelect label="Theme" labelBeside="expanded" bind:value={theme}>
				<option value="dark">Dark</option>
				<option value="light">Light</option>
				<option value="system">Match system</option>
			</NativeSelect>
		</div>
	</section>

	<section aria-labelledby="groups">
		<h2 id="groups" class="hp-section-title">Groups</h2>
		<p class="lede">
			Paper sizes by standard, with the first option in no group, and offices by region. Open a list to
			see the group labels in the system picker.
		</p>
		<div class="fields">
			<NativeSelect label="Paper size" items={paperOptions} bind:value={paper} />
			<NativeSelect label="Office" items={officeOptions} bind:value={office} />
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">paper = '{paper}'</span> · <span class="hp-mono">office = '{office}'</span>
		</p>
	</section>

	<section aria-labelledby="messages">
		<h2 id="messages" class="hp-section-title">Hint and error</h2>
		<p class="lede">
			The hint sits under the well in the muted ink. The error adds an icon and a message, and the
			boundary turns red. The hint stays. A disabled select keeps its quiet boundary.
		</p>
		<div class="form">
			<NativeSelect
				label="Time zone"
				items={zoneOptions}
				value="cet"
				hint="Reminders arrive in this zone."
			/>
			<NativeSelect
				label="Paper size"
				items={paperOptions}
				value="document"
				hint="Sets the page size of exports."
				error="Choose a size; Match the document needs a saved file."
			/>
			<NativeSelect
				label="Region"
				items={[{ value: '', label: 'Choose a region' }, { value: 'eu', label: 'Europe' }]}
				error="Choose a region."
				disabled
			/>
			<NativeSelect label="Per page" labelBeside items={sizeOptions} value={25} hint="Rows in the table." error="Choose 50 or more for this view." />
		</div>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">
			Send the form without choosing: the error appears and the select takes focus. Choose a team and
			it clears.
		</p>
		<form class="form" novalidate onsubmit={submit}>
			<NativeSelect
				label="Team"
				name="team"
				items={teamItems}
				required
				hint="The team that owns the project."
				error={teamError}
				bind:value={team}
				bind:ref={teamRef}
				onchange={() => teamError && checkTeam()}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Assign project</Button>
			</div>
			<p class="assigned hp-caption" role="status">{assigned}</p>
		</form>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">States</h2>
		<p class="lede">
			A long choice ends in an ellipsis. A disabled option stays in the list but cannot be chosen. A
			disabled select takes muted text. Press <kbd>Tab</kbd> to see the focus contour.
		</p>
		<div class="fields">
			<NativeSelect label="Time zone" items={zoneOptions} bind:value={zone} />
			<NativeSelect label="Region" disabled>
				<option>Europe</option>
			</NativeSelect>
		</div>
	</section>
</main>

<style>
	.intro,
	.lede {
		max-width: var(--measure);
		color: var(--muted);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	section {
		margin-top: var(--space-12);
	}

	code,
	kbd {
		font-size: 0.875em;
	}

	.notes {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin: var(--space-3) 0 0;
		padding-left: var(--space-5);
		color: var(--muted);
	}
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}

	/* Two columns, 12px apart, as the specimen's filters. */
	.fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
		max-width: 424px;
	}
	.row {
		display: flex;
	}
	.filters {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}
	.form {
		display: grid;
		gap: var(--space-6);
		max-width: 424px;
	}
	.actions {
		display: flex;
	}
	/* The status line stays rendered, so a screen reader announces the
	   text when it appears. */
	.assigned {
		margin: 0;
		color: var(--muted);
	}
	@media (min-width: 600px) {
		.filters {
			grid-template-columns: repeat(2, minmax(0, 200px));
		}
	}
	@media (min-width: 900px) {
		.filters {
			display: flex;
			gap: var(--space-6);
		}
	}

	.value {
		margin-top: var(--space-3);
		color: var(--muted);
	}
</style>
