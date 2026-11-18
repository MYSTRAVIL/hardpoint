<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import ChipField from '#lib/components/ChipField.svelte';

	let labels = $state(['Design', 'Research']);
	const labelSuggestions = ['Accessibility', 'Design', 'Engineering', 'Marketing', 'Operations', 'Research', 'Web app'];

	// Codes in the value, names on the chips and in the suggestions.
	const languageNames: Record<string, string> = {
		de: 'German',
		en: 'English',
		es: 'Spanish',
		fr: 'French',
		ja: 'Japanese',
		pt: 'Portuguese'
	};
	let languages = $state(['en', 'fr']);
	const languageName = (code: string) => languageNames[code] ?? code;

	// The form: values post as hidden inputs named `watchers`. The page
	// validates on submit and focuses the field when it is empty.
	let watchers = $state<string[]>([]);
	let watcherRef = $state<HTMLInputElement | null>(null);
	let submitted = $state(false);
	let posted = $state('');
	const watcherError = $derived(submitted && !watchers.length ? 'Add at least one email address.' : undefined);
	function submit(event: SubmitEvent) {
		event.preventDefault();
		submitted = true;
		posted = '';
		if (!watchers.length) {
			watcherRef?.focus();
			return;
		}
		const data = new FormData(event.currentTarget as HTMLFormElement);
		posted = data.getAll('watchers').join(', ');
	}

	let keywords = $state(['invoice', 'refund']);
</script>

<svelte:head>
	<title>Chip field · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Chip field</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A text field whose values become chips. <code>ChipField</code> has the text field’s caps label, hint,
		inline error and 16px well. <kbd>Enter</kbd> turns the typed text into a removable
		<a href="/components/chip">chip</a> in a list under the field. Suggestions come from the browser’s own
		list, and any other text can be added too.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Value.</strong> <code>bind:value</code> holds the values as a <code>string[]</code>, in the
				order they were added. A function binding, a getter and a setter, lets an app keep them in its own
				store.
			</li>
			<li>
				<strong>Adding.</strong> <kbd>Enter</kbd> adds the trimmed text and empties the field; focus stays
				in it. A comma is part of a value, so “Berlin, Germany” stays whole. A value already in the list is
				not added again. In an empty field, <kbd>Enter</kbd> does what it does in any field, such as sending
				the form. Text left in the field is not a value until <kbd>Enter</kbd> adds it.
			</li>
			<li>
				<strong>Suggestions.</strong> <code>suggestions</code> fills a native <code>&lt;datalist&gt;</code>
				without the values already chosen. The browser shows matches as you type, in its own list, and
				<kbd>↓</kbd> shows them all; picking one adds it at once. It needs no layer, script or style of its
				own. The triangle Chromium draws at the end of the well is hidden, so the well stays a text well.
			</li>
			<li>
				<strong>Removing.</strong> Each chip has a remove button named “Remove” and its text
				(<code>removeLabel</code>). When a removed chip held focus, focus moves to the next chip, or the
				previous one, and back to the field after the last.
			</li>
			<li>
				<strong>Text.</strong> <code>format</code> turns a value into the text its chip and its suggestion
				show, for example a code into a name. The value keeps the code.
			</li>
			<li>
				<strong>Forms.</strong> With <code>name</code>, each value posts as a hidden input with that name;
				the text being typed never posts. <code>required</code> sets <code>aria-required</code> only: the
				app validates and shows <code>error</code>.
			</li>
			<li>
				<strong>Screen readers.</strong> A hidden status line says what changed: “Added Design”, “Removed
				Design”, or that a value is already there.
			</li>
			<li>
				<strong>Attributes.</strong> Other attributes and handlers go to the <code>&lt;input&gt;</code>,
				and <code>class</code> to the root. <code>autocomplete</code> is <code>off</code> and
				<code>enterkeyhint</code> is <code>enter</code> unless set.
			</li>
		</ul>
	</section>

	<section aria-labelledby="basics">
		<h2 id="basics" class="hp-section-title">Basics</h2>
		<p class="lede">
			Type a label and press <kbd>Enter</kbd>, or pick a suggestion. In the empty field,
			<kbd>Backspace</kbd> moves to the last chip’s remove button; a second press removes it.
		</p>
		<div class="form">
			<ChipField
				label="Labels"
				hint="Press Enter to add a label."
				suggestions={labelSuggestions}
				bind:value={labels}
			/>
		</div>
		<p class="value hp-caption"><span class="hp-mono">value = {JSON.stringify(labels)}</span></p>
	</section>

	<section aria-labelledby="format">
		<h2 id="format" class="hp-section-title">Codes shown as names</h2>
		<p class="lede">
			The value holds language codes; <code>format</code> shows each as its name on the chip and beside
			the code in the suggestions.
		</p>
		<div class="form">
			<ChipField
				label="Languages"
				hint="A language code, such as de."
				suggestions={Object.keys(languageNames)}
				format={languageName}
				bind:value={languages}
			/>
		</div>
		<p class="value hp-caption"><span class="hp-mono">value = {JSON.stringify(languages)}</span></p>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">
			Send the form with no address: the error shows and the field takes focus. Add addresses and send it
			again to see what posts.
		</p>
		<form class="form" novalidate onsubmit={submit}>
			<ChipField
				label="Watchers"
				name="watchers"
				inputmode="email"
				hint="Each address gets a message when the project changes."
				required
				error={watcherError}
				bind:value={watchers}
				bind:ref={watcherRef}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Save watchers</Button>
			</div>
			<p class="sent hp-caption" role="status">
				{#if posted}<span class="hp-mono">watchers = {posted}</span>{/if}
			</p>
		</form>
	</section>

	<section aria-labelledby="hidden">
		<h2 id="hidden" class="hp-section-title">Label hidden</h2>
		<p class="lede">
			<code>labelHidden</code> in a filter bar whose place makes the purpose plain: the label stays the
			name of the field and of the list.
		</p>
		<div class="form">
			<ChipField label="Filter by keyword" labelHidden placeholder="Add a keyword" bind:value={keywords} />
		</div>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">States</h2>
		<p class="lede">
			An error shows under the well and turns its edge red; the chips stay as they are. A read-only field
			keeps its values readable without remove buttons. A disabled field mutes the chips and posts nothing.
		</p>
		<div class="form">
			<ChipField
				label="Reviewers"
				value={['Mara Ilves', 'Jonas Berg']}
				error="Add a third reviewer for a release."
			/>
			<ChipField label="Owners" value={['Mara Ilves']} readonly hint="Set by the workspace." />
			<ChipField label="Archived labels" value={['Q3 launch', 'Beta']} disabled />
		</div>
	</section>

	<section aria-labelledby="keys">
		<h2 id="keys" class="hp-section-title">Keyboard</h2>
		<ul class="notes">
			<li><kbd>Enter</kbd> in the field adds the text; in an empty field it keeps its own job.</li>
			<li><kbd>Backspace</kbd> in an empty field moves to the last chip’s remove button. Holding it does not.</li>
			<li><kbd>Tab</kbd> and <kbd>Shift</kbd> <kbd>Tab</kbd> move between the field and the remove buttons.</li>
			<li>
				<kbd>Enter</kbd>, <kbd>Space</kbd>, <kbd>Backspace</kbd> or <kbd>Delete</kbd> on a remove button
				removes its chip. Focus moves to the next chip, the previous one, or the field.
			</li>
			<li><kbd>↓</kbd> opens the browser’s suggestions; <kbd>Enter</kbd> there adds the one chosen.</li>
		</ul>
	</section>

	<section aria-labelledby="labels-table">
		<h2 id="labels-table" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'removeLabel', value: 'Remove <text>', shows: 'The accessible name of each chip’s remove button. A function of the chip’s text.' },
				{ prop: 'addedText', value: 'Added <text>', shows: 'The status line after Enter or a suggestion adds a value.' },
				{ prop: 'removedText', value: 'Removed <text>', shows: 'The status line after a chip is removed.' },
				{ prop: 'duplicateText', value: '<text> is already added', shows: 'The status line when Enter repeats a value in the list.' }
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
	.intro a {
		color: var(--text);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	section {
		margin-top: var(--space-12);
	}

	/* Token names never break at their hyphens. */
	code,
	kbd {
		font-size: 0.875em;
		white-space: nowrap;
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

	/* One column of fields; the gap between fields is more than twice the
	   gap inside one. */
	.form {
		display: grid;
		gap: var(--space-6);
		max-width: 424px;
	}
	.actions {
		display: flex;
	}

	.value {
		margin: var(--space-3) 0 0;
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	/* The status region stays rendered, so a screen reader announces the
	   text when it appears. */
	.sent {
		margin: 0;
		color: var(--muted);
		overflow-wrap: anywhere;
	}
</style>
