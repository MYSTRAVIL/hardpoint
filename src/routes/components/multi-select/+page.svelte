<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import LabelsTable from '../../LabelsTable.svelte';
	import MultiSelect, { type MultiSelectItem } from '#lib/components/MultiSelect.svelte';

	const fileTypes: MultiSelectItem[] = [
		{ value: 'pdf', label: 'PDF', count: 124 },
		{ value: 'sheet', label: 'Spreadsheet', count: 58 },
		{ value: 'image', label: 'Image', count: '1,204' },
		{ value: 'slides', label: 'Presentation', count: 17 },
		{ value: 'text', label: 'Text', count: 96 },
		{ value: 'archive', label: 'Archive', count: 9 }
	];

	const cities: MultiSelectItem[] = [
		{ value: 'lisbon', label: 'Lisbon', group: 'Europe', count: 42 },
		{ value: 'madrid', label: 'Madrid', group: 'Europe', count: 57 },
		{ value: 'paris', label: 'Paris', group: 'Europe', count: 88 },
		{ value: 'berlin', label: 'Berlin', group: 'Europe', count: 64 },
		{ value: 'warsaw', label: 'Warsaw', group: 'Europe', count: 23 },
		{ value: 'helsinki', label: 'Helsinki', group: 'Europe', count: 11 },
		{ value: 'bogota', label: 'Bogotá', group: 'Americas', count: 19 },
		{ value: 'mexico-city', label: 'Mexico City', group: 'Americas', count: 35 },
		{ value: 'toronto', label: 'Toronto', group: 'Americas', count: 47 },
		{ value: 'sao-paulo', label: 'São Paulo', group: 'Americas', count: 52 },
		{ value: 'nairobi', label: 'Nairobi', group: 'Africa', count: 14 },
		{ value: 'lagos', label: 'Lagos', group: 'Africa', count: 21 },
		{ value: 'cairo', label: 'Cairo', group: 'Africa', count: 8 },
		{ value: 'seoul', label: 'Seoul', group: 'Asia', count: 39 },
		{ value: 'tokyo', label: 'Tokyo', group: 'Asia', count: 71 },
		{ value: 'singapore', label: 'Singapore', group: 'Asia', count: 44 },
		{ value: 'mumbai', label: 'Mumbai', group: 'Asia', count: 26 },
		{ value: 'sydney', label: 'Sydney', group: 'Oceania', count: 30 },
		{ value: 'auckland', label: 'Auckland', group: 'Oceania', count: 6 }
	];

	const languages: MultiSelectItem[] = [
		{ value: 'da', label: 'Dansk' },
		{ value: 'de', label: 'Deutsch' },
		{ value: 'en', label: 'English' },
		{ value: 'es', label: 'Español' },
		{ value: 'fr', label: 'Français' },
		{ value: 'it', label: 'Italiano' },
		{ value: 'nl', label: 'Nederlands' },
		{ value: 'no', label: 'Norsk' },
		{ value: 'pl', label: 'Polski' },
		{ value: 'pt', label: 'Português' },
		{ value: 'fi', label: 'Suomi' },
		{ value: 'sv', label: 'Svenska' }
	];

	const channels: MultiSelectItem[] = [
		{ value: 'email', label: 'Email', description: 'To your work address' },
		{ value: 'push', label: 'Push', description: 'On phones with the app' },
		{ value: 'sms', label: 'Text message', description: 'Needs a verified phone number', disabled: true },
		{ value: 'chat', label: 'Chat', description: 'In the team channel' }
	];

	const people: MultiSelectItem[] = [
		{ value: 'mara.ilves', label: 'Mara Ilves' },
		{ value: 'tomas.reyes', label: 'Tomás Reyes' },
		{ value: 'ana.kovac', label: 'Ana Kovač' },
		{ value: 'joel.brandt', label: 'Joel Brandt' },
		{ value: 'ines.duarte', label: 'Ines Duarte' }
	];

	let none = $state<string[]>([]);
	let one = $state(['pdf']);
	let several = $state(['pdf', 'text', 'archive']);
	let picked = $state(['lisbon', 'tokyo']);
	let spoken = $state<string[]>([]);
	let notify = $state(['email', 'sms']);
	let owners = $state(['ana.kovac', 'r.okafor']);
	let barTypes = $state<string[]>([]);
	let barCities = $state(['berlin']);
	let barLanguages = $state<string[]>([]);

	// The validated form: the page validates, the field shows the error it
	// is given. Validate on submit; once it shows an error, a choice clears
	// it.
	let reviewers = $state<string[]>([]);
	let reviewersError = $state<string>();
	let reviewersRef = $state<HTMLElement | null>(null);
	let requested = $state('');
	$effect(() => {
		if (reviewers.length) reviewersError = undefined;
	});
	function request(e: SubmitEvent) {
		e.preventDefault();
		reviewersError = reviewers.length ? undefined : 'Choose at least one reviewer.';
		requested = '';
		if (reviewersError) reviewersRef?.focus();
		else requested = `Review requested from ${reviewers.length} ${reviewers.length === 1 ? 'person' : 'people'}.`;
	}

	let submitted = $state('');
	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		submitted = new URLSearchParams(data as unknown as Record<string, string>).toString();
	}

	const show = (v: string[]) => (v.length ? v.join(', ') : '(none)');
</script>

<svelte:head>
	<title>Multi-select · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Multi-select</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Several values from a list, as a filter needs them. The trigger is the same black well as a select and says
		what is chosen. Each option has a box like a checkbox and an optional count. A long list gets a search box
		above it. From 600px the options open in a list under the trigger; below 600px they open in a bottom sheet.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Use it for several values from a list,</strong> such as the values of a filter. A few choices in a
				form that read best side by side are a <code>CheckboxGroup</code>. One value is a <code>Select</code> or a
				<code>NativeSelect</code>.
			</li>
			<li>
				<code>label</code> is required: it is the caps field label and, on phones, the sheet’s title. The trigger
				shows the <code>placeholder</code> while nothing is chosen, the label of the one chosen option, or a count
				from <code>selectedText</code> (“3 selected”).
			</li>
			<li>
				<code>value</code> is an array of the chosen values, in the order they were chosen. Bind it, or set it from
				the app to change the choice.
			</li>
			<li>
				<code>count</code> sets a number at the end of the option’s row in the supporting ink, with tabular
				figures. It is shown as given, so the app formats it. A screen reader reads it with the option: “Lisbon,
				42”.
			</li>
			<li>
				<strong>Search.</strong> With more than <code>searchThreshold</code> options (8 by default) a search box
				sits above them. It matches the label or the group, ignoring case and accents; a group with no match drops
				its heading. Filtering never animates. Opened by keys or a mouse, the search box takes focus. Opened by a
				touch, it waits for a tap, so the on-screen keyboard stays down while you tick options; once it is up, the
				sheet sits above it.
			</li>
			<li>
				Keys: <kbd>Enter</kbd>, <kbd>Space</kbd>, <kbd>↓</kbd> or <kbd>↑</kbd> opens; with a search box, a
				typed character opens the list and starts the search with it. In the list, <kbd>↑</kbd> <kbd>↓</kbd>
				move, <kbd>Space</kbd> or <kbd>Enter</kbd> ticks or clears the option, and <kbd>Escape</kbd> closes it and
				puts focus back on the trigger. In the search box, <kbd>Space</kbd> ticks while the box is empty or after
				an arrow key; otherwise it types. Without a search box, <kbd>Home</kbd> and <kbd>End</kbd> move to the
				ends and typing jumps to a label. <kbd>Tab</kbd> closes the list and moves on; from the search box,
				<kbd>Shift</kbd>+<kbd>Tab</kbd> closes it and goes back to the trigger.
			</li>
			<li>
				<strong>Clear.</strong> While something is chosen, a cross at the end of the well removes every value and
				puts focus on the trigger. Its name is <code>clearLabel</code> and the field label: “Clear Languages”.
			</li>
			<li>
				A chosen value that is not among <code>items</code>, such as one from a shared link, stays listed at the
				top under its value, so it can be cleared. Cleared while the list is open, it stays there until the list
				closes.
			</li>
			<li>
				The chosen options have a titanium box with a check, as a checkbox. The option under the pointer or the
				keys gets the hover tint; the one moved by keys also draws the focus contour.
			</li>
			<li>
				<code>group</code>, <code>description</code> and <code>disabled</code> work as on <code>Select</code>.
				<code>hint</code>, <code>error</code> and <code>labelBeside</code> too.
			</li>
			<li>
				<code>name</code> submits each chosen value through its own hidden input. <code>required</code> sets
				<code>aria-required</code> on the trigger and stops a native submit while nothing is chosen. Extra
				attributes, event handlers and <code>ref</code> go to the trigger button; <code>class</code> goes to the
				field.
			</li>
			<li>
				A field that was never opened mounts only its trigger, so a filter bar can hold many. The list mounts on
				the first open and stays mounted after it.
			</li>
		</ul>
	</section>

	<section aria-labelledby="basic">
		<h2 id="basic" class="hp-section-title">Basics</h2>
		<p class="lede">
			Nothing chosen shows the placeholder in the supporting ink; one choice shows its label; more show a count.
		</p>
		<div class="grid">
			<div class="cell">
				<MultiSelect label="File type" items={fileTypes} placeholder="Any" bind:value={none} />
				<p class="hp-caption readout">value: <code>{show(none)}</code></p>
			</div>
			<div class="cell">
				<MultiSelect label="File type" items={fileTypes} placeholder="Any" bind:value={one} />
				<p class="hp-caption readout">value: <code>{show(one)}</code></p>
			</div>
			<div class="cell">
				<MultiSelect label="File type" items={fileTypes} placeholder="Any" bind:value={several} />
				<p class="hp-caption readout">value: <code>{show(several)}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="search">
		<h2 id="search" class="hp-section-title">Search, groups and counts</h2>
		<p class="lede">
			19 cities by region, each with a count, and 12 languages without one. Both pass the threshold, so a search
			box sits above the options. Type “eu” to keep the whole Europe group.
		</p>
		<div class="grid">
			<div class="cell">
				<MultiSelect label="City" items={cities} placeholder="Any" bind:value={picked} />
				<p class="hp-caption readout">value: <code>{show(picked)}</code></p>
			</div>
			<div class="cell">
				<MultiSelect label="Language" items={languages} placeholder="Any" bind:value={spoken} />
				<p class="hp-caption readout">value: <code>{show(spoken)}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="rich">
		<h2 id="rich" class="hp-section-title">Descriptions and disabled options</h2>
		<p class="lede">
			A description sets a second line in the supporting ink. A disabled option stays in the list in muted ink and
			says why; one that is chosen keeps its check.
		</p>
		<div class="grid">
			<div class="cell">
				<MultiSelect label="Notify by" items={channels} bind:value={notify} />
			</div>
		</div>
	</section>

	<section aria-labelledby="unknown">
		<h2 id="unknown" class="hp-section-title">Values not in the list</h2>
		<p class="lede">
			The value holds <code>r.okafor</code>, who is not among the options. It is listed first under its value, so
			it can be cleared.
		</p>
		<div class="grid">
			<div class="cell">
				<MultiSelect label="Owner" items={people} placeholder="Anyone" bind:value={owners} />
				<p class="hp-caption readout">value: <code>{show(owners)}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="disabled">
		<h2 id="disabled" class="hp-section-title">Disabled</h2>
		<p class="lede">The whole field is off and has no clear button; the text next to it says why.</p>
		<div class="grid">
			<div class="cell">
				<MultiSelect label="File type" items={fileTypes} value={['pdf', 'image']} disabled />
				<p class="hp-caption readout">Only an owner can change the saved filter.</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="beside">
		<h2 id="beside" class="hp-section-title">Filter bar</h2>
		<p class="lede">
			<code>labelBeside="expanded"</code> moves each label next to its trigger from 900px up.
		</p>
		<div class="bar">
			<MultiSelect label="Type" items={fileTypes} placeholder="Any" labelBeside="expanded" bind:value={barTypes} />
			<MultiSelect label="City" items={cities} placeholder="Any" labelBeside="expanded" bind:value={barCities} />
			<MultiSelect
				label="Language"
				items={languages}
				placeholder="Any"
				labelBeside="expanded"
				bind:value={barLanguages}
			/>
		</div>
	</section>

	<section aria-labelledby="messages">
		<h2 id="messages" class="hp-section-title">Hint and error</h2>
		<p class="lede">
			The hint sits under the trigger in the muted ink. The error adds an icon and a message, and the boundary
			turns red. The hint stays. A disabled field keeps its quiet boundary.
		</p>
		<div class="grid">
			<div class="cell">
				<MultiSelect label="Reviewers" items={people} placeholder="Choose people" hint="Each one gets a request." />
			</div>
			<div class="cell">
				<MultiSelect
					label="Reviewers"
					items={people}
					placeholder="Choose people"
					hint="Each one gets a request."
					error="Choose at least one reviewer."
				/>
			</div>
			<div class="cell">
				<MultiSelect
					label="File type"
					items={fileTypes}
					placeholder="Any"
					error="Choose at least one file type."
					disabled
				/>
			</div>
			<div class="cell">
				<MultiSelect
					label="Languages"
					items={languages}
					placeholder="Any"
					labelBeside
					hint="Results in these languages only."
					error="Choose a language."
				/>
			</div>
		</div>
		<p class="lede again">
			Send the form without choosing: the error appears and the field takes focus. Choose someone and it clears.
		</p>
		<form class="form" novalidate onsubmit={request}>
			<MultiSelect
				label="Reviewers"
				items={people}
				placeholder="Choose people"
				hint="Each one gets a request."
				required
				error={reviewersError}
				bind:value={reviewers}
				bind:ref={reviewersRef}
			/>
			<div class="actions">
				<Button variant="primary" type="submit">Request review</Button>
			</div>
			<p class="hp-caption readout" role="status">{requested}</p>
		</form>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">With <code>name</code>, each chosen value submits through its own hidden input.</p>
		<form class="form" onsubmit={submit}>
			<MultiSelect label="File type" name="type" items={fileTypes} value={['pdf', 'text']} placeholder="Any" />
			<div class="actions">
				<Button variant="primary" type="submit">Save filter</Button>
			</div>
			<p class="hp-caption readout" aria-live="polite">
				{#if submitted}submitted: <code>{submitted}</code>{:else}Nothing submitted yet.{/if}
			</p>
		</form>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'selectedText', value: '(count) => `${count} selected`', shows: 'The trigger’s text when more than one value is chosen.' },
				{ prop: 'clearLabel', value: 'Clear', shows: 'The accessible name of the clear button, before the field label.' },
				{ prop: 'searchPlaceholder', value: 'Search', shows: 'The placeholder of the search box over a long list.' },
				{ prop: 'emptyText', value: 'No matches', shows: 'In the list, when no option matches the search.' },
				{ prop: 'closeLabel', value: 'Close', shows: 'The accessible name of the sheet’s close button, below 600px.' }
			]}
		/>
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
	.lede.again {
		margin-top: var(--space-8);
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 20rem));
		gap: var(--space-8) var(--space-6);
	}
	.cell {
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-width: 0;
	}
	.readout {
		color: var(--muted);
	}

	/* A filter bar: the fields share the row and wrap under each other. */
	.bar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--space-4) var(--space-6);
	}

	.form {
		display: grid;
		gap: var(--space-5);
		max-width: 20rem;
	}
	.actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
