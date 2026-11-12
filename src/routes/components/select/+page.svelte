<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Select, { type SelectItem } from '#lib/components/Select.svelte';

	const languages: SelectItem[] = [
		{ value: 'da', label: 'Dansk' },
		{ value: 'de', label: 'Deutsch' },
		{ value: 'en', label: 'English' },
		{ value: 'es', label: 'Español' },
		{ value: 'fr', label: 'Français' },
		{ value: 'it', label: 'Italiano' },
		{ value: 'nl', label: 'Nederlands' },
		{ value: 'pl', label: 'Polski' },
		{ value: 'pt', label: 'Português' },
		{ value: 'sv', label: 'Svenska' }
	];

	const people: SelectItem[] = [
		{ value: 'mara', label: 'Mara Ilves' },
		{ value: 'tomas', label: 'Tomás Reyes' },
		{ value: 'ana', label: 'Ana Kovač' },
		{ value: 'joel', label: 'Joel Brandt' },
		{ value: 'ines', label: 'Ines Duarte' }
	];

	const frequencies: SelectItem[] = [
		{ value: 'instant', label: 'Every update', description: 'An email for each change, as it happens' },
		{ value: 'daily', label: 'Daily summary', description: 'One email each morning' },
		{ value: 'weekly', label: 'Weekly summary', description: 'One email each Monday' },
		{ value: 'off', label: 'Off', description: 'Only what you open in the app' }
	];

	const formats: SelectItem[] = [
		{ value: 'csv', label: 'CSV' },
		{ value: 'json', label: 'JSON' },
		{ value: 'xlsx', label: 'Excel workbook' },
		{ value: 'pdf', label: 'PDF', description: 'Needs a saved page layout', disabled: true }
	];

	const workspaces: SelectItem[] = [
		{ value: 'design', label: 'Design' },
		{ value: 'engineering', label: 'Engineering' },
		{ value: 'support', label: 'Support' }
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
	const timeZones: SelectItem[] = zones.map(([value, label]) => ({ value, label }));

	// The same zones by region, west to east inside each, and UTC in no group.
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
	const zonesByRegion: SelectItem[] = [
		{ value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
		...zones
			.map(([value, label]) => ({ value, label, group: regionOf[value.split('/')[0]] }))
			.sort((a, b) => regions.indexOf(a.group) - regions.indexOf(b.group))
	];

	const paperSizes: SelectItem[] = [
		{ value: 'document', label: 'Match the document', description: 'The size the file was made with' },
		{ value: 'a3', label: 'A3', description: '297 × 420 mm', group: 'ISO' },
		{ value: 'a4', label: 'A4', description: '210 × 297 mm', group: 'ISO' },
		{ value: 'a5', label: 'A5', description: '148 × 210 mm', group: 'ISO' },
		{ value: 'letter', label: 'Letter', description: '8.5 × 11 in', group: 'North American' },
		{ value: 'legal', label: 'Legal', description: '8.5 × 14 in', group: 'North American' },
		{
			value: 'tabloid',
			label: 'Tabloid',
			description: '11 × 17 in. Needs the large tray.',
			group: 'North American',
			disabled: true
		}
	];

	const reviewers: SelectItem[] = [
		{ value: 'mara.ilves', label: 'Mara Ilves' },
		{ value: 'tomas.reyes', label: 'Tomás Reyes' },
		{ value: 'ana.kovac', label: 'Ana Kovač' },
		{ value: 'joel.brandt', label: 'Joel Brandt' }
	];

	const teams: SelectItem[] = [
		{ value: 'design', label: 'Design' },
		{ value: 'engineering', label: 'Engineering' },
		{ value: 'research', label: 'Research' },
		{ value: 'support', label: 'Support' }
	];
	const roles: SelectItem[] = [
		{ value: 'viewer', label: 'Viewer', description: 'Can read and comment' },
		{ value: 'editor', label: 'Editor', description: 'Can change content' },
		{ value: 'admin', label: 'Admin', description: 'Can manage members and settings' }
	];

	let language = $state('en');
	let assignee = $state('');
	let frequency = $state('daily');
	let format = $state('csv');
	let timeZone = $state('Europe/Berlin');
	let regionZone = $state('Asia/Tokyo');
	let paperSize = $state('a4');
	let reviewer = $state('');

	let submitted = $state('');
	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		submitted = new URLSearchParams(data as unknown as Record<string, string>).toString();
	}
</script>

<svelte:head>
	<title>Select · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Select</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A single choice from rich options: a second line, custom content, or a long list. The trigger is the
		same black well as a native select. From 600px the options open in a list under it; below 600px
		they open in a bottom sheet with a close button, at most half the screen high, that swipes down to
		close.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Prefer <code>NativeSelect</code> for a short fixed list.</strong> A handful of plain
				choices, such as a status filter, belongs in a native <code>&lt;select&gt;</code>, so phones keep
				their own picker. Use <code>Select</code> when an option needs a second line or custom content,
				or when the list is long enough that typeahead and a scrolling list help.
			</li>
			<li>
				<code>label</code> is required: it is the caps field label and, on phones, the sheet’s title. A
				placeholder never stands in for it.
			</li>
			<li>
				The chosen option has a 3px titanium edge and the selected tint. The option under the pointer or
				the keys gets the hover tint; the one moved by keys also draws the focus contour, because focus
				stays on the trigger.
			</li>
			<li>
				Keys: <kbd>Enter</kbd>, <kbd>Space</kbd> or <kbd>↓</kbd> opens. <kbd>↑</kbd> <kbd>↓</kbd>,
				<kbd>Home</kbd> and <kbd>End</kbd> move, typing jumps to a label, <kbd>Enter</kbd> chooses,
				<kbd>Escape</kbd> or <kbd>Tab</kbd> closes.
			</li>
			<li>
				<code>group</code> puts an option under a heading with that name, as written. Options without a
				group come first; then each group, in the order its first option appears, with its options in
				their order. Each group is a <code>role="group"</code> named by its heading. The heading is not an
				option: the keys and typing skip it.
			</li>
			<li>
				Groups do not fold or expand. A listbox has no groups that open and close; a list that does is a
				tree, a different control.
			</li>
			<li>
				<code>name</code> submits the value with a form. Extra attributes, event handlers and
				<code>ref</code> go to the trigger button; <code>class</code> goes to the field.
			</li>
		</ul>
	</section>

	<section aria-labelledby="basic">
		<h2 id="basic" class="hp-section-title">Basics</h2>
		<p class="lede">A chosen value, and an empty field with a placeholder in the supporting ink.</p>
		<div class="grid">
			<div class="cell">
				<Select label="Language" items={languages} bind:value={language} />
				<p class="hp-caption readout">value: <code>{language}</code></p>
			</div>
			<div class="cell">
				<Select label="Assignee" items={people} placeholder="Choose a person" bind:value={assignee} />
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
				<Select label="Email notifications" items={frequencies} bind:value={frequency} />
			</div>
			<div class="cell">
				<Select label="Export format" items={formats} bind:value={format} />
			</div>
		</div>
	</section>

	<section aria-labelledby="disabled">
		<h2 id="disabled" class="hp-section-title">Disabled</h2>
		<p class="lede">The whole field is off; the text next to it says why.</p>
		<div class="grid">
			<div class="cell">
				<Select label="Workspace" items={workspaces} value="design" disabled />
				<p class="hp-caption readout">Only an owner can move this project.</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long list</h2>
		<p class="lede">
			34 time zones. The list scrolls inside a capped height and opens scrolled to the chosen zone.
			Type a city’s first letters to jump to it.
		</p>
		<div class="grid">
			<div class="cell">
				<Select label="Time zone" items={timeZones} bind:value={timeZone} />
				<p class="hp-caption readout">value: <code>{timeZone}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="groups">
		<h2 id="groups" class="hp-section-title">Groups</h2>
		<p class="lede">
			The same zones by region, with UTC first in no group, and paper sizes by standard with a second
			line on each. While the list scrolls, the heading of the group at the top stays in place.
		</p>
		<div class="grid">
			<div class="cell">
				<Select label="Time zone" items={zonesByRegion} bind:value={regionZone} />
				<p class="hp-caption readout">value: <code>{regionZone}</code></p>
			</div>
			<div class="cell">
				<Select label="Paper size" items={paperSizes} bind:value={paperSize} />
				<p class="hp-caption readout">value: <code>{paperSize}</code></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="custom">
		<h2 id="custom" class="hp-section-title">Custom options</h2>
		<p class="lede">
			The <code>item</code> snippet renders each option’s content; the edge, tints and contour stay. Here
			it adds each person’s handle in Geist Mono.
		</p>
		<div class="grid">
			<div class="cell">
				<Select label="Reviewer" items={reviewers} placeholder="Choose a reviewer" bind:value={reviewer}>
					{#snippet item({ item })}
						<span class="person">
							<span>{item.label}</span>
							<span class="handle hp-mono">@{item.value}</span>
						</span>
					{/snippet}
				</Select>
			</div>
		</div>
	</section>

	<section aria-labelledby="beside">
		<h2 id="beside" class="hp-section-title">Label beside</h2>
		<p class="lede">
			For a filter bar: <code>labelBeside="expanded"</code> moves the label next to the trigger from
			900px up.
		</p>
		<div class="grid">
			<div class="cell">
				<Select label="Language" items={languages} bind:value={language} labelBeside="expanded" />
			</div>
		</div>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">Each field’s <code>name</code> submits its value through a hidden input.</p>
		<form class="form" onsubmit={submit}>
			<Select label="Team" name="team" items={teams} value="engineering" />
			<Select label="Role" name="role" items={roles} placeholder="Choose a role" />
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
