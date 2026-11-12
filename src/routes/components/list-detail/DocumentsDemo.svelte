<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import KeyValueList from '#lib/components/KeyValueList.svelte';
	import ListDetail, { type ListDetailBreakpoint } from '#lib/components/ListDetail.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { documents, folders, type Doc } from './documents';

	type Props = {
		splitFrom?: ListDetailBreakpoint;
		/** The level of the folder headings and the document title, under the page's own headings. */
		headingTag?: 'h2' | 'h3';
		class?: string;
	};
	let { splitFrom = 'expanded', headingTag = 'h2', class: className }: Props = $props();

	let docs = $state<Doc[]>([...documents]);
	let query = $state('');
	let draftTitle = $state('');
	let draftError = $state('');
	let made = 0;

	let root = $state<HTMLDivElement | null>(null);
	let nav = $state<HTMLElement | null>(null);
	let newButton = $state<HTMLElement | null>(null);
	let title = $state<HTMLElement | null>(null);
	let draftField = $state<HTMLInputElement | null>(null);

	// The open document lives in the history entry (SvelteKit's page.state),
	// so the browser's Back and the phone's back gesture close it. Outside
	// SvelteKit: history.pushState on open and a popstate listener.
	const openId = $derived(page.state.listDetail ?? null);
	const openDoc = $derived(docs.find((d) => d.id === openId));

	const groups = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return folders
			.map((folder) => ({
				folder,
				docs: docs.filter((d) => d.folder === folder && (!q || d.title.toLowerCase().includes(q)))
			}))
			.filter((g) => g.docs.length > 0);
	});

	/**
	 * Opens a document, or the new-document form for `new`. Opening from the
	 * list adds a history entry; switching documents side by side replaces
	 * it, so one Back always returns to the list.
	 */
	async function open(id: string) {
		if (id !== openId) {
			await goto(page.url.href, { state: { listDetail: id }, shallow: true, replace: openId !== null });
			await tick();
			// A new document starts at its top.
			root?.querySelector('.hp-list-detail-detail')?.scrollTo(0, 0);
		}
		// The app moves focus into the detail itself: the title, or the
		// form's first field. ListDetail leaves focus where the app put it.
		(id === 'new' ? draftField : title)?.focus({ preventScroll: true });
	}

	function close() {
		history.back();
	}

	// Back on the list, focus goes to the item that was open, or to New after
	// a draft. Runs for the back control and for the browser's Back alike.
	let lastOpen: string | null = untrack(() => openId);
	$effect(() => {
		const id = openId;
		untrack(() => {
			const was = lastOpen;
			lastOpen = id;
			if (was === null || id !== null) return;
			tick().then(() => {
				const item = was === 'new' ? newButton : nav?.querySelector<HTMLElement>(`[data-id="${was}"]`);
				item?.focus();
			});
		});
	});

	async function create(e: SubmitEvent) {
		e.preventDefault();
		const name = draftTitle.trim();
		if (!name) {
			draftError = 'Enter a title for the document.';
			draftField?.focus();
			return;
		}
		made += 1;
		const doc: Doc = {
			id: `draft-${made}`,
			folder: 'Drafts',
			title: name,
			owner: 'You',
			modified: '2026-11-11',
			words: 0,
			body: ['This document is empty. Its text goes here.']
		};
		docs = [doc, ...docs];
		draftTitle = '';
		draftError = '';
		await goto(page.url.href, { state: { listDetail: doc.id }, shallow: true, replace: true });
		await tick();
		title?.focus({ preventScroll: true });
	}
</script>

{#snippet back()}
	<Button variant="tertiary" icon class="back" aria-label="Back to documents" onclick={close}>
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true">
			<path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" />
		</svg>
	</Button>
{/snippet}

<ListDetail bind:ref={root} class={className} {splitFrom} showDetail={openId !== null}>
	{#snippet list()}
		<div class="list">
			<search class="list-head">
				<TextField label="Filter" type="search" bind:value={query} autocomplete="off" enterkeyhint="search" />
				<Button bind:ref={newButton} opens onclick={() => open('new')}>New</Button>
			</search>
			<nav bind:this={nav} class="groups" aria-label="Documents">
				{#each groups as group (group.folder)}
					<section class="group" aria-label={group.folder}>
						<svelte:element this={headingTag} class="group-name">{group.folder}</svelte:element>
						<ul class="items">
							{#each group.docs as doc (doc.id)}
								<li>
									<button
										type="button"
										class="item hp-focus-inset"
										data-id={doc.id}
										aria-current={doc.id === openId ? 'true' : undefined}
										onclick={() => open(doc.id)}
									>
										<span class="item-title hp-dense">{doc.title}</span>
										<span class="item-meta hp-mono">{doc.modified}</span>
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{:else}
					<EmptyState title="No matches" description="No document title contains “{query.trim()}”.">
						{#snippet action()}
							<Button onclick={() => (query = '')}>Clear filter</Button>
						{/snippet}
					</EmptyState>
				{/each}
			</nav>
		</div>
	{/snippet}

	{#snippet detail({ stacked })}
		{#if openId === 'new'}
			<form class="detail" onsubmit={create} novalidate>
				<div class="detail-head">
					{#if stacked}{@render back()}{/if}
					<svelte:element this={headingTag} class="title hp-page-title">New document</svelte:element>
				</div>
				<TextField
					label="Title"
					bind:value={draftTitle}
					bind:ref={draftField}
					error={draftError || undefined}
					autocomplete="off"
					enterkeyhint="done"
				/>
				<div class="form-actions">
					<Button type="submit" variant="primary">Create</Button>
					<Button variant="tertiary" onclick={close}>Cancel</Button>
				</div>
			</form>
		{:else if openDoc}
			<article class="detail">
				<div class="detail-head">
					{#if stacked}{@render back()}{/if}
					<svelte:element this={headingTag} bind:this={title} class="title hp-page-title" tabindex="-1">
						{openDoc.title}
					</svelte:element>
				</div>
				<KeyValueList
					items={[
						{ key: 'Folder', value: openDoc.folder },
						{ key: 'Owner', value: openDoc.owner },
						{ key: 'Modified', value: openDoc.modified },
						{ key: 'Words', value: openDoc.words.toLocaleString('en') }
					]}
				/>
				<div class="body">
					{#each openDoc.body as text, i (i)}
						<p>{text}</p>
					{/each}
				</div>
			</article>
		{:else}
			<EmptyState
				titleAs={headingTag}
				title="No document open"
				description="Choose a document from the list to read it here."
			/>
		{/if}
	{/snippet}
</ListDetail>

<style>
	/* ---- List ------------------------------------------------------- */

	.list {
		display: grid;
		gap: var(--space-6);
	}

	/* The filter fills the row; New sits at the end, level with the well. */
	.list-head {
		display: flex;
		align-items: flex-end;
		gap: var(--space-2);
	}
	.list-head > :global(.hp-text-field) {
		flex: 1 1 auto;
	}
	.list-head > :global(.hp-button) {
		flex: none;
	}

	/* Folders apart by twice the space inside one (visual rule 9). */
	.groups {
		display: grid;
		gap: var(--space-6);
	}
	.group {
		display: grid;
		gap: var(--space-2);
	}
	/* A folder's name is the user's, so it stays as written. */
	.group-name {
		color: var(--muted);
		font-size: var(--type-caption);
		line-height: 18px;
	}
	.items {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* A whole row is the target. Its tint reaches --bleed into the gutter, so
	   the text keeps the page edge, as on a table row. */
	.item {
		display: grid;
		gap: var(--space-1);
		box-sizing: border-box;
		width: calc(100% + 2 * var(--bleed));
		min-height: var(--hit-target);
		margin: 0 calc(-1 * var(--bleed));
		padding: var(--space-2) var(--bleed);
		border: 0;
		background: transparent;
		color: var(--text);
		text-align: start;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.item-meta {
		color: var(--muted);
		font-size: var(--type-caption);
		line-height: 18px;
	}

	/* The open document: the selection mark. It snaps. Hover and press
	   never darken it. */
	.item[aria-current='true'] {
		background: var(--surface-selected);
		box-shadow: inset 3px 0 0 var(--accent);
	}
	@media (hover: hover) and (pointer: fine) {
		.item:not([aria-current='true']):hover {
			background: var(--surface-hover);
		}
	}
	.item:not([aria-current='true']):active {
		background: var(--surface-raised);
	}

	/* ---- Detail ----------------------------------------------------- */

	.detail {
		display: grid;
		gap: var(--space-6);
	}

	/* The back control's glyph keeps the page edge; its box reaches into
	   the gutter, as the shell's menu button does. */
	.detail-head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}
	.detail-head > :global(.back) {
		flex: none;
		margin-left: calc((var(--space-4) - var(--control-height)) / 2);
	}
	.title {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	/* Focus lands on the title only from the app's code, when a document
	   opens: no contour, since the title is not a control. */
	.title:focus {
		outline: none;
	}

	.body {
		display: grid;
		gap: var(--space-4);
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
</style>
