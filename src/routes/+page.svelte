<script lang="ts">
	const groups = [
		{
			label: 'Guides',
			items: [
				{
					href: '/foundations',
					title: 'Foundations',
					desc: 'Colour, the header band, type roles, space, focus and selection, control heights.'
				},
				{
					href: '/motion',
					title: 'Motion',
					desc: 'Every duration and curve on real components; retune them for this tab and copy the values.'
				},
				{
					href: '/specimen',
					title: 'Specimen: list page',
					desc: 'A project table with filters, one header band, a footer count and pagination.'
				},
				{
					href: '/specimen/record',
					title: 'Specimen: record page',
					desc: 'One project: page actions, a display identifier, key-values, a timeline and a framed chart.'
				},
				{ href: '/app', title: 'Specimen app', desc: 'A plain project app built from the components: a list with filters, a project page and a settings form, with phone navigation.' },
			]
		},
		{
			label: 'Components',
			items: [
				{
					href: '/components/button',
					title: 'Button',
					desc: 'Solid, outlined and text actions; links that open another view end in a small arrow.'
				},
				{
					href: '/components/table',
					title: 'Table and pagination',
					desc: 'One header band, mono rows, edge-marker selection; a stacked list on phones.'
				},
				{
					href: '/components/native-select',
					title: 'Native select',
					desc: 'A short fixed list of choices, in named groups if it needs them. Phones keep their own picker.'
				},
				{
					href: '/components/select',
					title: 'Select',
					desc: 'Searchable or rich options, in named groups if needed: a list under the field, a bottom sheet on phones.'
				},
				{ href: '/components/app-shell', title: 'App shell', desc: 'The pinned header row with the view title and page controls; a bottom bar or a drawer on phones, a rail or a sidebar wider up.' },
				{ href: '/components/list-detail', title: 'List and detail', desc: 'A list beside the open item from 900px; on phones the list and the item are two screens, with a back control between them.' },
				{ href: '/components/dialog', title: 'Dialog', desc: 'A centred dialog from 600px; a bottom sheet that swipes down to close, or a full-screen form, on phones.' },
				{ href: '/components/tag', title: 'Tag', desc: 'A small solid block with a caps label that names the block below it.' },
				{ href: '/components/key-value-list', title: 'Key-value list', desc: 'Caps labels beside mono values, no lines; each label stacks over its value on phones.' },
				{ href: '/components/timeline', title: 'Timeline', desc: 'Events as square nodes on a 2px rail; a status hue colours the node only.' },
				{ href: '/components/media-frame', title: 'Media frame', desc: 'A hairline frame with registration marks for images, charts and diagrams; MediaImage fills it with a photo that takes over from a skeleton block when it loads.' },
				{ href: '/components/image-viewer', title: 'Image viewer', desc: 'One image over the whole screen: a pinch, a double-tap, the wheel or the keys zoom it, a drag moves it, a swipe down closes it; an optional title and Download.' },
				{ href: '/components/text-field', title: 'Text field', desc: 'A caps label over a black well, a hint and an inline error below; 16px text on every screen.' },
				{ href: '/components/text-area', title: 'Text area', desc: 'Several lines of text under a caps label; the well grows with its text up to a set height, then scrolls inside.' },
				{ href: '/components/tabs', title: 'Tabs', desc: 'Caps labels over panels; the selected tab takes the edge mark. The list scrolls sideways when the tabs do not fit.' },
				{ href: '/components/disclosure', title: 'Disclosure', desc: 'One expandable section: a title row with a turning chevron; the height snaps open, the content fades in and closing cuts.' },
				{ href: '/components/checkbox', title: 'Checkbox', desc: 'A black box that takes a titanium edge and check; mixed for a partial set; a group named by a caps label or a question.' },
				{ href: '/components/radio-group', title: 'Radio group', desc: 'One choice from options read side by side, each with an optional line and tag; the chosen box takes a titanium square.' },
				{ href: '/components/switch', title: 'Switch', desc: 'An on/off setting at the end of its label line; the square thumb jumps, never slides.' },
				{ href: '/components/stat', title: 'Stat', desc: 'A caps label over a key figure with tabular numbers, an optional unit and delta; one display size per view.' },
				{ href: '/components/steps', title: 'Steps', desc: 'Ordered steps as segments: done, current and upcoming; a row from 600px, stacked on phones.' },
				{ href: '/components/progress', title: 'Progress', desc: 'A bar of separate segments that light as real work gets done, with a label and the value in words.' },
				{ href: '/components/meter', title: 'Meter', desc: 'A measurement inside a known range as separate segments, coloured by thresholds, with an optional reference mark and a detail line.' },
				{ href: '/components/spinner', title: 'Spinner', desc: 'A pixel line that steps through four states beside a label; it appears only after 300ms of waiting.' },
				{ href: '/components/states', title: 'Loading, empty and error states', desc: 'Static skeleton blocks that mirror the content and a region that swaps them for it, an empty state with one next action, an error that says how to fix it.' },
				{ href: '/components/popover', title: 'Popover', desc: 'A small panel anchored to its trigger from 600px; the bottom sheet, with a close button, on phones.' },
				{ href: '/components/menu', title: 'Menu', desc: 'Actions and options behind a button: a list under it from 600px, a bottom sheet on phones; danger, disabled, checkbox and radio items.' },
				{ href: '/components/combobox', title: 'Combobox', desc: 'Type to filter a long list by option or group name and choose from it; a list under the field from 600px, a bottom sheet with the search inside on phones.' },
				{ href: '/components/tooltip', title: 'Tooltip', desc: 'A short line of text over a control for mouse and keyboard users; it never opens on touch, so its text is always on screen or in the label too.' },
				{ href: '/components/toast', title: 'Toast', desc: 'A short confirmation at the bottom of the screen, one at a time; it goes away on its own and may carry one action, such as Undo.' },
				{ href: '/components/notice', title: 'Notice', desc: 'A persistent message in the page flow: a title, text and up to two actions, with an optional close button; it stays until the app removes it.' },
				{ href: '/components/prose', title: 'Prose', desc: 'A class for rendered markdown: headings, lists, quotes, code blocks with an optional copy button, and tables that scroll inside their own box.' },
				{ href: '/components/pagination', title: 'Pagination', desc: 'Square titanium steps beside a mono page figure; a step at an end disables itself; 44px steps on touch.' },
			]
		}
	];
</script>

<svelte:head>
	<title>Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Index</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A Svelte 5 design system on Bits UI. Black canvas, titanium ink, the three Geist faces, square
		solid blocks for actions and tags, banded tables of mono data. Dark only for now.
	</p>

	{#each groups as g (g.label)}
		<section aria-labelledby="group-{g.label}">
			<h2 class="hp-label group" id="group-{g.label}">{g.label}</h2>
			<ul class="sections">
				{#each g.items as s (s.href)}
					<li>
						<a href={s.href}>
							<span class="hp-section-title">{s.title}</span>
							<span class="desc">{s.desc}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</main>

<style>
	.intro {
		max-width: var(--measure);
		color: var(--muted);
	}

	.group {
		margin-top: var(--space-12);
		color: var(--muted);
	}

	/* No dividers: rows group by space, and the hover tint bleeds past the
	   text edge. */
	.sections {
		display: grid;
		gap: var(--space-2);
		margin: var(--space-3) calc(-1 * var(--bleed)) 0;
		padding: 0;
		list-style: none;
	}

	.sections a {
		display: grid;
		gap: var(--space-1);
		padding: calc(var(--space-3) * var(--density)) var(--bleed);
		text-decoration: none;
	}

	.desc {
		max-width: var(--measure);
		color: var(--muted);
	}

	@media (hover: hover) and (pointer: fine) {
		.sections a:hover {
			background: var(--surface-hover);
		}
	}
	.sections a:active {
		background: var(--surface-hover);
	}
	.sections a:focus-visible {
		outline-offset: -2px;
	}
</style>
