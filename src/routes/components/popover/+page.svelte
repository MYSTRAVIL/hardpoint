<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import CheckboxGroup, { type CheckboxGroupItem } from '#lib/components/CheckboxGroup.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import KeyValueList, { type KeyValueItem } from '#lib/components/KeyValueList.svelte';
	import Popover from '#lib/components/Popover.svelte';

	// Filter
	const statuses: CheckboxGroupItem[] = [
		{ value: 'open', label: 'Open' },
		{ value: 'review', label: 'In review' },
		{ value: 'done', label: 'Done' },
		{ value: 'archived', label: 'Archived', hint: 'Hidden from the board.' }
	];
	let draft = $state<string[]>(['open', 'review']);
	let applied = $state<string[]>(['open', 'review']);

	// Details
	const file: KeyValueItem[] = [
		{ key: 'Size', value: '2.4 MB' },
		{ key: 'Type', value: 'Spreadsheet' },
		{ key: 'Owner', value: 'Mara Ilves' },
		{ key: 'Modified', value: '2026-11-08 14:32' },
		{ key: 'Shared with', value: 'Design team' }
	];
</script>

<svelte:head>
	<title>Popover · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Popover</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A small panel for details or a few quick settings next to the control that opened it. From 600px it is
		anchored to its trigger, and the page behind it is neither dimmed nor locked. Below 600px it opens as the
		bottom sheet that dialogs use: a close button, at most half the screen high, a swipe down to close.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>title</code> is required: the caps label at the top and the panel’s accessible name. On a phone
				it becomes the sheet’s title.
			</li>
			<li>
				<code>trigger</code> is a snippet that spreads <code>props</code> onto a button. The panel is anchored
				to it; <code>bind:open</code> also opens and closes it from code.
			</li>
			<li>
				A popover that was never opened mounts only its trigger, so a view can hold many. The panel mounts on
				the first open and stays mounted after it.
			</li>
			<li>
				<code>actions</code> renders an action row and receives <code>close</code>. With or without it, the
				panel closes on <kbd>Escape</kbd>, a press outside or its trigger, and on a phone also on the close
				button or a swipe down.
			</li>
			<li>
				Focus moves into the panel when it opens, <kbd>Tab</kbd> stays inside it, and focus returns to the
				trigger when it closes. Use a <a href="/components/dialog">dialog</a> for anything that needs an answer
				before the page goes on.
			</li>
			<li>
				Extra attributes go to the panel, with Bits UI’s placement props <code>side</code> (default
				<code>bottom</code>), <code>align</code> (default <code>start</code>) and <code>sideOffset</code>. The
				panel is as wide as its content, up to 360px. For another cap, give the Popover a class and set
				<code>--popover-width</code> in the app’s stylesheet:
				<code>.wide-popover &#123; --popover-width: 480px; &#125;</code>. A <code>style</code> passed to a
				Hardpoint component is applied through the CSSOM and also works under a strict Content Security Policy, but
				a <code>style</code> attribute on an element in the app’s own markup is blocked.
			</li>
		</ul>
	</section>

	<section aria-labelledby="filter">
		<h2 id="filter" class="hp-section-title">Quick settings</h2>
		<p class="lede">A few choices and two actions. The choices apply only when the primary action runs.</p>
		<div class="row">
			<Popover title="Filter tasks">
				{#snippet trigger({ props })}
					<Button {...props}>Filter</Button>
				{/snippet}
				<CheckboxGroup label="Status" items={statuses} bind:value={draft} />
				{#snippet actions({ close })}
					<Button onclick={() => (draft = [])}>Clear</Button>
					<Button
						variant="primary"
						onclick={() => {
							applied = [...draft];
							close();
						}}>Apply</Button
					>
				{/snippet}
			</Popover>
			<p class="hp-caption readout" aria-live="polite">
				status: <code>{applied.length ? applied.join(', ') : 'any'}</code>
			</p>
		</div>
	</section>

	<section aria-labelledby="details">
		<h2 id="details" class="hp-section-title">Details</h2>
		<p class="lede">Read-only content and no actions. The panel takes the width of its content, up to 360px.</p>
		<div class="row">
			<Popover title="File details">
				{#snippet trigger({ props })}
					<Button {...props}>File details</Button>
				{/snippet}
				<KeyValueList items={file} keyWidth="7rem" />
			</Popover>
		</div>
	</section>

	<section aria-labelledby="placement">
		<h2 id="placement" class="hp-section-title">Placement</h2>
		<p class="lede">
			Under the trigger and aligned to its start by default. <code>side</code> and <code>align</code> move it;
			when there is no room it flips to the other side or shifts to stay on screen. Below 600px every placement
			is a sheet.
		</p>
		<div class="row">
			<Popover title="Above" side="top">
				{#snippet trigger({ props })}
					<Button {...props}>Above</Button>
				{/snippet}
				<p>Opens above the trigger.</p>
			</Popover>
			<Popover title="Beside" side="right" align="center">
				{#snippet trigger({ props })}
					<Button {...props}>Beside</Button>
				{/snippet}
				<p>Opens to the right of the trigger.</p>
			</Popover>
			<Popover title="End aligned" align="end">
				{#snippet trigger({ props })}
					<Button {...props}>End aligned</Button>
				{/snippet}
				<p>Ends where the trigger ends.</p>
			</Popover>
		</div>
	</section>

	<section aria-labelledby="layers">
		<h2 id="layers" class="hp-section-title">Over a dialog</h2>
		<p class="lede">
			Popovers sit on <code>--layer-popover</code>, above dialogs, so one opened inside a dialog shows over it.
			<kbd>Escape</kbd> closes the popover first, then the dialog.
		</p>
		<div class="row">
			<Dialog title="Project settings" description="Website redesign.">
				{#snippet trigger({ props })}
					<Button {...props}>Project settings</Button>
				{/snippet}
				<div class="visibility">
					<p>Visible to the Web platform team.</p>
					<Popover title="Visibility">
						{#snippet trigger({ props })}
							<Button {...props} variant="tertiary">Who can see this</Button>
						{/snippet}
						<p>Members of the Web platform team can open the project. Owners can add other teams in Sharing.</p>
					</Popover>
				</div>
				{#snippet actions({ close })}
					<Button onclick={close}>Done</Button>
				{/snippet}
			</Dialog>
		</div>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
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
	.readout {
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	/* Content inside the dialog. */
	.visibility {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
	}
</style>
