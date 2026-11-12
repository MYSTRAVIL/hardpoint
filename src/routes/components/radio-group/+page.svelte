<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import RadioGroup, { type RadioGroupItem } from '#lib/components/RadioGroup.svelte';
	import TextField from '#lib/components/TextField.svelte';

	const viewItems: RadioGroupItem[] = [
		{ value: 'list', label: 'List', hint: 'One row per project, sorted by due date.' },
		{ value: 'board', label: 'Board', hint: 'A column for each status.' },
		{ value: 'calendar', label: 'Calendar', hint: 'Projects on the days they are due.' }
	];
	let view = $state('list');

	const keepItems: RadioGroupItem[] = [
		{
			value: 'archive',
			label: 'Archive them after 30 days',
			hint: 'They leave the board and stay in search.',
			tag: 'Recommended'
		},
		{ value: 'keep', label: 'Keep them on the board', hint: 'The board grows with every task.' },
		{ value: 'delete', label: 'Delete them after 90 days', hint: 'Deleted tasks cannot be restored.' }
	];
	let keep = $state('');

	const reminderItems: RadioGroupItem[] = [
		{ value: 'due', label: 'At the due time' },
		{ value: 'hour', label: 'One hour before' },
		{ value: 'day', label: 'One day before', hint: 'At 9:00 in your time zone.' }
	];
	let reminder = $state('hour');

	const sourceItems: RadioGroupItem[] = [
		{ value: 'friend', label: 'A friend or a colleague' },
		{ value: 'search', label: 'A search engine' },
		{ value: 'article', label: 'An article or a video' }
	];
	let source = $state('search');
	let sourceOther = $state('');

	const planItems: RadioGroupItem[] = [
		{ value: 'starter', label: 'Starter', hint: 'Up to 3 people and 5 projects.' },
		{ value: 'team', label: 'Team', hint: 'Up to 50 people, unlimited projects.', tag: 'Recommended' },
		{ value: 'business', label: 'Business', hint: 'Single sign-on and audit logs.' }
	];

	const storageItems: RadioGroupItem[] = [
		{ value: 'device', label: 'This device', hint: 'Works offline. Uses up to 2 GB.' },
		{ value: 'drive', label: 'Workspace drive', hint: 'Shared with everyone in the workspace.' },
		{ value: 'external', label: 'External drive', hint: 'Connect a drive to choose it.', disabled: true }
	];
	let storage = $state('drive');

	// The live form: the page validates, the group shows the error it is
	// given. On submit, focus goes to the group's radio in the tab order;
	// a choice clears the error.
	const billingItems: RadioGroupItem[] = [
		{ value: 'monthly', label: 'Monthly', hint: 'Billed each month. Cancel any time.' },
		{ value: 'yearly', label: 'Yearly', hint: 'Billed once a year. Two months free.' }
	];
	let billing = $state('');
	let billingError = $state<string>();
	let billingRef = $state<HTMLElement | null>(null);
	let billingSaved = $state('');

	function submitBilling(event: SubmitEvent) {
		event.preventDefault();
		billingSaved = '';
		if (!billing) {
			billingError = 'Choose how often to pay.';
			billingRef?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
			return;
		}
		billingSaved = `Billing set to ${billing}.`;
	}
</script>

<svelte:head>
	<title>Radio group · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Radio group</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		One choice from a set whose options are read side by side, often with a line that explains each.
		<code>RadioGroup</code> stacks square boxes with their labels. The chosen box takes a titanium edge
		and a titanium square inside; the box stays black, because selection is never a fill. For one
		choice from a short list of plain labels, use a <a href="/components/native-select">Native select</a>.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Name.</strong> <code>label</code> is a fixed caps name the app defines.
				<code>legend</code> is a snippet set as written in 16px at weight 500, for a question or a name
				with a counter before it. Give one of them. <code>hint</code> adds a muted line under the name
				that is read out as the group’s description.
			</li>
			<li>
				<strong>Choices.</strong> <code>items</code>, each with a <code>value</code>, a <code>label</code>
				and an optional <code>hint</code>, <code>tag</code> and <code>disabled</code>. The label is as
				written, never in caps.
				<code>hint</code> is a muted line under it, read out as the choice’s description.
				<code>tag</code> is a <a href="/components/tag">Tag</a> after the label, such as Recommended; it is
				part of the choice’s name.
			</li>
			<li>
				<strong>Value.</strong> <code>bind:value</code> holds the chosen value, and <code>''</code> means
				none. A person cannot take a choice back, but the app can set <code>''</code>, for example when
				they write their own answer instead. <code>name</code> submits the value with a form;
				<code>required</code> marks it as needed.
			</li>
			<li>
				<strong>Targets.</strong> A press anywhere on a choice’s row chooses it: the box, the label, the
				tag, the hint and the space between them. Each row is at least 24px high on a mouse and 44px on
				touch, and rows sit 8px apart.
			</li>
			<li>
				<strong>Keys.</strong> <kbd>Tab</kbd> enters the group on the chosen radio, or on the first one
				when none is chosen. The arrow keys move the choice, and <kbd>Home</kbd> and <kbd>End</kbd> jump
				to the ends; they loop round unless <code>loop</code> is false. With nothing chosen, the arrows
				move focus and <kbd>Space</kbd> chooses.
			</li>
			<li>
				<strong>Motion.</strong> A choice made with a pointer or a touch fades its square in over
				<code>--dur-mark</code> (80ms), and the old square goes at once. A choice made with a key, or a
				value the app sets, appears at once, so holding an arrow key never animates.
			</li>
			<li>
				<strong>Error.</strong> <code>error</code> shows a message with an icon under the choices and
				sets <code>aria-invalid</code> on the group. The group is described by the error, then the hint.
				Validate on submit, then focus the radio that is in the tab order, the one with
				<code>tabindex="0"</code>, through <code>bind:ref</code>.
			</li>
			<li>
				The group element has <code>role="radiogroup"</code>, <code>data-disabled</code> and
				<code>data-invalid</code>; each radio has <code>aria-checked</code>, <code>data-state</code>
				(checked, unchecked), <code>data-value</code> and <code>data-disabled</code>. Extra attributes,
				event handlers and <code>class</code> go to the group element. For several choices at once, use a
				<a href="/components/checkbox">Checkbox group</a>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="label">
		<h2 id="label" class="hp-section-title">Caps label</h2>
		<p class="lede">
			A fixed name in caps over choices that each have a line of their own. Press a hint to choose its
			row. Press <kbd>Tab</kbd> to see the focus contour, 4px outside the box, then use the arrow keys.
		</p>
		<div class="column">
			<RadioGroup label="Default view" items={viewItems} bind:value={view} />
		</div>
		<p class="value hp-caption"><span class="hp-mono">view = '{view}'</span></p>
	</section>

	<section aria-labelledby="question">
		<h2 id="question" class="hp-section-title">Question</h2>
		<p class="lede">
			A legend names the group as written: a question with a counter before it. One choice carries a
			Recommended tag. Nothing is chosen yet.
		</p>
		<div class="column">
			<RadioGroup items={keepItems} hint="You can change this later in settings." bind:value={keep}>
				{#snippet legend()}
					<span class="counter hp-num">2 / 3</span> How should finished tasks be kept?
				{/snippet}
			</RadioGroup>
		</div>
		<p class="value hp-caption"><span class="hp-mono">keep = '{keep}'</span></p>
	</section>

	<section aria-labelledby="clear">
		<h2 id="clear" class="hp-section-title">Nothing chosen</h2>
		<p class="lede">
			The app sets <code>value</code> to <code>''</code> to clear the choice. <kbd>Tab</kbd> then enters
			the group on its first radio.
		</p>
		<div class="column">
			<RadioGroup label="Reminder" items={reminderItems} bind:value={reminder} />
			<div class="actions">
				<Button type="button" onclick={() => (reminder = '')}>Clear</Button>
			</div>
		</div>
		<p class="value hp-caption"><span class="hp-mono">reminder = '{reminder}'</span></p>
	</section>

	<section aria-labelledby="own">
		<h2 id="own" class="hp-section-title">Your own answer</h2>
		<p class="lede">
			A field under the choices takes an answer in a person’s own words. Typing in it clears the choice;
			choosing again keeps the text, and the app decides which one it sends.
		</p>
		<div class="column">
			<RadioGroup items={sourceItems} bind:value={source}>
				{#snippet legend()}How did you hear about us?{/snippet}
			</RadioGroup>
			<TextField
				label="Something else"
				autocomplete="off"
				bind:value={sourceOther}
				oninput={() => (source = '')}
			/>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">source = '{source}'</span> ·
			<span class="hp-mono">other = '{sourceOther}'</span>
		</p>
	</section>

	<section aria-labelledby="disabled">
		<h2 id="disabled" class="hp-section-title">Disabled</h2>
		<p class="lede">
			A question already answered: the whole group is disabled and keeps its choice, in the quieter
			<code>--border</code> and muted ink, its tag too. Below it, one choice that cannot be taken; the
			arrow keys skip it.
		</p>
		<div class="column">
			<RadioGroup items={planItems} value="team" disabled>
				{#snippet legend()}
					<span class="counter hp-num">1 / 3</span> Which plan suits your team?
				{/snippet}
			</RadioGroup>
			<RadioGroup label="Store files on" items={storageItems} bind:value={storage} />
		</div>
		<p class="value hp-caption"><span class="hp-mono">storage = '{storage}'</span></p>
	</section>

	<section aria-labelledby="error">
		<h2 id="error" class="hp-section-title">Error</h2>
		<p class="lede">
			Send the form without a choice: the error appears under the choices and the first radio takes
			focus. A choice clears the error.
		</p>
		<form class="column" novalidate onsubmit={submitBilling}>
			<RadioGroup
				label="Billing"
				items={billingItems}
				name="billing"
				required
				error={billingError}
				bind:value={billing}
				bind:ref={billingRef}
				onValueChange={() => (billingError = undefined)}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Continue</Button>
			</div>
			<p class="sent hp-dense" role="status">{billingSaved}</p>
		</form>
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

	/* One column at a width a form reads well at; groups and fields sit
	   more than twice as far apart as the rows in a group. */
	.column {
		display: grid;
		gap: var(--space-6);
		max-width: 424px;
	}
	.actions {
		display: flex;
	}

	/* The counter before a question, quieter than the question. */
	.counter {
		margin-right: var(--space-2);
		color: var(--muted);
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
</style>
