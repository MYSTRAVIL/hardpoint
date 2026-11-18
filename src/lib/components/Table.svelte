<script lang="ts" module>
	/** A status hue: `ok` done, `warn` waiting or needs you, `danger` failed. */
	export type TableMark = 'ok' | 'warn' | 'danger';

	/** `plain` (default): no row dividers. `ruled`: 1px dividers, for long dense tables. */
	export type TableVariant = 'plain' | 'ruled';

	/** Breakpoints a column can hide below: 900px (`expanded`) or 1200px (`large`). */
	export type TableBreakpoint = 'expanded' | 'large';

	/** A sort order, in the words of `aria-sort`. */
	export type TableSortDirection = 'ascending' | 'descending';

	/**
	 * The column the rows are sorted by, and the order. Table shows it and
	 * reports changes; the app puts `rows` in that order.
	 */
	export type TableSort<Row> = {
		key: keyof Row & string;
		direction: TableSortDirection;
	};

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
		 * the page's media queries. In a `wide` table the values of a column
		 * with a width wrap inside it; without one they stay on one line.
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
		/**
		 * Makes this row's mark pulse slowly, as Status `live` does: work in
		 * progress. It needs a `mark` that returns a hue for the row. The
		 * pulse holds still (the mark stays lit) under reduced motion and
		 * while the app sets `<Motion paused>`; an app that shows a live
		 * mark also offers a visible control that sets it.
		 */
		markLive?: (row: Row) => boolean;
		/**
		 * The header label becomes a button that sorts by this column, and
		 * the stacked list gets a sort select. The first press sorts in
		 * `sortFirst` order, the next ones reverse it. Table reports the sort
		 * through `bind:sort`; the app reorders `rows`.
		 */
		sortable?: boolean;
		/** The order a first press on this header sorts in. Defaults to `ascending`. */
		sortFirst?: TableSortDirection;
		/**
		 * What the column means, as written. A button after the header label
		 * shows it in a popover (a sheet on compact widths); the stacked list
		 * lists the descriptions of its fields behind one button.
		 */
		description?: string;
	};

	/** The stacked list on compact widths: one title, two or three key-value lines. */
	export type TableStack<Row> = {
		title: keyof Row & string;
		fields: (keyof Row & string)[];
	};
</script>

<script lang="ts" generics="Row">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Motion, useMotion } from '../motion/index.js';
	import Button from './Button.svelte';
	import NativeSelect, { type NativeSelectItem } from './NativeSelect.svelte';
	import Popover from './Popover.svelte';
	import { fadeIn } from './internal/fade-in.js';

	type Key = keyof Row & string;

	const uid = $props.id();

	let {
		rows,
		columns,
		key,
		label,
		variant = 'plain',
		selected,
		muted,
		rowHref,
		stack,
		total,
		totalLabel = 'Total',
		sort = $bindable(),
		wide = false,
		detail,
		expanded = $bindable([]),
		sortLabel = 'Sort',
		unsortedLabel = 'Unsorted',
		ascendingLabel = 'ascending',
		descendingLabel = 'descending',
		aboutLabel = 'About',
		aboutColumnsLabel = 'About the columns',
		expandLabel = 'Details',
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
		/**
		 * Shows a row de-emphasised, in `--muted`: its text and everything in
		 * it that draws in `--text` (a Chip, a Status label, a link). Status
		 * marks keep their hue.
		 */
		muted?: (row: Row) => boolean;
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
		/**
		 * The column the rows are sorted by, and the order. Bindable: a press
		 * on a sortable header, or the sort select on compact widths, sets it.
		 * Table never reorders `rows`; the app sorts them, and pages them,
		 * from this value.
		 */
		sort?: TableSort<Row>;
		/**
		 * A data grid. Cells keep their natural width and never truncate; the
		 * table scrolls sideways inside a focusable group, with a sticky
		 * first column and a scroll edge, and on compact widths it scrolls
		 * too instead of stacking.
		 */
		wide?: boolean;
		/**
		 * Content under a row, across the table's width, such as a nested
		 * Table. Each row gets a button that shows and hides it.
		 */
		detail?: Snippet<[{ row: Row }]>;
		/** The keys of the rows whose detail shows. Bindable. */
		expanded?: Row[Key][];
		/** The caps label of the sort select on compact widths. */
		sortLabel?: string;
		/** The sort select's choice while no sortable column orders the rows. */
		unsortedLabel?: string;
		/** After a column label in the sort select: "Size, ascending". */
		ascendingLabel?: string;
		/** After a column label in the sort select: "Size, descending". */
		descendingLabel?: string;
		/** Before a column label in its description button's name: "About Size". */
		aboutLabel?: string;
		/** The button, and its sheet's title, that lists the column descriptions on compact widths. */
		aboutColumnsLabel?: string;
		/** The expand button's name, before the row's title: "Details quarterly-report.pdf". */
		expandLabel?: string;
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
		'data-hide-below': column.hideBelow,
		'data-wrap': wide && column.width ? '' : undefined
	});

	// ---- Sorting: Table reports, the app orders --------------------------

	const sortColumns = $derived(columns.filter((column) => column.sortable));
	const headControls = $derived(columns.some((column) => column.sortable || column.description));
	const directionOf = (column: Column<Row>) => (sort?.key === column.key ? sort.direction : undefined);
	const reverse = (direction: TableSortDirection) => (direction === 'ascending' ? 'descending' : 'ascending');

	/** A press on a header: a new column starts at its `sortFirst`, the sorted one reverses. */
	function sortBy(column: Column<Row>) {
		const current = directionOf(column);
		sort = { key: column.key, direction: current ? reverse(current) : (column.sortFirst ?? 'ascending') };
	}

	// The compact sort select: each sortable column in both orders, its
	// first order first. While no sortable column orders the rows, a first
	// choice says so.
	const sortedColumn = $derived(sortColumns.find((column) => column.key === sort?.key));
	const sortItems = $derived<NativeSelectItem[]>([
		...(sortedColumn ? [] : [{ value: '', label: unsortedLabel }]),
		...sortColumns.flatMap((column) => {
			const first = column.sortFirst ?? 'ascending';
			return [first, reverse(first)].map((direction) => ({
				value: `${direction} ${column.key}`,
				label: `${column.label}, ${direction === 'ascending' ? ascendingLabel : descendingLabel}`
			}));
		})
	]);
	const sortValue = $derived(sortedColumn && sort ? `${sort.direction} ${sort.key}` : '');
	function chooseSort(value: string | undefined) {
		const at = value ? value.indexOf(' ') : -1;
		if (!value || at < 0) return;
		sort = { direction: value.slice(0, at) as TableSortDirection, key: value.slice(at + 1) as Key };
	}

	// The stacked list shows only its title and fields, so it lists only
	// their descriptions.
	const aboutColumns = $derived(
		[stackTitle, ...stackFields].filter(
			(column, i, all) => column?.description && all.findIndex((c) => c?.key === column.key) === i
		)
	);

	// ---- Expandable rows ----------------------------------------------------

	const isExpanded = (row: Row) => expanded.includes(row[key]);
	function toggle(row: Row) {
		const k = row[key];
		expanded = expanded.includes(k) ? expanded.filter((e) => e !== k) : [...expanded, k];
	}
	// Grid (g) and stacked list (s) both render; each part has an id per view.
	const partId = (part: 'button' | 'title' | 'detail', view: 'g' | 's', i: number) => `${uid}-${view}${part[0]}${i}`;
	// A detail renders in the view that shows, never in both: its content
	// may carry ids or state of its own. A wide table never stacks.
	const stacked = new MediaQuery('max-width: 599px', false);
	const detailIn = $derived<'g' | 's'>(!wide && stacked.current ? 's' : 'g');

	// As on Disclosure: a detail that opens after the first render shows at
	// its full height at once and fades in over --dur-expand; closing removes
	// it in the same frame. A row that arrives already expanded (paging,
	// filtering, a sort) shows at once, because only keys new to `expanded`
	// fade. Opacity only, so it also runs under reduced motion.
	let shownKeys = new Set(untrack(() => expanded));
	$effect(() => {
		const now = new Set(expanded);
		const added = [...now].filter((k) => !shownKeys.has(k));
		shownKeys = now;
		if (!added.length) return;
		untrack(() => {
			for (const k of added) {
				const i = rows.findIndex((row) => row[key] === k);
				if (i < 0) continue;
				for (const view of ['g', 's'] as const) {
					const body = document.getElementById(partId('detail', view, i));
					if (body) fadeIn(body, '--dur-expand');
				}
			}
		});
	});

	// ---- Wide: the scroll region and its edges ------------------------------

	let scroller = $state<HTMLDivElement>();
	let scrolls = $state(false);
	let hiddenStart = $state(false);
	let hiddenEnd = $state(false);

	function measure() {
		if (!scroller) return;
		const { scrollWidth, clientWidth } = scroller;
		const left = Math.abs(scroller.scrollLeft);
		scrolls = scrollWidth > clientWidth + 1;
		hiddenStart = left > 0.5;
		hiddenEnd = left + clientWidth < scrollWidth - 1;
	}

	$effect(() => {
		if (!scroller) return;
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
		return () => observer.disconnect();
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
		<span
			class="marked"
			data-tone={column.mark(row)}
			data-live={column.markLive?.(row) ? '' : undefined}
			data-paused={column.markLive?.(row) && motion.paused ? '' : undefined}
		>{@render cellValue(row, column)}</span>
	{:else}
		{@render cellValue(row, column)}
	{/if}
{/snippet}

{#snippet cellValue(row: Row, column: Column<Row>)}
	{#if cell}{@render cell({ row, column, value: row[column.key] })}{:else}{row[column.key]}{/if}
{/snippet}

<!-- The expand button. Its name is `expandLabel` and the row's title
     (aria-labelledby: itself, then the title), so each row's button says
     which row it opens. aria-controls names the detail while it shows. -->
{#snippet expandButton(row: Row, view: 'g' | 's', i: number)}
	{@const open = isExpanded(row)}
	<button
		type="button"
		class="expand hp-table-expand"
		id={partId('button', view, i)}
		aria-label={expandLabel}
		aria-labelledby="{partId('button', view, i)} {partId('title', view, i)}"
		aria-expanded={open}
		aria-controls={open ? partId('detail', view, i) : undefined}
		onclick={() => toggle(row)}
	></button>
{/snippet}

<!-- The detail renders in the quiet tier: it opens on a press, so a nested
     Table or list never staggers in. -->
{#snippet detailBody(row: Row, view: 'g' | 's', i: number)}
	<div class="detail-body hp-table-detail" id={partId('detail', view, i)}>
		<Motion tier="quiet">{@render detail?.({ row })}</Motion>
	</div>
{/snippet}

{#snippet firstContent(row: Row, column: Column<Row>, i: number)}
	{#if rowHref}
		<a class="row-link" href={rowHref(row)} id={detail ? partId('title', 'g', i) : undefined}
			>{@render content(row, column)}</a
		>
	{:else if detail}
		<span id={partId('title', 'g', i)}>{@render content(row, column)}</span>
	{:else}
		{@render content(row, column)}
	{/if}
{/snippet}

<!-- A description: a button after the label opens it in a Popover (a
     sheet on compact widths), so a press, a key or a tap reaches it, and a
     screen reader finds a named button. A tooltip alone fails on touch. -->
{#snippet about(column: Column<Row>)}
	<Popover title={column.label}>
		{#snippet trigger({ props })}
			<button {...props} type="button" class="about" aria-label="{aboutLabel} {column.label}"></button>
		{/snippet}
		<p class="about-text">{column.description}</p>
	</Popover>
{/snippet}

{#snippet item(row: Row, i: number)}
	<span class="item-title" id={detail ? partId('title', 's', i) : undefined}>{@render content(row, stackTitle)}</span>
	<dl class="item-fields" data-marked={stackFields.some((column) => column.mark) ? '' : undefined}>
		{#each stackFields as column (column.key)}
			<div>
				<dt class="hp-label">{column.label}</dt>
				<dd data-mark={column.mark ? '' : undefined}>{@render content(row, column)}</dd>
			</div>
		{/each}
	</dl>
{/snippet}

{#snippet grid()}
	<table class="grid" aria-label={label} data-expandable={detail ? '' : undefined}>
		<colgroup>
			{#each columns as column (column.key)}
				<col style:width={column.width} data-hide-below={column.hideBelow} />
			{/each}
		</colgroup>
		<thead data-controls={headControls ? '' : undefined}>
			<tr>
				{#each columns as column (column.key)}
					{#if column.sortable || column.description}
						{@const end = column.numeric || column.align === 'end'}
						<th
							class="hp-label"
							scope="col"
							aria-sort={directionOf(column)}
							data-controls=""
							{...cellAttrs(column)}
						>
							<span class="head">
								{#if column.description && end}{@render about(column)}{/if}
								{#if column.sortable}
									<button
										type="button"
										class="sort"
										data-direction={directionOf(column)}
										onclick={() => sortBy(column)}
									>
										<span class="head-label">{column.label}</span><span class="sort-mark" aria-hidden="true"
										></span>
									</button>
								{:else}
									<span class="head-label">{column.label}</span>
								{/if}
								{#if column.description && !end}{@render about(column)}{/if}
							</span>
						</th>
					{:else}
						<th class="hp-label" scope="col" {...cellAttrs(column)}>{column.label}</th>
					{/if}
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (row[key])}
				{@const open = detail !== undefined && isExpanded(row)}
				<tr
					class={[entering?.has(row[key]) && 'hp-enter']}
					style:--i={entering?.get(row[key])}
					data-selected={isSelected(row) ? '' : undefined}
					data-muted={muted?.(row) ? '' : undefined}
					data-expanded={open ? '' : undefined}
					aria-current={isSelected(row) ? 'true' : undefined}
				>
					{#each columns as column, c (column.key)}
						<td {...cellAttrs(column)} style:min-width={wide && c > 0 ? column.width : undefined}>
							{#if c > 0}
								{@render content(row, column)}
							{:else}
								{#if detail}{@render expandButton(row, 'g', i)}{/if}
								{#if wide}
									<div class="lead" style:--lead-width={column.width}>{@render firstContent(row, column, i)}</div>
								{:else}
									{@render firstContent(row, column, i)}
								{/if}
							{/if}
						</td>
					{/each}
				</tr>
				{#if open && detailIn === 'g'}
					<tr class="detail">
						<td colspan={columns.length}>{@render detailBody(row, 'g', i)}</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
{/snippet}

<div {...rest} bind:this={root} class={['hp-table', className]} data-variant={variant} data-wide={wide ? '' : undefined}>
	{#if wide}
		<!-- A data grid: it scrolls sideways inside a named group, which takes
		     focus while it scrolls, so arrow keys move it. A group, not a region:
		     a wide table inside a Section of the same name is one landmark. -->
		<div class="frame" data-overflow-start={hiddenStart ? '' : undefined} data-overflow-end={hiddenEnd ? '' : undefined}>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="scroller"
				role="group"
				aria-label={label}
				tabindex={scrolls ? 0 : undefined}
				bind:this={scroller}
				onscroll={measure}
			>
				{@render grid()}
			</div>
		</div>
		{#if rows.length === 0 && empty}
			<div class="empty">{@render empty()}</div>
		{/if}
	{:else}
		<!-- Compact, stacked list only: the sort select and the column
		     descriptions, which live in the header band from 600px. -->
		{#if rows.length > 0 && (sortColumns.length > 0 || aboutColumns.length > 0)}
			<div class="tools">
				{#if sortColumns.length > 0}
					<NativeSelect
						label={sortLabel}
						labelBeside
						items={sortItems}
						bind:value={() => sortValue, chooseSort}
					/>
				{/if}
				{#if aboutColumns.length > 0}
					<Popover title={aboutColumnsLabel}>
						{#snippet trigger({ props })}
							<Button {...props} variant="tertiary">{aboutColumnsLabel}</Button>
						{/snippet}
						<dl class="about-list">
							{#each aboutColumns as column (column?.key)}
								<div>
									<dt class="hp-label">{column?.label}</dt>
									<dd>{column?.description}</dd>
								</div>
							{/each}
						</dl>
					</Popover>
				{/if}
			</div>
		{/if}

		<!-- Medium and up: one header band, mono rows. -->
		{@render grid()}

		<!-- Compact: a stacked list; one title, key-value lines, the whole item the target. -->
		{#if rows.length > 0}
			<ul class="stack" aria-label={label} data-expandable={detail ? '' : undefined}>
				{#each rows as row, i (row[key])}
					<li
						class={[entering?.has(row[key]) && 'hp-enter']}
						style:--i={entering?.get(row[key])}
						data-selected={isSelected(row) ? '' : undefined}
						data-muted={muted?.(row) ? '' : undefined}
						data-expanded={detail && isExpanded(row) ? '' : undefined}
						aria-current={isSelected(row) ? 'true' : undefined}
					>
						{#if rowHref}
							<a class="item" href={rowHref(row)}>{@render item(row, i)}</a>
						{:else}
							<div class="item">{@render item(row, i)}</div>
						{/if}
						{#if detail}
							{@render expandButton(row, 's', i)}
							{#if detailIn === 's' && isExpanded(row)}{@render detailBody(row, 's', i)}{/if}
						{/if}
					</li>
				{/each}
			</ul>
		{:else if empty}
			<div class="empty">{@render empty()}</div>
		{/if}
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

	/* The one band. It pins under the shell's header row, and it is one
	   fill on the thead: with a sticky cell each, a cell edge at a
	   fractional pixel on a 2x screen could leave a 1px gap of canvas
	   between two cells. */
	thead {
		position: sticky;
		top: calc(var(--header-height) + env(safe-area-inset-top));
		z-index: var(--layer-sticky);
		background: var(--surface-band);
	}
	thead th {
		height: 36px;
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
	   darken a selected row, and a row's detail takes neither. */
	@media (hover: hover) and (pointer: fine) {
		tbody tr:not([data-selected]):not(.detail):hover {
			background: var(--surface-hover);
		}
	}
	tbody tr:not([data-selected]):not(.detail):has(.row-link):active {
		background: var(--surface-hover);
	}

	/* Selection: a 3px titanium edge and the tint, text unchanged. */
	tbody tr[data-selected] {
		background: var(--surface-selected);
	}
	tr[data-selected] td:first-child {
		box-shadow: inset 3px 0 0 var(--accent);
	}

	/* A muted row: --text becomes --muted for the row, the way
	   [data-density] scopes a token, so a Chip, a Status label and a link in
	   it follow. Inherited text takes the colour directly, because body's
	   `color` was computed from --text once. Focus (--focus), the selected
	   edge (--accent), the tints and the status marks are other tokens and
	   stay as they are. The detail row is a sibling and keeps its ink. */
	tbody tr[data-muted],
	.stack > li[data-muted] > .item {
		--text: var(--muted);
		color: var(--muted);
	}

	/* Ruled: 1px dividers between rows, drawn as shadows so the pitch
	   stays even. A row and its detail share one block, so no divider
	   between them. Child combinators keep the rule off a Table nested in
	   a detail, which has its own variant. */
	[data-variant='ruled'] > .grid > tbody > tr + tr:not(.detail) > td,
	[data-variant='ruled'] > .frame > .scroller > .grid > tbody > tr + tr:not(.detail) > td {
		box-shadow: inset 0 1px 0 var(--border);
	}
	[data-variant='ruled'] > .grid > tbody > tr + tr[data-selected] > td:first-child,
	[data-variant='ruled'] > .frame > .scroller > .grid > tbody > tr + tr[data-selected] > td:first-child {
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

	/* A live mark pulses like Status `live`: opacity 1 to 0.4 over
	   --dur-pulse. Off while paused and under reduced motion, where the
	   mark stays lit. */
	@media (prefers-reduced-motion: no-preference) {
		.marked[data-live]:not([data-paused])::before {
			animation: pulse var(--dur-pulse) ease-in-out infinite;
		}
	}
	@keyframes pulse {
		50% {
			opacity: 0.4;
		}
	}

	/* ---- Header controls: sort buttons and descriptions ------------------ */

	/* A band with buttons in it is a control's height: 36px with a mouse,
	   44px on touch, so each button's hit area fits inside it. */
	thead[data-controls] > tr > th {
		height: max(36px, var(--control-height));
	}
	/* The label truncates inside its button instead of the cell clipping,
	   so a focus contour can reach past the cell's edge. */
	th[data-controls] {
		overflow: visible;
	}
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
	}
	/* End-aligned columns put the label last, so it keeps the column's
	   text edge above the figures: the description button comes first in
	   the markup, so focus follows what the eye sees, and the sort mark
	   moves before the label. */
	th[data-align='end'] > .head {
		justify-content: flex-end;
	}
	th[data-align='end'] .sort {
		flex-direction: row-reverse;
	}
	/* The padding keeps the hover underline inside the box that clips the
	   truncated label. */
	.head-label {
		min-width: 0;
		padding-block: var(--space-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The label is the button: the band's caps, no fill. The mark after it
	   is a pair of muted triangles while the column is not sorted, and one
	   triangle in the label's colour, pointing the order's way, while it
	   is. Nothing moves when the order changes. */
	.sort {
		display: inline-flex;
		flex: 0 1 auto;
		align-items: center;
		gap: var(--space-2);
		min-width: var(--hit-target);
		max-width: 100%;
		min-height: var(--hit-target);
		padding: 0;
		border: 0;
		background: none;
		text-align: inherit;
		text-transform: inherit;
		font-weight: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.sort:focus-visible {
		outline-offset: 2px;
	}
	.sort-mark {
		display: grid;
		flex: none;
		gap: 2px;
		width: 8px;
	}
	.sort-mark::before,
	.sort-mark::after {
		content: '';
		height: 4px;
		background: var(--muted);
	}
	.sort-mark::before {
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
	}
	.sort-mark::after {
		clip-path: polygon(0 0, 100% 0, 50% 100%);
	}
	.sort[data-direction='ascending'] > .sort-mark::before,
	.sort[data-direction='descending'] > .sort-mark::after {
		background: currentColor;
	}
	.sort[data-direction='ascending'] > .sort-mark::after,
	.sort[data-direction='descending'] > .sort-mark::before {
		visibility: hidden;
	}
	/* Hover underlines the label, as on a tertiary Button; a press does the
	   same, so touch sees it at once. */
	@media (hover: hover) and (pointer: fine) {
		.sort:hover > .head-label {
			text-decoration: underline;
			text-decoration-thickness: 1px;
			text-underline-offset: 0.3em;
		}
	}
	.sort:active > .head-label {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.3em;
	}

	/* The description button takes its 16px icon in the column's layout,
	   and no more. Its --hit-target square comes from ::before, centred on
	   the mark and drawn over the gap and the cell's padding. The icon is
	   ::after. Colour: --muted, the label's colour on hover, on a press
	   and while its popover is open. */
	.about {
		position: relative;
		display: block;
		flex: none;
		width: 16px;
		height: 16px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.about::after {
		content: '';
		position: absolute;
		inset: 0;
		background-color: currentColor;
		mask: var(--status-mark) center / 16px 16px no-repeat;
	}
	.about::before {
		content: '';
		position: absolute;
		top: 50%;
		height: max(100%, var(--hit-target));
		translate: 0 -50%;
		inset-inline: calc(-1 * (var(--hit-target) - 16px) / 2);
	}
	/* The target is centred on the mark, so the gap to the label opens to
	   half of what the target adds: 4px with a mouse (24px target), 14px on
	   touch (44px target). The target then stops where the label's button
	   begins, and on the other side it ends in the cell's padding (24px). */
	th:not([data-align='end']) .about {
		margin-inline-start: calc((var(--hit-target) - 16px) / 2 - var(--space-1));
	}
	th[data-align='end'] .about {
		margin-inline-end: calc((var(--hit-target) - 16px) / 2 - var(--space-1));
	}
	@media (hover: hover) and (pointer: fine) {
		.about:hover {
			color: var(--text);
		}
	}
	.about:active,
	.about[aria-expanded='true'] {
		color: var(--text);
	}
	.about:focus-visible {
		outline-offset: 2px;
	}
	.about-text {
		font-family: var(--sans);
	}

	/* ---- Expandable rows ------------------------------------------------- */

	/* The first column moves its text past the expand button, header
	   included, so the band label and the values keep one edge. */
	.grid[data-expandable] > thead > tr > th:first-child,
	.grid[data-expandable] > tbody > tr:not(.detail) > td:first-child {
		padding-left: calc(var(--bleed) + var(--hit-target) + var(--space-2));
	}
	.grid[data-expandable] > thead > tr > th:first-child[data-mark],
	.grid[data-expandable] > tbody > tr:not(.detail) > td:first-child[data-mark] {
		padding-left: calc(var(--bleed) + var(--hit-target) + var(--space-2) + var(--space-4));
	}

	/* The select chevron, as on Disclosure: it points down while the detail
	   is hidden and turns up while it shows, with the list's timing, and
	   does not turn under reduced motion. The button sits above the row
	   link, so a row can link and expand: the button opens the detail, the
	   rest of the row follows the link. */
	.expand {
		position: absolute;
		top: calc((var(--control-height) - var(--hit-target)) / 2);
		inset-inline-start: var(--bleed);
		z-index: 1;
		display: grid;
		place-items: center;
		width: var(--hit-target);
		height: var(--hit-target);
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.expand::before {
		content: '';
		width: 16px;
		height: 16px;
		background-color: currentColor;
		mask: var(--select-chevron) center / 16px 16px no-repeat;
		transition: transform var(--dur-pop-exit) var(--settle);
	}
	.expand[aria-expanded='true']::before {
		transform: rotate(180deg);
		transition-duration: var(--dur-pop);
	}
	@media (prefers-reduced-motion: reduce) {
		.expand::before {
			transition: none;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.expand:hover {
			color: var(--text);
		}
	}
	.expand:active {
		color: var(--text);
	}
	.expand:focus-visible {
		outline-offset: -2px;
	}

	/* The detail spans the row, below it, in reading type. Its content
	   starts under the first column's text, past the button, and space
	   below it parts it from the next row. */
	.grid > tbody > tr.detail > td {
		height: auto;
		padding: 0;
		overflow: visible;
		white-space: normal;
	}
	.detail-body {
		font-family: var(--sans);
		font-size: var(--type-body);
		line-height: 1.5;
		text-align: start;
	}
	.grid > tbody > tr.detail > td > .detail-body {
		padding: var(--space-1) var(--bleed) var(--space-6)
			calc(var(--bleed) + var(--hit-target) + var(--space-2));
	}
	/* The detail of a selected row is part of it. */
	.grid > tbody > tr[data-selected] + tr.detail {
		background: var(--surface-selected);
	}
	.grid > tbody > tr[data-selected] + tr.detail > td {
		box-shadow: inset 3px 0 0 var(--accent);
	}
	/* A Table nested in a detail keeps its band in place: two bands pinned
	   under the header would cover each other. */
	.detail-body .grid > thead {
		position: static;
	}

	/* ---- Wide: a data grid that scrolls sideways ------------------------- */

	/* The frame takes the bleed, so the band and the tints still reach past
	   the text edge, and draws the end edge while columns are hidden past
	   it. The scroller is a size container, so a row link and a detail can
	   be as wide as the visible part. */
	.frame {
		position: relative;
		margin-inline: calc(-1 * var(--bleed));
	}
	.frame[data-overflow-end]::after {
		content: '';
		position: absolute;
		inset-block: 0;
		inset-inline-end: 0;
		z-index: 2;
		width: 1px;
		background: var(--border);
		pointer-events: none;
	}
	.scroller {
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-x: contain;
		container-type: inline-size;
	}
	@media (pointer: fine) {
		.scroller {
			scrollbar-width: thin;
		}
	}
	.scroller:focus-visible {
		outline-offset: 2px;
	}

	/* Natural widths: at least the region's width, wider when the values
	   need it. Values never truncate. A column without a width keeps its
	   values on one line; a column with one wraps them inside it. */
	.scroller > .grid {
		width: 100%;
		margin-inline: 0;
		table-layout: auto;
	}
	.scroller > .grid > * > tr > th,
	.scroller > .grid > * > tr > td {
		overflow: visible;
		text-overflow: clip;
	}
	.scroller > .grid > tbody > tr > td[data-wrap] {
		white-space: normal;
	}
	/* A row that wraps grows; a one-line row keeps the pitch. Values sit on
	   the first line's place, so a tall row reads from its top. */
	.scroller > .grid > tbody > tr:not(.detail) > td {
		height: auto;
		padding-block: calc((var(--control-height) - 1lh) / 2);
		vertical-align: top;
	}

	/* The region is the band's scroll container, so the band stays at the
	   top of the table instead of pinning under the header. The first
	   column stays at the start; an opaque fill hides what scrolls under
	   it, and it follows the row's hover, press and selection. */
	.scroller > .grid > thead {
		position: static;
	}
	.scroller > .grid > thead > tr > th:first-child {
		position: sticky;
		background: var(--surface-band);
		top: auto;
		inset-inline-start: 0;
		z-index: 1;
	}
	.scroller > .grid > tbody > tr:not(.detail) > td:first-child {
		position: sticky;
		inset-inline-start: 0;
		z-index: 1;
		background-color: var(--canvas);
	}
	@media (hover: hover) and (pointer: fine) {
		.scroller > .grid > tbody > tr:not([data-selected]):not(.detail):hover > td:first-child {
			background-color: var(--surface-hover);
		}
	}
	.scroller > .grid > tbody > tr:not([data-selected]):not(.detail):has(.row-link):active > td:first-child {
		background-color: var(--surface-hover);
	}
	.scroller > .grid > tbody > tr[data-selected] > td:first-child {
		background-color: var(--surface-selected);
	}
	/* Scrolled: a 1px edge where the columns go under the first one. */
	.frame[data-overflow-start] > .scroller > .grid > * > tr:not(.detail) > :first-child {
		background-image: linear-gradient(var(--border), var(--border));
		background-position: right top;
		background-size: 1px 100%;
		background-repeat: no-repeat;
	}

	/* The first column takes its text's width, up to half the region (or
	   its own width, if smaller), padding and expand button included, and
	   wraps after that, so on a phone the other columns keep room to
	   scroll through. --lead-inset is the cell's padding. */
	.scroller > .grid {
		--lead-inset: calc(var(--bleed) + var(--space-6));
	}
	.scroller > .grid[data-expandable] {
		--lead-inset: calc(var(--bleed) + var(--hit-target) + var(--space-2) + var(--space-6));
	}
	.lead {
		width: max-content;
		max-width: calc(min(var(--lead-width, 50cqi), 50cqi) - var(--lead-inset));
		white-space: normal;
		overflow-wrap: anywhere;
	}
	/* The row link covers what shows of the row: from the sticky cell
	   across the region's width. */
	.scroller > .grid > tbody > tr > td > .lead > .row-link::after {
		inset-inline-end: auto;
		width: 100cqi;
	}
	/* A detail stays in view while the columns scroll under it. */
	.scroller > .grid > tbody > tr.detail > td > .detail-body {
		position: sticky;
		inset-inline-start: 0;
		width: 100cqi;
	}

	/* ---- Stacked list: compact ---------------------------------------- */

	.stack {
		display: none;
		margin: 0 calc(-1 * var(--bleed));
		padding: 0;
		list-style: none;
	}
	.tools {
		display: none;
	}
	/* The tertiary button's label keeps the page edge when it wraps to its
	   own line; its hover tint reaches into the bleed. */
	.tools :global(.hp-button) {
		margin-inline-start: calc(-1 * var(--space-3));
	}
	@media (max-width: 599px) {
		.grid {
			display: none;
		}
		.stack {
			display: grid;
		}
		/* A wide table scrolls instead of stacking. */
		.scroller > .grid {
			display: table;
		}
		.tools {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-2) var(--space-4);
			margin-bottom: var(--space-3);
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
	/* The mark hangs 16px left of the value, and the gap before the value is
	   12px. In a list with a marked field every label keeps 12px of padding
	   inside the label column, so the mark clears the longest label by 8px
	   and every value still keeps one edge. A label shorter than the
	   column's 72px minimum has room already and nothing moves. */
	.item-fields dd[data-mark] {
		overflow: visible;
	}
	.item-fields[data-marked] dt {
		padding-inline-end: var(--space-3);
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

	[data-variant='ruled'] > .stack > li + li {
		box-shadow: inset 0 1px 0 var(--border);
	}
	[data-variant='ruled'] > .stack > li + li[data-selected] {
		box-shadow:
			inset 3px 0 0 var(--accent),
			inset 0 1px 0 var(--border);
	}

	/* An expandable item keeps its button at the end of the title line,
	   where a Disclosure keeps its chevron; the title wraps before it. The
	   detail follows the item's lines, indented, inside the same item. */
	.stack[data-expandable] > li {
		position: relative;
	}
	.stack[data-expandable] > li > .item {
		padding-inline-end: calc(var(--bleed) + var(--hit-target) + var(--space-2));
	}
	.stack > li > .expand {
		top: calc(var(--space-3) + 12px - var(--hit-target) / 2);
		inset-inline-start: auto;
		inset-inline-end: var(--bleed);
	}
	.stack > li > .detail-body {
		padding: 0 var(--bleed) var(--space-4) calc(var(--bleed) + var(--space-4));
	}

	/* The descriptions of the stacked fields, in their sheet. */
	.about-list {
		display: grid;
		gap: var(--space-3);
	}
	.about-list dt {
		color: var(--muted);
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
