<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import TextArea from '#lib/components/TextArea.svelte';
	import TextField from '#lib/components/TextField.svelte';

	const lineCount = (text: string) => (text ? text.split('\n').length : 0);

	let message = $state('');
	let description = $state('');
	let reply = $state('');

	// No blank lines, so a line of text always shows cut at the bottom edge,
	// whatever the width: the sign that there is more to scroll.
	const notes = [
		'Version 4.2',
		'- Tables keep their column widths when you paste rows from a spreadsheet.',
		'- Comments can be resolved from the margin. A resolved comment folds into a single line.',
		'- The outline follows the headings as you type.',
		'- Shared links can expire. Choose a date when you create the link, or change it later from the link list.',
		'- An expired link shows a short page that says who to ask for access.',
		'- The word count no longer counts footnotes twice.',
		'- Images keep their size when you move them between pages.'
	].join('\n');

	// The live form: the page validates, the field shows the error it is
	// given. Validate on blur and on submit; once the field shows an error,
	// check it again on input so the error clears as soon as it is fixed.
	let feedback = $state('');
	let feedbackError = $state<string>();
	let feedbackRef = $state<HTMLTextAreaElement | null>(null);
	let sent = $state('');

	function checkFeedback() {
		feedbackError = feedback.trim() ? undefined : 'Write a message before sending.';
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		checkFeedback();
		sent = '';
		if (feedbackError) feedbackRef?.focus();
		else {
			const lines = lineCount(feedback.trim());
			sent = `Message sent, ${lines} ${lines === 1 ? 'line' : 'lines'}.`;
			feedback = '';
		}
	}

	// In a full-screen dialog.
	let noteOpen = $state(false);
	let noteTitle = $state('');
	let noteBody = $state('');
	let saved = $state('');
	function saveNote(event: SubmitEvent) {
		event.preventDefault();
		const lines = lineCount(noteBody.trim());
		saved = `Saved “${noteTitle.trim() || 'Untitled'}”, ${lines} ${lines === 1 ? 'line' : 'lines'}.`;
		noteOpen = false;
	}
</script>

<svelte:head>
	<title>Text area · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Text area</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Several lines of text: a message, a description, an answer. <code>TextArea</code> is a native
		<code>&lt;textarea&gt;</code> in the black well, with a plain caps label above it, never a placeholder
		alone. It starts three lines high, grows with its text up to ten lines, then scrolls inside. A hint
		and an inline error sit under the well and are linked to it. Its text is 16px at every width, so iOS
		does not zoom on focus.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label.</strong> <code>label</code> is required and shows as a caps label above the well,
				linked to the textarea. It always sits above: a field of several lines has no room beside it.
			</li>
			<li>
				<strong>Height.</strong> <code>rows</code> sets the height of the empty well in lines (default 3),
				and <code>maxRows</code> how far it grows with its text (default 10); past that it scrolls inside.
				Lines are 24px, with 12px of padding above and below, so the defaults give 98px and 266px. The
				height changes at once, never animated. Enter adds a line.
			</li>
			<li>
				<strong>Hint and error.</strong> As on a text field: <code>hint</code> shows guidance under the well
				in the muted ink; <code>error</code> shows a message with an icon, sets <code>aria-invalid</code>
				and turns the boundary red. Both are linked by <code>aria-describedby</code>, the error first. An
				error that appears after the first render fades in over <code>--dur-message</code> (120ms); one that
				clears goes at once.
			</li>
			<li>
				<strong>Validation stays with the app.</strong> Validate on blur and on submit; on submit, focus the
				first field with an error through <code>bind:ref</code>. Never disable the submit button to signal
				errors.
			</li>
			<li>
				<strong>Updates around it.</strong> The textarea is never rebuilt, and its text is written only when
				it changes. The text, the caret, the selection and focus hold while the page around it updates,
				for example while new content arrives beside it.
			</li>
			<li>
				<strong>Attributes.</strong> <code>placeholder</code>, <code>name</code>, <code>required</code>,
				<code>maxlength</code>, <code>autocomplete</code>, <code>autocapitalize</code>,
				<code>spellcheck</code>, <code>enterkeyhint</code>, <code>disabled</code>, <code>readonly</code>,
				event handlers and <code>class</code> go to the <code>&lt;textarea&gt;</code>.
				<code>bind:value</code> holds the text.
			</li>
		</ul>
	</section>

	<section aria-labelledby="basic">
		<h2 id="basic" class="hp-section-title">Label and placeholder</h2>
		<p class="lede">
			The default: three lines empty, growing to ten as you type. The placeholder shows an example, never
			the label.
		</p>
		<div class="form">
			<TextArea label="Message" placeholder="Write a message" bind:value={message} />
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">{message.length} characters, {lineCount(message)} lines</span>
		</p>
	</section>

	<section aria-labelledby="hint">
		<h2 id="hint" class="hp-section-title">With a hint</h2>
		<p class="lede">The hint sits under the well in the muted ink.</p>
		<div class="form">
			<TextArea
				label="Description"
				placeholder="What the project is for and who works on it"
				hint="Shown under the title on the project page."
				bind:value={description}
			/>
		</div>
	</section>

	<section aria-labelledby="errors">
		<h2 id="errors" class="hp-section-title">Inline error</h2>
		<p class="lede">
			The error sits under the well with an icon and text, and the boundary turns red. The hint stays.
		</p>
		<div class="form">
			<TextArea
				label="Message"
				placeholder="Write a message"
				required
				error="Write a message before sending."
			/>
			<TextArea
				label="Summary"
				value="A short note on the plan for the next quarter. It covers the three releases, the people who own each one and the dates they are due, and it lists what we still need to decide before the first one can start."
				hint="Up to 160 characters."
				error="Shorten the summary to 160 characters or fewer."
			/>
		</div>
	</section>

	<section aria-labelledby="height">
		<h2 id="height" class="hp-section-title">Height</h2>
		<p class="lede">
			<code>{'rows={2}'}</code> and <code>{'maxRows={4}'}</code>: two lines empty, four at most, for a short
			reply.
		</p>
		<div class="form">
			<TextArea
				label="Reply"
				rows={2}
				maxRows={4}
				placeholder="Write a reply"
				bind:value={reply}
			/>
		</div>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long text</h2>
		<p class="lede">
			Text longer than <code>maxRows</code> scrolls inside the well, with a thin scrollbar on a mouse.
		</p>
		<div class="form">
			<TextArea label="Release notes" value={notes} />
		</div>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">Disabled and read-only</h2>
		<p class="lede">
			Both take muted text. A disabled field also takes the quieter boundary and cannot be focused. A
			read-only one keeps its boundary, because it still takes focus and its text can be selected and
			copied.
		</p>
		<div class="form">
			<TextArea
				label="Internal notes"
				value="Moved from the old tracker on 2026-09-18."
				hint="Only owners can edit these notes."
				disabled
			/>
			<TextArea
				label="Original request"
				value={'A page that lists every open task with its owner and due date.\nSorted by due date, soonest first.'}
				hint="Kept as it was first written."
				readonly
			/>
		</div>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">
			Leave the field empty and move on, and the error shows. Send the form, and the field also takes focus.
		</p>
		<form class="form" novalidate onsubmit={submit}>
			<TextArea
				label="Feedback"
				placeholder="What works well, and what could be better?"
				required
				error={feedbackError}
				bind:value={feedback}
				bind:ref={feedbackRef}
				onblur={checkFeedback}
				oninput={() => feedbackError && checkFeedback()}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Send</Button>
			</div>
			<p class="sent" role="status">{sent}</p>
		</form>
	</section>

	<section aria-labelledby="dialog">
		<h2 id="dialog" class="hp-section-title">In a full-screen dialog</h2>
		<p class="lede">
			On a phone the dialog fills the screen; while the on-screen keyboard is up, it fills the space above
			it. The body scrolls, so the line you type stays in sight as the field grows.
		</p>
		<div class="row">
			<Dialog title="New note" fullscreen bind:open={noteOpen}>
				{#snippet trigger({ props })}
					<Button {...props}>New note</Button>
				{/snippet}
				<form id="new-note" class="form" onsubmit={saveNote}>
					<TextField label="Title" autocomplete="off" enterkeyhint="next" bind:value={noteTitle} />
					<TextArea label="Note" placeholder="Write the note" bind:value={noteBody} />
				</form>
				{#snippet actions({ close })}
					<Button onclick={close}>Cancel</Button>
					<Button variant="primary" type="submit" form="new-note">Save note</Button>
				{/snippet}
			</Dialog>
			<p class="hp-caption readout" aria-live="polite">{saved || 'No note saved yet.'}</p>
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

	/* Token names never break at their hyphens. */
	code {
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
	}
	/* The status region stays rendered, so a screen reader announces the
	   text when it appears. */
	.sent {
		margin: 0;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
	}
	.readout {
		margin: 0;
		color: var(--muted);
	}
</style>
