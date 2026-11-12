<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Combobox, { type ComboboxItem } from '#lib/components/Combobox.svelte';

	const projects: ComboboxItem[] = [
		{ value: 'accessibility-review', label: 'Accessibility review' },
		{ value: 'annual-report', label: 'Annual report' },
		{ value: 'billing-migration', label: 'Billing migration' },
		{ value: 'customer-portal', label: 'Customer portal' },
		{ value: 'data-export', label: 'Data export' },
		{ value: 'design-system', label: 'Design system' },
		{ value: 'knowledge-base', label: 'Knowledge base' },
		{ value: 'mobile-app', label: 'Mobile app' },
		{ value: 'onboarding-flow', label: 'Onboarding flow' },
		{ value: 'search-improvements', label: 'Search improvements' },
		{ value: 'team-handbook', label: 'Team handbook' },
		{ value: 'website-redesign', label: 'Website redesign' }
	];

	// The value is each person's handle.
	const people: ComboboxItem[] = [
		{ value: 'akovac', label: 'Ana Kovač' },
		{ value: 'iduarte', label: 'Ines Duarte' },
		{ value: 'jbrandt', label: 'Joel Brandt' },
		{ value: 'lnakamura', label: 'Leo Nakamura' },
		{ value: 'milves', label: 'Mara Ilves' },
		{ value: 'nhaddad', label: 'Nadia Haddad' },
		{ value: 'praman', label: 'Priya Raman' },
		{ value: 'sokafor', label: 'Sade Okafor' },
		{ value: 'treyes', label: 'Tomás Reyes' },
		{ value: 'wli', label: 'Wen Li' }
	];

	const repositories: ComboboxItem[] = [
		{ value: 'api', label: 'api', description: 'Public REST API and webhooks' },
		{ value: 'design-tokens', label: 'design-tokens', description: 'Colour, type and spacing for every app' },
		{ value: 'docs', label: 'docs', description: 'Guides and API reference' },
		{
			value: 'legacy-site',
			label: 'legacy-site',
			description: 'Archived. Restore it to link new tasks.',
			disabled: true
		},
		{ value: 'mobile-app', label: 'mobile-app', description: 'iOS and Android clients' },
		{ value: 'release-scripts', label: 'release-scripts', description: 'Build and publish steps' },
		{ value: 'web-app', label: 'web-app', description: 'Customer site and dashboard' }
	];

	// 34 zones, west to east.
	const zones: [string, string][] = [
		['Pacific/Pago_Pago', 'Pago Pago (UTC−11:00)'],
		['Pacific/Honolulu', 'Honolulu (UTC−10:00)'],
		['America/Anchorage', 'Anchorage (UTC−09:00)'],
		['America/Los_Angeles', 'Los Angeles (UTC−08:00)'],
		['America/Denver', 'Denver (UTC−07:00)'],
		['America/Chicago', 'Chicago (UTC−06:00)'],
		['America/Mexico_City', 'Mexico City (UTC−06:00)'],
		['America/New_York', 'New York (UTC−05:00)'],
		['America/Bogota', 'Bogotá (UTC−05:00)'],
		['America/Halifax', 'Halifax (UTC−04:00)'],
		['America/Sao_Paulo', 'São Paulo (UTC−03:00)'],
		['America/Argentina/Buenos_Aires', 'Buenos Aires (UTC−03:00)'],
		['Atlantic/Azores', 'Azores (UTC−01:00)'],
		['Europe/London', 'London (UTC+00:00)'],
		['Africa/Lagos', 'Lagos (UTC+01:00)'],
		['Europe/Berlin', 'Berlin (UTC+01:00)'],
		['Europe/Paris', 'Paris (UTC+01:00)'],
		['Africa/Cairo', 'Cairo (UTC+02:00)'],
		['Europe/Helsinki', 'Helsinki (UTC+02:00)'],
		['Europe/Istanbul', 'Istanbul (UTC+03:00)'],
		['Africa/Nairobi', 'Nairobi (UTC+03:00)'],
		['Asia/Dubai', 'Dubai (UTC+04:00)'],
		['Asia/Karachi', 'Karachi (UTC+05:00)'],
		['Asia/Kolkata', 'Kolkata (UTC+05:30)'],
		['Asia/Dhaka', 'Dhaka (UTC+06:00)'],
		['Asia/Bangkok', 'Bangkok (UTC+07:00)'],
		['Asia/Singapore', 'Singapore (UTC+08:00)'],
		['Asia/Shanghai', 'Shanghai (UTC+08:00)'],
		['Asia/Seoul', 'Seoul (UTC+09:00)'],
		['Asia/Tokyo', 'Tokyo (UTC+09:00)'],
		['Australia/Adelaide', 'Adelaide (UTC+09:30)'],
		['Australia/Sydney', 'Sydney (UTC+10:00)'],
		['Pacific/Noumea', 'Nouméa (UTC+11:00)'],
		['Pacific/Auckland', 'Auckland (UTC+12:00)']
	];
	const timeZones: ComboboxItem[] = zones.map(([value, label]) => ({ value, label }));

	// The same zones by region, west to east inside each, the offset as a
	// second line, and UTC in no group.
	const regionOf: Record<string, string> = {
		America: 'Americas',
		Atlantic: 'Europe',
		Europe: 'Europe',
		Africa: 'Africa',
		Asia: 'Asia',
		Australia: 'Oceania',
		Pacific: 'Oceania'
	};
	const regions = ['Americas', 'Europe', 'Africa', 'Asia', 'Oceania'];
	const zonesByRegion: ComboboxItem[] = [
		{ value: 'UTC', label: 'Coordinated Universal Time', description: 'UTC+00:00' },
		...zones
			.map(([value, name]) => {
				const [city, offset] = name.split(' (');
				const group = regionOf[value.split('/')[0]];
				return { value, label: city, description: offset.slice(0, -1), group };
			})
			.sort((a, b) => regions.indexOf(a.group) - regions.indexOf(b.group))
	];

	const folders: ComboboxItem[] = [
		{ value: 'archive', label: 'Archive' },
		{ value: 'contracts', label: 'Contracts' },
		{ value: 'design-reviews', label: 'Design reviews' },
		{ value: 'drafts', label: 'Drafts' },
		{ value: 'inbox', label: 'Inbox' },
		{ value: 'invoices', label: 'Invoices' },
		{ value: 'meeting-notes', label: 'Meeting notes' },
		{ value: 'photos', label: 'Photos' }
	];

	// Matches the typed text against the name or the handle, ignoring case and a leading @.
	function byNameOrHandle(item: ComboboxItem, query: string): boolean {
		const q = query.trim().replace(/^@/, '').toLowerCase();
		return item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q);
	}

	let project = $state('design-system');
	let assignee = $state('');
	let repository = $state('web-app');
	let timeZone = $state('Europe/Berlin');
	let regionZone = $state('Asia/Tokyo');
	let reviewer = $state('');
	let folder = $state('drafts');
	let owner = $state('');

	let submitted = $state('');
	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		submitted = new URLSearchParams(data as unknown as Record<string, string>).toString();
	}
</script>

<svelte:head>
	<title>Combobox · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Combobox</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A single choice from a long or searchable list. Type to filter the options. From 600px the field is a
		text input in the black well and the list opens under it. Below 600px the field opens a bottom
		sheet, at most half the screen high, with the search input at the top, the list under it and a close
		button; swipe down to close it. While the phone’s keyboard is up, the sheet sits on top of it and
		fills the space above it. The value always comes from the list.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Use <code>Combobox</code> when people search the list by name.</strong> Projects, people,
				files and time zones are long enough that typing beats scrolling. A short list of rich options
				where typing does not help belongs in <code>Select</code>; a short fixed list belongs in
				<code>NativeSelect</code>, so phones keep their own picker.
			</li>
			<li>
				<code>label</code> is required: it is the caps field label and, on phones, the sheet’s title. A
				placeholder never stands in for it; it fills the empty field and the sheet’s search input.
			</li>
			<li>
				Typing filters the list. By default an option matches when its label or its group contains the
				text, ignoring case and accents. <code>filter</code> replaces that test; it gets the whole item, so
				it can match a value or an id too. Options appear and drop out at once: nothing animates while the
				list filters.
			</li>
			<li>
				<code>group</code> puts an option under a heading with that name, as written. Options without a
				group come first; then each group, in the order its first option appears, with its options in
				their order. Each group is a <code>role="group"</code> named by its heading. The heading is not an
				option: the keys skip it. A group with no matching option drops its heading.
			</li>
			<li>
				Groups do not fold or expand. A listbox has no groups that open and close; a list that does is a
				tree, a different control.
			</li>
			<li>
				The value only comes from the list; typed text never becomes the value. Closing the list
				without choosing puts the chosen label back in the field.
			</li>
			<li>
				The chosen option has a 3px titanium edge and the selected tint. The highlighted option gets the
				hover tint; when keys moved the highlight, it also draws the focus contour, because focus stays
				in the field.
			</li>
			<li>
				Keys: typing or <kbd>↓</kbd> opens. <kbd>↑</kbd>, <kbd>↓</kbd>, <kbd>Page Up</kbd> and
				<kbd>Page Down</kbd> move the highlight; <kbd>Home</kbd> and <kbd>End</kbd> move the text cursor.
				<kbd>Enter</kbd> chooses, <kbd>Escape</kbd> or <kbd>Tab</kbd> closes. Pressing the chevron end of
				the field while the list is open closes it. A key that opens the list selects the field’s text, so
				typing replaces it, except a shortcut with <kbd>Ctrl</kbd> or <kbd>⌘</kbd>: <kbd>Ctrl</kbd>
				<kbd>C</kbd> copies what is selected. On phones the sheet’s search input takes the keys.
			</li>
			<li>
				<code>name</code> submits the value with a form. Extra attributes, event handlers and
				<code>ref</code> go to the field control: the text input from 600px, the button below it.
				<code>class</code> goes to the root.
			</li>
		</ul>
	</section>

	<section aria-labelledby="basic">
		<h2 id="basic" class="hp-section-title">Basics</h2>
		<p class="lede">
			A chosen project, and an empty field with a placeholder in the supporting ink. Type part of a name
			to filter. When nothing matches, the list shows <code>emptyText</code>, <code>No matches</code> by
			default.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox label="Project" items={projects} bind:value={project} />
				<p class="hp-caption readout">value: <code>{project}</code></p>
			</div>
			<div class="cell">
				<Combobox label="Assignee" items={people} placeholder="Search people" bind:value={assignee} />
				<p class="hp-caption readout">value: <code>{assignee || '(empty)'}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="rich">
		<h2 id="rich" class="hp-section-title">Descriptions and disabled options</h2>
		<p class="lede">
			A description sets a second line in the supporting ink. A disabled option stays in the list in
			muted ink and says why.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox label="Repository" items={repositories} bind:value={repository} />
				<p class="hp-caption readout">value: <code>{repository}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long list</h2>
		<p class="lede">
			34 time zones. The list scrolls inside a capped height. Type part of a city to filter it:
			<code>sao</code> finds São Paulo, because the default filter ignores accents.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox label="Time zone" items={timeZones} bind:value={timeZone} />
				<p class="hp-caption readout">value: <code>{timeZone}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="groups">
		<h2 id="groups" class="hp-section-title">Groups</h2>
		<p class="lede">
			The same zones by region, with UTC first in no group and each offset as a second line. Typing
			matches the group too: <code>europe</code> lists every zone in Europe, and <code>pa</code> finds São
			Paulo, Paris and Pago Pago, each under its region. While the list scrolls, the heading of the group
			at the top stays in place.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox label="Time zone" items={zonesByRegion} placeholder="Search zones" bind:value={regionZone} />
				<p class="hp-caption readout">value: <code>{regionZone}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="custom">
		<h2 id="custom" class="hp-section-title">Custom filter and options</h2>
		<p class="lede">
			The <code>item</code> snippet renders each option’s content; the edge, tints and contour stay. Here
			it adds each person’s handle in Geist Mono. The <code>filter</code> prop matches the typed text
			against the name or the handle, ignoring case, so <code>treyes</code> and <code>@treyes</code> find
			Tomás Reyes.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox
					label="Reviewer"
					items={people}
					placeholder="Search by name or handle"
					filter={byNameOrHandle}
					bind:value={reviewer}
				>
					{#snippet item({ item })}
						<span class="person">
							<span>{item.label}</span>
							<span class="handle hp-mono">@{item.value}</span>
						</span>
					{/snippet}
				</Combobox>
				<p class="hp-caption readout">value: <code>{reviewer || '(empty)'}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="hints">
		<h2 id="hints" class="hp-section-title">Hint and error</h2>
		<p class="lede">
			<code>hint</code> sets a caption under the field in the supporting ink. <code>error</code> sets a
			message under it with an icon and marks the field invalid; both are linked to the field. Say how
			to fix the problem. Here the error clears once you choose an owner.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox
					label="Folder"
					items={folders}
					hint="New files from this project are saved here."
					bind:value={folder}
				/>
			</div>
			<div class="cell">
				<Combobox
					label="Owner"
					items={people}
					placeholder="Search people"
					error={owner ? undefined : 'Choose an owner before you publish.'}
					bind:value={owner}
				/>
				<p class="hp-caption readout">value: <code>{owner || '(empty)'}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="disabled">
		<h2 id="disabled" class="hp-section-title">Disabled</h2>
		<p class="lede">The whole field is off; the text next to it says why.</p>
		<div class="grid">
			<div class="cell">
				<Combobox label="Project" items={projects} value="annual-report" disabled />
				<p class="hp-caption readout">Only the project owner can move this task.</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="beside">
		<h2 id="beside" class="hp-section-title">Label beside</h2>
		<p class="lede">
			For a filter bar: <code>labelBeside="expanded"</code> moves the label next to the field from 900px
			up.
		</p>
		<div class="grid">
			<div class="cell">
				<Combobox label="Project" items={projects} bind:value={project} labelBeside="expanded" />
			</div>
		</div>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">Each field’s <code>name</code> submits its value through a hidden input.</p>
		<form class="form" onsubmit={submit}>
			<Combobox label="Project" name="project" items={projects} value="customer-portal" />
			<Combobox label="Assignee" name="assignee" items={people} placeholder="Search people" />
			<div class="actions">
				<Button variant="primary" type="submit">Save</Button>
			</div>
			<p class="hp-caption readout" aria-live="polite">
				{#if submitted}submitted: <code>{submitted}</code>{:else}Nothing submitted yet.{/if}
			</p>
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
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 20rem));
		gap: var(--space-8) var(--space-6);
	}
	.cell {
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-width: 0;
	}
	.readout {
		color: var(--muted);
	}

	/* Content for the item snippet: name left, handle right. */
	.person {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-4);
	}
	.handle {
		color: var(--muted);
		font-size: var(--type-dense);
	}

	.form {
		display: grid;
		gap: var(--space-5);
		max-width: 20rem;
	}
	.actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
