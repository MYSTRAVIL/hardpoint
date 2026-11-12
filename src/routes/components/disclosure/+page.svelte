<script lang="ts">
	import Disclosure from '#lib/components/Disclosure.svelte';
	import TextField from '#lib/components/TextField.svelte';

	// Stacked
	let shippingOpen = $state(true);

	// A field inside
	let contactOpen = $state(false);
	let email = $state('');

	const longParagraphs = [
		'Every plan starts with a short call. We agree on the goal, the people involved and the date the work should end.',
		'In the first week we collect what already exists: documents, spreadsheets, old emails and notes. Nothing needs tidying first.',
		'In the second week we sort it into three piles. Keep as it is, rewrite, and drop. You see the piles before we touch anything.',
		'Rewrites happen in small batches. Each batch goes to one reviewer, who has two working days to answer. Silence counts as a yes.',
		'Once a batch is approved, it moves to the shared folder and the old copy moves to the archive. The archive keeps every version for two years.',
		'We hold a short review every Friday. It covers what moved, what is stuck and what needs a decision. It never runs longer than twenty minutes.',
		'If a batch stays stuck for more than a week, we pick one person to decide. The others can disagree in writing, and we keep their notes.',
		'At the end we hand over a plain index of everything: where it lives, who owns it and when it was last changed.',
		'Questions at any point go to the project channel. Someone answers within one working day.',
		'After handover we check in once, a month later, to see what held up and what did not.'
	];
</script>

<svelte:head>
	<title>Disclosure · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Disclosure</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		One expandable section: a full-width row with a title and a chevron, and content that shows when the row
		opens. The height snaps open and the text fades in. Closing cuts. It is a single section, not an accordion:
		each one opens and closes on its own.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>title</code> is required: the trigger’s text, as written. It never takes caps, because it is
				often a sentence. A long title wraps and never truncates.
			</li>
			<li>
				<code>bind:open</code> reads and sets the state. It starts closed; <code>open</code> in the markup
				starts it open. Pass <code>disabled</code> to lock it in its current state.
			</li>
			<li>
				The children are the content: any markup, including form fields and links. Their padding is the
				disclosure’s; the content starts 4px under the row and ends 12px above whatever follows.
			</li>
			<li>
				<code>titleAs</code> (<code>h2</code> to <code>h6</code>) wraps the trigger in a heading, so the
				section shows in a screen reader’s heading list. Pick the level the page’s outline needs. Leave it out
				when the title is not a heading, such as a row inside a form.
			</li>
			<li>
				Stacked disclosures sit 8px apart with no lines between them; the rows and their text edge give the
				structure. <code>class</code>, <code>id</code>, <code>aria-*</code>, <code>data-*</code> and
				<code>onOpenChange</code> go to the root; <code>ref</code> binds it.
			</li>
			<li>
				The row’s hover tint and focus contour reach 16px (8px on phones) past the text edge, as table bands
				do, so the title keeps the page edge. Inside a container with no side padding, set
				<code class="nowrap">--bleed: 0px</code> on the container.
			</li>
		</ul>
	</section>

	<section aria-labelledby="stack">
		<h2 id="stack" class="hp-section-title">Stacked</h2>
		<p class="lede">
			Three sections with their titles as level 3 headings under this level 2 heading. The first starts open
			and shows at once, with no fade. The third is disabled: it stays closed and the row reads as off.
		</p>
		<div class="stack">
			<Disclosure title="Shipping" titleAs="h3" bind:open={shippingOpen}>
				<p class="text">
					Orders leave the warehouse within two working days. Delivery takes three to five days after
					that, depending on where you live.
				</p>
			</Disclosure>
			<Disclosure title="Returns" titleAs="h3">
				<p class="text">
					You can send anything back within 30 days. Keep the original packaging, and add the slip from
					the box. We refund the full price when the parcel arrives.
				</p>
			</Disclosure>
			<Disclosure title="Gift wrapping" titleAs="h3" disabled>
				<p class="text">Gift wrapping is not offered for this order.</p>
			</Disclosure>
		</div>
		<p class="hp-caption readout" aria-live="polite">Shipping is {shippingOpen ? 'open' : 'closed'}.</p>
	</section>

	<section aria-labelledby="field">
		<h2 id="field" class="hp-section-title">A field inside</h2>
		<p class="lede">
			Focus stays on the row when it opens. <kbd>Tab</kbd> then moves into the field, and the contour shows on
			the field, not the row. This one has no heading: the title is a step in a form, not a part of the page’s
			outline.
		</p>
		<div class="stack">
			<Disclosure title="Contact details" bind:open={contactOpen}>
				<div class="field">
					<TextField label="Email" type="email" autocomplete="email" bind:value={email} hint="We only write about this order." />
				</div>
			</Disclosure>
		</div>
		<p class="hp-caption readout" aria-live="polite">
			{contactOpen ? 'Open' : 'Closed'}, email: <code>{email || 'empty'}</code>
		</p>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long content</h2>
		<p class="lede">
			The height snaps to the full length at once, so the page below jumps by that amount, and the text then
			fades in. Closing cuts back. Content that long reads better on its own page; use a disclosure for a
			passage a reader may skip.
		</p>
		<div class="stack">
			<Disclosure title="How a project runs, from the first call to the handover" titleAs="h3">
				<div class="prose">
					{#each longParagraphs as p (p)}
						<p class="text">{p}</p>
					{/each}
				</div>
			</Disclosure>
		</div>
	</section>

	<section aria-labelledby="motion">
		<h2 id="motion" class="hp-section-title">Motion</h2>
		<ul class="notes">
			<li>
				<strong>Opening.</strong> The height does not animate: the box is at its final size on the first frame.
				The content fades from 0 to full opacity over <code>--dur-expand</code> (120ms) on
				<code>--settle</code>. The user chose this on 2026-11-11.
			</li>
			<li>
				<strong>Closing.</strong> The content and its height go in the same frame. A fade still running when
				the row closes is cancelled.
			</li>
			<li>
				<strong>First render.</strong> A disclosure that starts open shows at once, with no fade. Only a change
				after that fades.
			</li>
			<li>
				<strong>The chevron.</strong> It turns 180° to point up while the section is open: <code>--dur-pop</code>
				opening and <code>--dur-pop-exit</code> closing, as the select’s does. Under reduced motion it jumps.
			</li>
			<li>
				<strong>Reduced motion.</strong> The fade changes only opacity, so it still runs. The chevron does not
				turn.
			</li>
			<li>
				<strong>Tuning.</strong> The duration and the curve are read from the element when the section opens, so
				a value retuned on <code>&lt;html&gt;</code> applies at once.
			</li>
		</ul>
	</section>

	<section aria-labelledby="find">
		<h2 id="find" class="hp-section-title">Find in page</h2>
		<p class="lede">
			Closed content stays in the page as <code>hidden="until-found"</code>. In a browser that supports it,
			the browser’s find command searches the closed text, and a match opens the section. Try finding
			“refund” with the section above closed. A browser without it treats the content as plainly hidden: find
			skips it, and the row is the only way in.
		</p>
	</section>

	<section aria-labelledby="a11y">
		<h2 id="a11y" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				The row is a <code>&lt;button&gt;</code> with <code>aria-expanded</code> and
				<code>aria-controls</code>, which points at the content’s id. This is the WAI disclosure pattern.
				<kbd>Enter</kbd> and <kbd>Space</kbd> toggle it.
			</li>
			<li>
				With <code>titleAs</code> the button sits inside the heading, never the other way round, so the
				heading reads as the section’s name and the button keeps its role.
			</li>
			<li>
				A disabled row is a disabled button: it leaves the tab order and announces as dimmed.
			</li>
			<li>
				The row is 44px tall on touch screens and the height of a control (<code>--control-height</code>) with a
				mouse. The focus contour is the shared one from <code>base.css</code>.
			</li>
			<li>
				Closed content is not in the accessibility tree. Content that starts open is, from the first render.
			</li>
		</ul>
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
	.nowrap {
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

	/* Stacked disclosures: a column the width of a reading line. */
	.stack {
		max-width: var(--measure);
	}
	.text {
		max-width: var(--measure);
		margin: 0;
		color: var(--muted);
	}
	.prose {
		display: grid;
		gap: var(--space-3);
	}
	.field {
		max-width: 28rem;
		padding-top: var(--space-2);
	}
	.readout {
		margin-top: var(--space-3);
		color: var(--muted);
		overflow-wrap: anywhere;
	}
</style>
