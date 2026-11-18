<script lang="ts">
	import Status from '#lib/components/Status.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import { Motion } from '#lib/motion/index.js';

	// The app's own pause control: a visible Switch that sets <Motion paused>.
	let paused = $state(false);
</script>

<svelte:head>
	<title>Status · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Status</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A square mark and a label in a line of text, for lists and details outside tables. The mark takes a
		status hue only where the label means that status. Work in progress may pulse, slowly.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				The children are the label, in the words of the status: “Online”, “Waiting for approval”. The mark
				is decorative and hidden from assistive technology, so the label alone must carry the meaning.
			</li>
			<li>
				<code>tone</code> is <code>ok</code>, <code>warn</code> or <code>danger</code>: done or online,
				waiting or needs you, failed. Red, yellow and green mean those statuses and nothing else.
			</li>
			<li>
				Without <code>tone</code> the mark is untoned, in <code>--muted</code>. An informational or idle
				state (“Idle”, “Draft”, “Not started”) gets no hue, and its label says what it is.
			</li>
			<li>
				<code>live</code> marks work in progress and pulses the mark’s opacity. It is for a state that is
				changing now, not for a state that merely exists.
			</li>
			<li>
				The mark is the same 8px square as a Table’s status mark and sits on the first line of the label.
				Use Status outside tables; inside a Table, a column’s <code>mark</code> draws it for you.
			</li>
			<li>
				It is inline: it takes the font, size and ink of the line around it. It is not a live region;
				pass <code>role="status"</code> for a Status whose text changes while the user is on the page.
				<code>ref</code> binds the root <code>span</code>; <code>id</code>, <code>class</code> and other
				attributes go to it.
			</li>
		</ul>
	</section>

	<section aria-labelledby="tones">
		<h2 id="tones" class="hp-section-title">Tones</h2>
		<p class="lede">The three status hues and the untoned mark.</p>
		<ul class="rows">
			<li><Status tone="ok">Online</Status></li>
			<li><Status tone="warn">Waiting for approval</Status></li>
			<li><Status tone="danger">Failed</Status></li>
			<li><Status>Idle</Status></li>
		</ul>
	</section>

	<section aria-labelledby="inline">
		<h2 id="inline" class="hp-section-title">In a list</h2>
		<p class="lede">
			A service list. Each row has a name, a Status and a detail. Only the states that mean a status
			take a hue.
		</p>
		<ul class="services">
			<li>
				<span class="name">Sync worker</span>
				<Status tone="ok">Online</Status>
				<span class="detail hp-mono">last run 2 min ago</span>
			</li>
			<li>
				<span class="name">Index builder</span>
				<Status tone="warn">Behind</Status>
				<span class="detail hp-mono">1,204 queued</span>
			</li>
			<li>
				<span class="name">Mail relay</span>
				<Status tone="danger">Down</Status>
				<span class="detail hp-mono">refused since 09:14</span>
			</li>
			<li>
				<span class="name">Archive</span>
				<Status>Idle</Status>
				<span class="detail hp-mono">next run 02:00</span>
			</li>
		</ul>
	</section>

	<section aria-labelledby="live">
		<h2 id="live" class="hp-section-title">Live</h2>
		<p class="lede">
			<code>live</code> pulses the mark between full and 40% opacity once every 2.4 seconds, which is 0.42
			flashes a second. Nothing moves and no colour changes.
		</p>
		<Motion {paused}>
			<ul class="rows">
				<li><Status live tone="ok">Syncing</Status></li>
				<li><Status live tone="warn">Waiting for a free slot</Status></li>
				<li><Status live>Indexing</Status></li>
				<li><Status live tone="danger">Retrying</Status></li>
			</ul>
			<div class="pause">
				<Switch label="Pause animations" bind:checked={paused} />
			</div>
		</Motion>
	</section>

	<section aria-labelledby="pause">
		<h2 id="pause" class="hp-section-title">Pausing the pulse</h2>
		<ul class="notes">
			<li>
				A pulse runs longer than 5 seconds beside other content, so WCAG 2.2.2 asks for a way to pause it.
				The pulse stops in two cases. The system asks for reduced motion (<code>prefers-reduced-motion</code>):
				it stops with no setting from the app. The app sets <code>paused</code> on <code>&lt;Motion&gt;</code>
				from <code>@mystravil/hardpoint/motion</code>, the component that already sets the motion tier.
			</li>
			<li>
				The app puts a visible control on screen wherever live marks show, and binds it to
				<code>paused</code>, as the Switch above does. A paused mark stays lit and steady; it does not
				freeze at a dim moment. The root carries <code>data-paused</code> while paused and
				<code>data-live</code> while live.
			</li>
			<li>
				<code>paused</code> belongs to a <code>&lt;Motion&gt;</code> and reaches everything inside it. Put one
				<code>&lt;Motion paused={'{paused}'}&gt;</code> around the app, and one control in the shell or in
				the settings, and every live Status stops together. A nested <code>&lt;Motion tier&gt;</code> that
				leaves <code>paused</code> out keeps the outer value. A component reads it with
				<code>useMotion().paused</code>.
			</li>
			<li>
				It pauses motion that runs by itself, and nothing else. A transition that answers an action
				(a menu opening, a number ticking after a change) is not paused. A Spinner is a loading indicator,
				which WCAG treats as essential motion, so it keeps stepping.
			</li>
		</ul>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">A long label</h2>
		<p class="lede">
			The mark stays on the first line, and the label wraps beside it, never under it.
		</p>
		<div class="narrow">
			<Status tone="warn">Waiting for another reviewer to approve the change before it goes out</Status>
		</div>
	</section>

	<section aria-labelledby="a11y">
		<h2 id="a11y" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				Colour is never the only signal: the label says the status in words, and the mark is
				<code>aria-hidden</code>. Write the label so it reads right without the mark.
			</li>
			<li>
				The mark is a decorative 8px square, so it has no contrast requirement of its own; the label is
				in the line’s ink, 4.5:1 or more in both themes.
			</li>
			<li>
				The pulse never flashes more than once every 2.4 seconds, only changes opacity, and stops under
				reduced motion and through <code>&lt;Motion paused&gt;</code>.
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

	main > section {
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

	.rows {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* A service list: name, status and detail on one line from 600px, stacked on phones. */
	.services {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.services li {
		display: grid;
		gap: var(--space-1) var(--space-4);
	}
	.name {
		font-weight: 500;
	}
	.detail {
		color: var(--muted);
		font-size: var(--type-dense);
	}
	@media (min-width: 600px) {
		.services li {
			grid-template-columns: 12rem 10rem 1fr;
			align-items: baseline;
		}
	}

	.pause {
		margin-top: var(--space-5);
		max-width: 20rem;
	}

	.narrow {
		max-width: 20rem;
	}
</style>
