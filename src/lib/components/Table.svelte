<script lang="ts" module>
	/** A status hue: `ok` done, `warn` waiting or needs you, `danger` failed. */
	export type TableMark = 'ok' | 'warn' | 'danger';

	/** `plain` (default): no row dividers. `ruled`: 1px dividers, for long dense tables. */
	export type TableVariant = 'plain' | 'ruled';

	/** Breakpoints a column can hide below: 900px (`expanded`) or 1200px (`large`). */
	export type TableBreakpoint = 'expanded' | 'large';

	export type Column<Row> = {
		/** The row field this column shows. Also the column's identity. */
		key: keyof Row & string;
		/** The caps column label in the header band and in the stacked list. */
		label: string;
		/** Text alignment. Defaults to `start`. */
		align?: 'start' | 'end';
		/** Right-aligned tabular numbers. */
		numeric?: boolean;
		/**
		 * Any CSS width for the column's `<col>`, such as `calc(10ch + 24px)` or
		 * `12%`. Columns without one share the rest. To change a width by
		 * breakpoint, pass a custom property (`var(--w-name)`) and set it in
		 * the page's media queries.
		 */
		width?: string;
		/** Hide the column below 900px (`expanded`) or 1200px (`large`). */
		hideBelow?: TableBreakpoint;
		/**
		 * A square status mark before the value, in that status's hue. The
		 * mark hangs left of the text, so marked and unmarked values keep the
		 * same text edge. Colour only where the value means that status.
		 */
		mark?: (row: Row) => TableMark | undefined;
	};

	/** The stacked list on compact widths: one title, two or three key-value lines. */
	export type TableStack<Row> = {
		title: keyof Row & string;
		fields: (keyof Row & string)[];
	};
</script>

<script lang="ts" generics="Row">
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useMotion } from '../motion/index.js';

	type Key = keyof Row & string;

	let {
		rows,
		columns,
		key,
		label,
		variant = 'plain',
		selected,
		rowHref,
		stack,
		total,
		totalLabel = 'Total',
		cell,
		empty,
		footer,
		class: className,
		...rest
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		rows: Row[];
		columns: Column<Row>[];
		/** The row field that identifies a row: keys the rows and matches `selected`. */
		key: Key;
		/** The table's accessible name. */
		label: string;
		variant?: TableVariant;
		/** The key of the current row: a 3px titanium edge and the selected tint. */
		selected?: Row[Key];
		/** Makes each whole row one link to this address. */
		rowHref?: (row: Row) => string;
		/**
		 * Compact widths show a stacked list. Defaults to the first column as
		 * the title and the next three as key-value lines.
		 */
		stack?: TableStack<Row>;
		/** The count after the caps TOTAL label in the footer row. */
		total?: number;
		totalLabel?: string;
		/** Renders one cell, in the table and in the stacked list. Default: the value. */
		cell?: Snippet<[{ row: Row; column: Column<Row>; value: Row[Key] }]>;
		/** Shown under the header band when there are no rows. */
		empty?: Snippet;
		/** The footer row's end, beside the total: pagination goes here. */
		footer?: Snippet;
	} = $props();

	const stackTitle = $derived(
		columns.find((column) => column.key === (stack?.title ?? columns[0]?.key)) ?? columns[0]
	);
	const stackFields = $derived(
		stack
			? stack.fields
					.map((field) => columns.find((column) => column.key === field))
					.filter((column) => column !== undefined)
			: columns.slice(1, 4)
	);

	const isSelected = (row: Row) => selected !== undefined && row[key] === selected;

	const cellAttrs = (column: Column<Row>) => ({
		'data-align': column.numeric || column.align === 'end' ? 'end' : undefined,
		'data-numeric': column.numeric ? '' : undefined,
		'data-mark': column.mark ? '' : undefined,
		'data-hide-below': column.hideBelow
	});

	// Expressive stagger (motion rule 7): only the rows of the first render
	// enter, by their index. New rows from filtering, sorting or paging never
	// do, so any change to `rows` ends the entrance, and so does its last
	// animation (a kept row would replay it when a sort moves it).
	const motion = useMotion();
	const firstRows = untrack(() => rows);
	let entering = $state.raw<Map<Row[Key], number> | null>(
		untrack(() => (motion.expressive ? new Map(rows.map((row, i) => [row[key], i])) : null))
	);
	let root: HTMLDivElement;

	$effect.pre(() => {
		if (rows !== firstRows) entering = null;
	});

	onMount(() => {
		if (!entering) return;
		const running = root
			.getAnimations({ subtree: true })
			.filter((a) => a instanceof CSSAnimation && a.animationName === 'hp-enter');
		Promise.allSettled(running.map((a) => a.finished)).then(() => {
			entering = null;
		});
	});
</script>

{#snippet content(row: Row, column: Column<Row>)}
	{#if column.mark}
		<span class="marked" data-tone={column.mark(row)}>{@render cellValue(row, column)}</span>
	{:else}
		{@render cellValue(row, column)}
	{/if}
{/snippet}

{#snippet cellValue(row: Row, column: Column<Row>)}
	{#if cell}{@render cell({ row, column, value: row[column.key] })}{:else}{row[column.key]}{/if}
{/snippet}

{#snippet item(row: Row)}
	<span class="item-title">{@render content(row, stackTitle)}</span>
	<dl class="item-fields">
		{#each stackFields as column (column.key)}
			<div>
				<dt class="hp-label">{column.label}</dt>
				<dd data-mark={column.mark ? '' : undefined}>{@render content(row, column)}</dd>
			</div>
		{/each}
	</dl>
{/snippet}

<div {...rest} bind:this={root} class={['hp-table', className]} data-variant={variant}>
	<!-- Medium and up: one header band, mono rows. -->
	<table class="grid" aria-label={label}>
		<colgroup>
			{#each columns as column (column.key)}
				<col style:width={column.width} data-hide-below={column.hideBelow} />
			{/each}
		</colgroup>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th class="hp-label" scope="col" {...cellAttrs(column)}>{column.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row[key])}
				<tr
					class={[entering?.has(row[key]) && 'hp-enter']}
					style:--i={entering?.get(row[key])}
					data-selected={isSelected(row) ? '' : undefined}
					aria-current={isSelected(row) ? 'true' : undefined}
				>
					{#each columns as column, c (column.key)}
						<td {...cellAttrs(column)}>
							{#if c === 0 && rowHref}
								<a class="row-link" href={rowHref(row)}>{@render content(row, column)}</a>
							{:else}
								{@render content(row, column)}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Compact: a stacked list; one title, key-value lines, the whole item the target. -->
	{#if rows.length > 0}
		<ul class="stack" aria-label={label}>
			{#each rows as row (row[key])}
				<li
					class={[entering?.has(row[key]) && 'hp-enter']}
					style:--i={entering?.get(row[key])}
					data-selected={isSelected(row) ? '' : undefined}
					aria-current={isSelected(row) ? 'true' : undefined}
				>
					{#if rowHref}
						<a class="item" href={rowHref(row)}>{@render item(row)}</a>
					{:else}
						<div class="item">{@render item(row)}</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else if empty}
		<div class="empty">{@render empty()}</div>
	{/if}

	{#if total !== undefined || footer}
		<div class="foot">
			{#if total !== undefined}
				<p class="total">
					<span class="hp-label">{totalLabel}</span>
					<span class="figure">{total}</span>
				</p>
			{/if}
			{@render footer?.()}
		</div>
	{/if}
</div>

<style>
	/* ---- Table: medium and up ---------------------------------------- */

	/* The band and the row tints reach --bleed past the text edge. */
	.grid {
		width: calc(100% + 2 * var(--bleed));
		margin-inline: calc(-1 * var(--bleed));
		border-collapse: collapse;
		table-layout: fixed;
		font-family: var(--mono);
		font-size: var(--type-body);
		line-height: 24px;
	}
	@media (pointer: fine) {
		.grid {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	th,
	td {
		padding: 0 var(--space-6) 0 0;
		overflow: hidden;
		text-align: start;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	th:first-child,
	td:first-child {
		padding-left: var(--bleed);
	}
	th:last-child,
	td:last-child {
		padding-right: var(--bleed);
	}
	[data-align='end'] {
		text-align: end;
	}
	[data-numeric] {
		font-variant-numeric: tabular-nums;
	}

	/* The one band. It pins under the shell's header row. */
	thead th {
		position: sticky;
		top: calc(var(--header-height) + env(safe-area-inset-top));
		z-index: var(--layer-sticky);
		height: 36px;
		background: var(--surface-band);
		color: var(--text);
	}
	/* Space between the band and the first row, not a line. */
	tbody::before {
		content: '';
		display: table-row;
		height: var(--space-2);
	}

	tbody tr {
		position: relative;
	}
	tbody td {
		height: var(--control-height);
	}

	/* The first cell's link covers the row, so the whole row is the
	   target; its focus contour is drawn inside the row. */
	.row-link {
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}
	.row-link::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.row-link:focus-visible {
		outline: none;
	}
	.row-link:focus-visible::after {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}

	/* Hover on pointer devices, press for links. Hover and press never
	   darken a selected row. */
	@media (hover: hover) and (pointer: fine) {
		tbody tr:not([data-selected]):hover {
			background: var(--surface-hover);
		}
	}
	tbody tr:not([data-selected]):has(.row-link):active {
		background: var(--surface-hover);
	}

	/* Selection: a 3px titanium edge and the tint, text unchanged. */
	tbody tr[data-selected] {
		background: var(--surface-selected);
	}
	tr[data-selected] td:first-child {
		box-shadow: inset 3px 0 0 var(--accent);
	}

	/* Ruled: 1px dividers between rows, drawn as shadows so the pitch
	   stays even. */
	[data-variant='ruled'] tbody tr + tr td {
		box-shadow: inset 0 1px 0 var(--border);
	}
	[data-variant='ruled'] tbody tr + tr[data-selected] td:first-child {
		box-shadow:
			inset 3px 0 0 var(--accent),
			inset 0 1px 0 var(--border);
	}

	/* A marked column leaves room before its text for the mark. */
	th[data-mark],
	td[data-mark] {
		padding-left: var(--space-4);
	}

	@media (max-width: 899px) {
		[data-hide-below='expanded'] {
			display: none;
		}
	}
	@media (max-width: 1199px) {
		[data-hide-below='large'] {
			display: none;
		}
	}

	/* ---- Status mark ---------------------------------------------------- */

	/* An 8px square in the status hue, hanging left of the word so every
	   value keeps the column's text edge. */
	.marked[data-tone]::before {
		content: '';
		display: inline-block;
		width: 8px;
		height: 8px;
		margin: 0 var(--space-2) 0 calc(-1 * var(--space-4));
		vertical-align: 1px;
	}
	.marked[data-tone='ok']::before {
		background: var(--ok);
	}
	.marked[data-tone='warn']::before {
		background: var(--warn);
	}
	.marked[data-tone='danger']::before {
		background: var(--danger);
	}

	/* ---- Stacked list: compact ---------------------------------------- */

	.stack {
		display: none;
		margin: 0 calc(-1 * var(--bleed));
		padding: 0;
		list-style: none;
	}
	@media (max-width: 599px) {
		.grid {
			display: none;
		}
		.stack {
			display: grid;
		}
	}

	.item {
		display: grid;
		gap: var(--space-2);
		min-height: var(--hit-target);
		padding: var(--space-3) var(--bleed);
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}
	.item:focus-visible {
		outline-offset: -2px;
	}
	.item-title {
		font-weight: 500;
	}
	/* One label column per item, at least 72px; a longer label widens it
	   for every line of the item, so the values keep one edge. */
	.item-fields {
		display: grid;
		grid-template-columns: minmax(72px, max-content) minmax(0, 1fr);
		gap: 2px var(--space-3);
		font-family: var(--mono);
	}
	.item-fields div {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: baseline;
	}
	.item-fields dt {
		color: var(--muted);
	}
	.item-fields dd {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* The mark hangs into the gap before the value. */
	.item-fields dd[data-mark] {
		overflow: visible;
	}

	@media (hover: hover) and (pointer: fine) {
		.stack li:not([data-selected]) .item:hover {
			background: var(--surface-hover);
		}
	}
	.stack li:not([data-selected]) a.item:active {
		background: var(--surface-hover);
	}
	.stack li[data-selected] {
		background: var(--surface-selected);
		box-shadow: inset 3px 0 0 var(--accent);
	}

	[data-variant='ruled'] .stack li + li {
		box-shadow: inset 0 1px 0 var(--border);
	}
	[data-variant='ruled'] .stack li + li[data-selected] {
		box-shadow:
			inset 3px 0 0 var(--accent),
			inset 0 1px 0 var(--border);
	}

	/* ---- Empty state ---------------------------------------------------- */

	.empty {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		padding: var(--space-8) 0;
	}

	/* ---- Footer row: total, then the page's footer (pagination) -------- */

	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4) var(--space-8);
		margin-top: var(--space-8);
	}
	/* Without a total, the footer (pagination) still ends the row. */
	.foot:not(:has(> .total)) {
		justify-content: flex-end;
	}
	.total {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}
	.figure {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
	}
</style>
