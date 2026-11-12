<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Timeline, { type TimelineEvent } from '#lib/components/Timeline.svelte';
	import { Motion } from '#lib/motion/index.js';

	// Every mix of detail and time: both, neither, detail only, time only.
	const history: TimelineEvent[] = [
		{ title: 'Project created', detail: 'From the web platform template', date: '2026-08-18', time: '10:00' },
		{ title: 'Scope agreed', date: '2026-08-25' },
		{ title: 'Design review', detail: '14 of 14 screens approved', date: '2026-10-21' },
		{ title: 'Handed to development', date: '2026-10-28', time: '09:30' }
	];

	// The title says the status; the tone only colours the node.
	const release: TimelineEvent[] = [
		{ title: 'Release 4.2 planned', detail: 'Twelve changes in scope', date: '2026-11-02', time: '09:00' },
		{
			title: 'Build failed',
			detail: 'Two tests failed in the checkout flow',
			date: '2026-11-04',
			time: '14:12',
			tone: 'danger'
		},
		{
			title: 'Waiting on review',
			detail: 'Test fix assigned to Jonas Berg',
			date: '2026-11-05',
			time: '11:40',
			tone: 'warn'
		},
		{ title: 'Release published', detail: 'Version 4.2.0', date: '2026-11-06', time: '16:30', tone: 'ok' }
	];

	const single: TimelineEvent[] = [
		{ title: 'Project created', detail: 'No other activity yet', date: '2026-11-10', time: '08:15' }
	];

	// Dates and times as a reader's locale shows them, with the moment in ISO.
	const local: TimelineEvent[] = [
		{ title: 'File uploaded', detail: 'brief.pdf', date: '3 Nov 2026', datetime: '2026-11-03' },
		{
			title: 'Comment added',
			detail: 'Mara Ilves on page 2',
			date: '4 Nov 2026',
			time: '2:30 pm',
			datetime: '2026-11-04T14:30'
		}
	];

	const full = [...history, ...release];
	let staged = $state.raw(full);
	let replay = $state(0);
	const addEvent = () =>
		(staged = [...staged, { title: 'Event added', date: '2026-11-09', time: '12:00' }]);
	const replayEntrance = () => {
		staged = full;
		replay += 1;
	};
</script>

<svelte:head>
	<title>Timeline · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Timeline</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		What happened to a record, in order. <code>Timeline</code> follows the brief’s visual rule 7,
		discrete shapes: each event is a 12px square node on a 2px titanium rail, with its title, detail and
		date in Geist Mono. A status hue colours the node only, and colour is never the only signal: the
		title says the status in words.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Events.</strong> <code>events</code> renders in the order given, oldest first or newest
				first; pick one order per app. It renders an <code>&lt;ol&gt;</code>.
			</li>
			<li>
				<strong>Text.</strong> <code>title</code> says what happened, as the app or a user wrote it.
				<code>detail</code> is an optional second line in the muted ink.
			</li>
			<li>
				<strong>When.</strong> <code>date</code> is shown as given, and <code>time</code>, if set,
				follows it. <code>datetime</code> is the machine-readable moment for
				<code>&lt;time datetime&gt;</code>; it defaults to <code>date</code>, or
				<code>date</code>T<code>time</code> with a time, so ISO dates need nothing else.
			</li>
			<li>
				<strong>Tone.</strong> <code>tone</code> colours the node: <code>ok</code> green for done,
				<code>warn</code> yellow for waiting or needs you, <code>danger</code> red for failed. Without it
				the node is titanium. The title must say the same status.
			</li>
			<li>Extra attributes and <code>class</code> go to the <code>&lt;ol&gt;</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="events">
		<h2 id="events" class="hp-section-title">Events</h2>
		<p class="lede">
			A project’s history, oldest first. Events with and without a detail line, with and without a time.
		</p>
		<Timeline events={history} />
	</section>

	<section aria-labelledby="tones">
		<h2 id="tones" class="hp-section-title">Status tones</h2>
		<p class="lede">
			No tone, then <code>danger</code>, <code>warn</code> and <code>ok</code>. Each title says its
			status, so the timeline reads the same without colour; the hue only marks the node.
		</p>
		<Timeline events={release} />
	</section>

	<section aria-labelledby="single">
		<h2 id="single" class="hp-section-title">One event</h2>
		<p class="lede">A new record: one node and no rail, since the rail only joins a node to the next.</p>
		<Timeline events={single} />
	</section>

	<section aria-labelledby="display-dates">
		<h2 id="display-dates" class="hp-section-title">Display dates</h2>
		<p class="lede">
			Dates and times in a reader’s format, such as <code>4 Nov 2026</code> and <code>2:30 pm</code>.
			They are not ISO, so each event passes <code>datetime</code> (<code>2026-11-04T14:30</code>) for
			the <code>&lt;time&gt;</code> element.
		</p>
		<Timeline events={local} />
	</section>

	<section aria-labelledby="expressive">
		<h2 id="expressive" class="hp-section-title">Expressive entrance</h2>
		<p class="lede">
			Inside <code>&lt;Motion tier="expressive"&gt;</code> the events of the first render enter one
			after another, 30ms apart, done by 300ms. Each node and its rail segment enter with their event.
			Events added later never animate, and nothing moves in the quiet tier or with reduced motion.
			Replay remounts the timeline to play the entrance again; Add event changes it, which shows that
			a change does not animate.
		</p>
		<div class="demo-controls">
			<Button onclick={replayEntrance}>Replay entrance</Button>
			<Button onclick={addEvent}>Add event</Button>
		</div>
		<div data-testid="expressive-demo">
			<Motion tier="expressive">
				{#key replay}
					<Timeline events={staged} />
				{/key}
			</Motion>
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
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}
	.demo-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4) var(--space-6);
		margin-bottom: var(--space-6);
	}
</style>
