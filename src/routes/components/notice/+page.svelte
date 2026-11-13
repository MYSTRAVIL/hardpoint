<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import { Button, Notice } from '#lib';

	// A notice the user may close: the app removes it, and puts it back for the demo.
	let closable = $state(true);
	let showAgain = $state<HTMLElement | null>(null);
	async function close() {
		closable = false;
		// The notice had focus; give it to the control that replaces it.
		await Promise.resolve();
		showAgain?.focus();
	}

	// An offer that turns into its failed form. Turning it on fails here, so the
	// failed form can be seen; a real app changes it when its request fails.
	let offer = $state<'offer' | 'failed' | 'gone'>('offer');
	let startOver = $state<HTMLElement | null>(null);
	async function leave() {
		offer = 'gone';
		await Promise.resolve();
		startOver?.focus();
	}
</script>

<svelte:head>
	<title>Notice · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Notice</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A message in the page that the user should know about or act on. It stays until the app removes it. It
		has a title, text, or both, and up to two actions.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				A notice sits in the page flow, at the top of the view or next to what it is about. It is not a
				confirmation, which is a Toast that goes away on its own. It is not a whole view that failed to
				load, which is an ErrorState.
			</li>
			<li>
				The app shows and removes it. A notice stays while its cause stays: an update that is ready, a
				feature that is off, a trial that is ending. Give it <code>onclose</code> only when the user may
				dismiss it; the app then removes it and remembers that choice.
			</li>
			<li>
				<code>title</code> is a short line, as written, never caps. <code>titleAs</code> makes it a
				heading (<code>h2</code> to <code>h6</code>) where the notice names a region of the page;
				the default is a <code>p</code>. The text is the children: it may hold links and inline
				<code>code</code>, and stays in the reading width.
			</li>
			<li>
				<code>actions</code> takes the app’s Buttons. Use at most two, the primary one last, and at most
				one primary. A view shows one group of solid blocks, so a notice in a view that already has its
				solid group uses secondary or tertiary buttons.
			</li>
			<li>
				<code>tone</code> is <code>ok</code>, <code>warn</code> or <code>danger</code>. Without it the
				notice is neutral information. The tone changes the mark before the first line and nothing else:
				the words stay in the two inks.
			</li>
			<li>
				The box fills the width of its container. The app sets any narrower width. Hardpoint places no
				notice over the page for you; an app that floats one over content positions it itself, and the
				black fill keeps the text readable.
			</li>
			<li>
				<code>ref</code> binds the root <code>div</code>. <code>id</code>, <code>class</code>,
				<code>role</code> and other attributes go to it.
			</li>
		</ul>
	</section>

	<section aria-labelledby="tones">
		<h2 id="tones" class="hp-section-title">Tones</h2>
		<p class="lede">
			Neutral, ok, warn and danger. The mark is an outlined square: an “i”, a check, and a “!” for both
			warn and danger.
		</p>
		<div class="stack">
			<Notice title="Weekly summaries go out on Monday">
				Each summary lists what changed in your projects since the last one.
			</Notice>
			<Notice tone="ok" title="Backup finished">All 248 files are saved.</Notice>
			<Notice tone="warn" title="Your trial ends in 3 days">
				Choose a plan to keep your projects after the trial.
			</Notice>
			<Notice tone="danger" title="Couldn’t save the changes">
				Check your connection, then try again.
			</Notice>
		</div>
	</section>

	<section aria-labelledby="title-only">
		<h2 id="title-only" class="hp-section-title">Title only, with one action</h2>
		<p class="lede">
			With a title, no text and actions, the actions end the title row. They wrap under the title when
			they do not fit beside it (see the narrow column below).
		</p>
		<div class="stack">
			<Notice title="A new version is available">
				{#snippet actions()}
					<Button onclick={() => {}}>Reload</Button>
				{/snippet}
			</Notice>
			<Notice tone="warn" title="Offline: changes save when the connection returns" />
		</div>
	</section>

	<section aria-labelledby="text-only">
		<h2 id="text-only" class="hp-section-title">Text only</h2>
		<p class="lede">Without a title the mark sits on the first line of the text.</p>
		<div class="stack">
			<Notice>Exports are limited to 10,000 rows. Filter the table to export fewer.</Notice>
			<Notice tone="danger">The file is larger than 25 MB, so it was not uploaded.</Notice>
		</div>
	</section>

	<section aria-labelledby="full">
		<h2 id="full" class="hp-section-title">Title, text and two actions</h2>
		<p class="lede">
			The actions sit 12px under the text, 8px apart, the primary one last. The title may be a heading.
		</p>
		<div class="stack">
			<Notice title="Turn on weekly summaries" titleAs="h3">
				Get one email each Monday with what changed in your projects.
				{#snippet actions()}
					<Button variant="tertiary" onclick={() => {}}>Not now</Button>
					<Button variant="primary" onclick={() => {}}>Turn on</Button>
				{/snippet}
			</Notice>
			<Notice tone="warn" title="Sign in again">
				Your sign-in has expired, so changes are not being saved. Sign in to keep your work.
				{#snippet actions()}
					<Button onclick={() => {}}>Sign in</Button>
				{/snippet}
			</Notice>
		</div>
	</section>

	<section aria-labelledby="rich">
		<h2 id="rich" class="hp-section-title">A link and inline code in the text</h2>
		<p class="lede">
			Links take the text ink so they read as links in the muted text. Inline code stays in one piece and
			wraps inside its own box when it is wider than the line.
		</p>
		<div class="stack">
			<Notice title="Notifications are off">
				Your browser blocks them for this site. Allow them in the site settings, or set
				<code>notifications.enabled</code> to <code>true</code> in the config file.
				<a href="#rich">How to turn them on</a>
			</Notice>
		</div>
	</section>

	<section aria-labelledby="close">
		<h2 id="close" class="hp-section-title">With a close button</h2>
		<p class="lede">
			<code>onclose</code> adds a close button at the top end. It is a tertiary icon button, 36px with a
			mouse and 44px on touch. The notice does not remove itself: the app does, and moves focus on.
		</p>
		<div class="stack">
			{#if closable}
				<Notice title="Your trial ends in 3 days" tone="warn" onclose={close}>
					Choose a plan to keep your projects after the trial.
					{#snippet actions()}
						<Button onclick={() => {}}>Choose a plan</Button>
					{/snippet}
				</Notice>
				<Notice onclose={() => {}} closeLabel="Close this tip">
					Press <code>?</code> to see every keyboard shortcut.
				</Notice>
			{:else}
				<Button bind:ref={showAgain} onclick={() => (closable = true)}>Show the notices again</Button>
			{/if}
		</div>
	</section>

	<section aria-labelledby="live">
		<h2 id="live" class="hp-section-title">An offer that fails</h2>
		<p class="lede">
			A notice may change while it is on screen. Turning this on fails, so the text becomes an error
			and the actions become one: Close. The notice has <code>role="status"</code> from the start, so a
			screen reader reads the change.
		</p>
		<div class="stack">
			{#if offer === 'offer'}
				<Notice role="status" title="Turn on weekly summaries" onclose={leave}>
					Get one email each Monday with what changed in your projects.
					{#snippet actions()}
						<Button variant="tertiary" onclick={leave}>Not now</Button>
						<Button variant="primary" onclick={() => (offer = 'failed')}>Turn on</Button>
					{/snippet}
				</Notice>
			{:else if offer === 'failed'}
				<Notice role="status" tone="danger" title="Turn on weekly summaries">
					Couldn’t turn them on. Check your connection, then try again from the settings.
					{#snippet actions()}
						<Button onclick={leave}>Close</Button>
					{/snippet}
				</Notice>
			{:else}
				<Button bind:ref={startOver} onclick={() => (offer = 'offer')}>Show the offer again</Button>
			{/if}
		</div>
	</section>

	<section aria-labelledby="narrow">
		<h2 id="narrow" class="hp-section-title">In a narrow column</h2>
		<p class="lede">
			The box takes the width its container gives it. In a 20rem column the action no longer fits beside
			the title, so it wraps under it. The text never truncates.
		</p>
		<div class="narrow">
			<Notice title="A new version is available">
				{#snippet actions()}
					<Button onclick={() => {}}>Reload</Button>
				{/snippet}
			</Notice>
			<Notice tone="danger" title="Couldn’t save the changes, and nothing was lost" onclose={() => {}}>
				{#snippet actions()}
					<Button onclick={() => {}}>Try again</Button>
				{/snippet}
			</Notice>
			<Notice tone="warn" title="Sign in again" onclose={() => {}}>
				Your sign-in has expired. Sign in to keep your work.
				{#snippet actions()}
					<Button onclick={() => {}}>Sign in</Button>
				{/snippet}
			</Notice>
		</div>
	</section>

	<section aria-labelledby="a11y">
		<h2 id="a11y" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				A notice is not a live region by default. Pass the role that fits:
				<code>role="status"</code> for a notice that appears while the user is on the page and should
				be announced, <code>role="alert"</code> for an urgent one (danger), and
				<code>role="note"</code> for supplementary content that is there from the start.
			</li>
			<li>
				A live region must be in the page before its content changes, so a notice that changes its own
				text, like the offer above, has its role from the start.
			</li>
			<li>
				The mark is decorative and hidden from assistive technology. The words carry the status, so
				write them to: “Couldn’t save the changes”, not just a red square.
			</li>
			<li>
				The close button is named by <code>closeLabel</code> (default Dismiss). Give each one a name
				that says what it closes when a page shows several.
			</li>
			<li>
				The actions and the close button are 44px high on touch screens. Text is 16px on touch screens
				and 14px with a mouse. A notice has no motion: it appears and goes at once.
			</li>
		</ul>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'closeLabel', value: 'Dismiss', shows: 'The accessible name of the close button that onclose adds.' }
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

	code {
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

	.stack {
		display: grid;
		gap: var(--space-4);
		justify-items: start;
	}
	.stack > :global(.hp-notice) {
		justify-self: stretch;
	}

	.narrow {
		display: grid;
		gap: var(--space-4);
		max-width: 20rem;
	}
</style>
