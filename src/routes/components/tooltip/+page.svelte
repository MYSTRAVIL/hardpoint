<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';

	// Icon buttons
	const tools = [
		{ name: 'Copy link', path: 'M5 5h8v8H5zM3 11V3h8' },
		{ name: 'Download', path: 'M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10' },
		{ name: 'Archive', path: 'M2 3h12v3H2zM3 6v7h10V6M6.5 9h3' }
	];
	let lastTool = $state('');

	// A grouped toolbar
	const taskTools = [
		{ name: 'New task', path: 'M8 3v10M3 8h10' },
		{ name: 'Assign', path: 'M6 2h4v4H6zM3 14v-4h10v4' },
		{ name: 'Set due date', path: 'M2 4h12v10H2zM2 7h12M5 2v3M11 2v3' },
		{ name: 'Move to project', path: 'M2 3h5l1 2h6v8H2zM6 9h5M9 7l2 2-2 2' },
		{ name: 'Delete', path: 'M3 4h10M6 4V2h4v2M4 4v10h8V4' }
	];
	let lastTaskTool = $state('');

	// Shortened names
	const files = [
		{ name: 'Quarterly planning notes for the website redesign.docx', size: '84 KB' },
		{ name: 'Customer interview transcripts, round two.pdf', size: '1.2 MB' },
		{ name: 'Office move checklist, second floor, final version.xlsx', size: '36 KB' }
	];
	let lastFile = $state('');

	// Placement. The side samples come last, so a tooltip to the left has room
	// before the page edge.
	const sides = [
		{ name: 'Scroll to top', side: 'top', path: 'M8 13V3M4 7l4-4 4 4' },
		{ name: 'Scroll to bottom', side: 'bottom', path: 'M8 3v10M4 9l4 4 4-4' },
		{ name: 'Previous page', side: 'left', path: 'M13 8H3M7 4 3 8l4 4' },
		{ name: 'Next page', side: 'right', path: 'M3 8h10M9 4l4 4-4 4' }
	] as const;

	// Over a dialog
	let copied = $state(false);
</script>

<svelte:head>
	<title>Tooltip · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Tooltip</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A few words over a control, for mouse and keyboard users. A mouse pointer resting on the control opens it after
		a moment; keyboard focus opens it at once. It never opens on touch, so its text always has another path: the
		control shows it, or carries it in its accessible name.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>text</code> is required: plain text, as written, never caps. Keep it to a few words. Never put the
				only explanation of a control, or anything to press, in a tooltip; use a hint under the field or a
				<a href="/components/popover">popover</a>.
			</li>
			<li>
				<code>trigger</code> is a snippet that spreads <code>props</code> onto the control. The control keeps its
				own <code>onclick</code>, written before or after the spread. A control with its own description sets
				<code class="nowrap">aria-describedby</code> after the spread to <code class="nowrap">props['aria-describedby']</code> and its own id,
				joined by a space, so screen readers get both.
			</li>
			<li>
				A pointer that rests for 700ms opens it (<code>delayDuration</code> changes that); focus from the keyboard
				opens it at once, with the same short fade. The pointer can move onto the tooltip without closing it.
				<kbd>Escape</kbd>, moving the pointer away, moving focus away or pressing the control closes it. One
				tooltip shows at a time: opening one closes any other.
			</li>
			<li>
				On touch a tap runs the control’s action and opens nothing. Below, the samples show the two ways to keep
				the text reachable there: an icon button names itself in <code class="nowrap">aria-label</code> with the same text, and a
				shortened name shows in full on touch screens.
			</li>
			<li>
				Extra attributes go to the tooltip, with Bits UI’s placement props <code>side</code> (default
				<code>top</code>), <code>align</code> (default <code>center</code>) and <code>sideOffset</code>. It is as wide
				as its text, up to 280px. For another cap, give the Tooltip a class and set <code>--tooltip-width</code> in the
				app’s stylesheet: <code>.wide-tooltip &#123; --tooltip-width: 360px; &#125;</code>. A
				<code>style</code> passed to a Hardpoint component is applied through the CSSOM and also works under a strict
				Content Security Policy, but a <code>style</code> attribute on an element in the app’s own markup is blocked.
			</li>
		</ul>
	</section>

	<section aria-labelledby="icons">
		<h2 id="icons" class="hp-section-title">Icon buttons</h2>
		<p class="lede">
			The tooltip shows the button’s name; <code class="nowrap">aria-label</code> carries the same text for screen readers. A
			tooltip that repeats the name does not also describe the button, so screen readers read the name once. On a
			phone only the icon shows, so keep icon-only buttons to icons people know.
		</p>
		<div class="row">
			<div class="toolbar">
				{#each tools as t (t.name)}
					<Tooltip text={t.name}>
						{#snippet trigger({ props })}
							<Button {...props} icon variant="tertiary" aria-label={t.name} onclick={() => (lastTool = t.name)}>
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d={t.path} /></svg>
							</Button>
						{/snippet}
					</Tooltip>
				{/each}
			</div>
			<p class="hp-caption readout" aria-live="polite">
				pressed: <code>{lastTool || 'none'}</code>
			</p>
		</div>
	</section>

	<section aria-labelledby="toolbars">
		<h2 id="toolbars" class="hp-section-title">Toolbars</h2>
		<p class="lede">
			Wrap a row of icon buttons in <code>TooltipGroup</code>: the first tooltip waits the delay, and the next ones
			open at once as the pointer moves along the row, until 300ms pass with none open. Above, each tooltip waits
			the full delay. The group renders no element, so the row keeps its own markup; <code>delayDuration</code> and
			<code>skipDelayDuration</code> on the group set the two times.
		</p>
		<div class="row">
			<TooltipGroup>
				<div class="toolbar">
					{#each taskTools as t (t.name)}
						<Tooltip text={t.name}>
							{#snippet trigger({ props })}
								<Button {...props} icon variant="tertiary" aria-label={t.name} onclick={() => (lastTaskTool = t.name)}>
									<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d={t.path} /></svg>
								</Button>
							{/snippet}
						</Tooltip>
					{/each}
				</div>
			</TooltipGroup>
			<p class="hp-caption readout" aria-live="polite">
				pressed: <code>{lastTaskTool || 'none'}</code>
			</p>
		</div>
	</section>

	<section aria-labelledby="files">
		<h2 id="files" class="hp-section-title">Shortened names</h2>
		<p class="lede">
			With a mouse, long names end in an ellipsis and the tooltip shows the whole name. The button’s text is the
			whole name, so screen readers read all of it, and on touch screens the names wrap instead of shortening.
		</p>
		<ul class="files">
			{#each files as f (f.name)}
				<li>
					<Tooltip text={f.name} side="top" align="start">
						{#snippet trigger({ props })}
							<button type="button" class="file" onclick={() => (lastFile = f.name)} {...props}>{f.name}</button>
						{/snippet}
					</Tooltip>
					<span class="size">{f.size}</span>
				</li>
			{/each}
		</ul>
		<p class="hp-caption readout" aria-live="polite">
			opened: <code>{lastFile || 'none'}</code>
		</p>
	</section>

	<section aria-labelledby="placement">
		<h2 id="placement" class="hp-section-title">Placement</h2>
		<p class="lede">
			Above the control by default. <code>side</code> and <code>align</code> move it; when there is no room it flips
			to the other side or shifts to stay on screen.
		</p>
		<div class="row">
			{#each sides as s (s.name)}
				<Tooltip text={s.name} side={s.side}>
					{#snippet trigger({ props })}
						<Button {...props} icon aria-label={s.name}>
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d={s.path} /></svg>
						</Button>
					{/snippet}
				</Tooltip>
			{/each}
		</div>
	</section>

	<section aria-labelledby="layers">
		<h2 id="layers" class="hp-section-title">Over a dialog</h2>
		<p class="lede">
			Tooltips sit on <code class="nowrap">--layer-tooltip</code>, above dialogs, popovers and menus. <kbd>Escape</kbd> closes the
			tooltip first, then the dialog.
		</p>
		<div class="row">
			<Dialog title="Share project" description="Website redesign.">
				{#snippet trigger({ props })}
					<Button {...props}>Share project</Button>
				{/snippet}
				<div class="share">
					<code class="link">projects.example/website-redesign</code>
					<Tooltip text="Copy link">
						{#snippet trigger({ props })}
							<Button {...props} icon aria-label="Copy link" onclick={() => (copied = true)}>
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M5 5h8v8H5zM3 11V3h8" /></svg>
							</Button>
						{/snippet}
					</Tooltip>
				</div>
				<p class="hp-caption readout" aria-live="polite">{copied ? 'Link copied.' : ''}</p>
				{#snippet actions({ close })}
					<Button onclick={close}>Done</Button>
				{/snippet}
			</Dialog>
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
	/* A code sample that must not break at its hyphens. */
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

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-6);
	}
	/* Icon buttons 8px apart. */
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.readout {
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	/* A narrow file column: names, then sizes. */
	.files {
		display: grid;
		gap: var(--space-2);
		max-width: 20rem;
		margin: 0 0 var(--space-3);
		padding: 0;
		list-style: none;
	}
	.files li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-4);
	}
	.file {
		display: block;
		box-sizing: border-box;
		width: 100%;
		min-height: var(--control-height);
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		font: inherit;
		text-align: start;
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.3em;
		cursor: pointer;
		touch-action: manipulation;
	}
	/* Touch screens show the whole name; a mouse gets the ellipsis and the
	   tooltip. */
	@media (pointer: fine) {
		.file {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	}
	.size {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	/* Content inside the dialog. */
	.share {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.link {
		font-family: var(--mono);
		overflow-wrap: anywhere;
	}
</style>
