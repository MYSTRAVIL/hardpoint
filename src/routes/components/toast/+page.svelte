<script lang="ts">
	import { Button, Dialog, Toaster, toast } from '#lib';

	// Confirmations. A failure that has no place on screen may toast too.
	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast('Copied');
		} catch {
			toast('Could not copy');
		}
	}

	// With an action. Undo is a shortcut: the Restore button does the same.
	let archived = $state(false);
	function archive() {
		archived = true;
		toast('Moved to archive', { action: { label: 'Undo', onclick: restore } });
	}
	function restore() {
		archived = false;
	}

	// One at a time: three toasts, 600ms apart.
	let uploads: ReturnType<typeof setTimeout>[] = [];
	function upload() {
		for (const t of uploads) clearTimeout(t);
		uploads = [1, 2, 3].map((n) => setTimeout(() => toast(`Uploaded photo ${n} of 3`), (n - 1) * 600));
	}
	$effect(() => () => {
		for (const t of uploads) clearTimeout(t);
	});
</script>

<svelte:head>
	<title>Toast · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Toast</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A short line at the bottom of the screen that confirms what just happened. One shows at a time, and it goes away
		on its own, or with its close button or a swipe. It may carry one action, such as Undo.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				Mount <code>&lt;Toaster /&gt;</code> once, in the app’s root component. Then call
				<code class="nowrap">toast(message, options)</code> from any code. Both come from the package root. The toast
				lives in module state, so it works in apps without SvelteKit. A second Toaster renders nothing while the first
				one is mounted. This page mounts its own.
			</li>
			<li>
				Toasts confirm what the user just did: Copied, Saved, Moved to archive. Errors stay inline, next to where
				things broke, and stay until they are fixed. A failure with no place on screen, such as Could not copy, may
				toast.
			</li>
			<li><code>message</code> is plain text, as written, never caps. Keep it to a few words.</li>
			<li>
				<code>action</code> adds one text button after the message: <code class="nowrap">{'{ label, onclick }'}</code>.
				The label is a short verb, set in caps. Running it dismisses the toast. The action is a shortcut, so offer the
				same step somewhere that stays, as the Restore button below does.
			</li>
			<li>
				<code>toast()</code> returns <code class="nowrap">{'{ dismiss() }'}</code>, which removes that toast if it is
				still on screen.
			</li>
			<li>
				On the Toaster, <code>label</code> (default Notifications) names the toast’s region and
				<code>closeLabel</code> (default Dismiss) names its close button.
			</li>
		</ul>
	</section>

	<section aria-labelledby="confirm">
		<h2 id="confirm" class="hp-section-title">Confirmations</h2>
		<p class="lede">
			The button copies this page’s address. If the browser refuses, the toast says so, because the failure has no
			other place on screen.
		</p>
		<div class="row">
			<Button onclick={() => copy(location.href)}>Copy link</Button>
		</div>
	</section>

	<section aria-labelledby="action">
		<h2 id="action" class="hp-section-title">With an action</h2>
		<p class="lede">
			A toast with an action stays 8 seconds. Undo puts the project back. So does Restore, which stays on the page
			after the toast has gone.
		</p>
		<div class="row">
			<p class="project">
				Website redesign <span class="state">{archived ? 'In the archive' : 'Active'}</span>
			</p>
			<!-- One button that changes its label, so focus stays on it. -->
			<Button onclick={archived ? restore : archive}>{archived ? 'Restore' : 'Archive'}</Button>
		</div>
	</section>

	<section aria-labelledby="replace">
		<h2 id="replace" class="hp-section-title">One at a time</h2>
		<p class="lede">
			A new toast replaces the one on screen and starts the timer again. The text changes in place: the box keeps its
			place, takes the new size at once and replays a short entrance. The button sends three toasts, 600ms apart.
		</p>
		<div class="row">
			<Button onclick={upload}>Upload three photos</Button>
		</div>
	</section>

	<section aria-labelledby="dialog">
		<h2 id="dialog" class="hp-section-title">Over a dialog</h2>
		<p class="lede">
			The toast sits above dialogs and their scrims, so a toast sent from a dialog shows. Focus stays inside an open
			dialog, so a toast sent from one should carry no action. On a phone it covers the lower part of a bottom sheet,
			its buttons included, but it can be swiped away or closed, so it never blocks the sheet’s actions for long.
		</p>
		<div class="row">
			<Dialog title="Share project" description="Website redesign.">
				{#snippet trigger({ props })}
					<Button {...props}>Share project</Button>
				{/snippet}
				<div class="share">
					<code class="link">projects.example/website-redesign</code>
					<Button onclick={() => copy('https://projects.example/website-redesign')}>Copy link</Button>
				</div>
				{#snippet actions({ close })}
					<Button onclick={close}>Done</Button>
				{/snippet}
			</Dialog>
		</div>
	</section>

	<section aria-labelledby="timing">
		<h2 id="timing" class="hp-section-title">Timing</h2>
		<ul class="notes">
			<li>
				A toast stays 4 seconds, or 8 seconds with an action, so there is time to reach it. <code>duration</code>, in
				milliseconds, sets another time.
			</li>
			<li>
				The timer waits while a pointer is over the toast, while a finger is on it (so during a swipe), while focus is
				inside it and while the page is hidden. Then it runs out the time that was left.
			</li>
		</ul>
	</section>

	<section aria-labelledby="dismiss">
		<h2 id="dismiss" class="hp-section-title">Dismissing</h2>
		<ul class="notes">
			<li>
				The close button at the end dismisses the toast at once. It is the dialog’s ×: 44px square on touch screens,
				36px with a mouse.
			</li>
			<li>
				On a touch screen, swipe the toast left, right or down. It follows the finger. A release past a quarter of its
				width, or of its height going down, or a flick dismisses it, and it leaves the way it was swiped. A shorter
				drag springs back. A drag never runs the action or the close button. A mouse does not drag the toast; the
				close button is there for it.
			</li>
			<li>
				Running the action dismisses the toast, and so does <kbd>Escape</kbd> while focus is inside it.
			</li>
		</ul>
	</section>

	<section aria-labelledby="motion">
		<h2 id="motion" class="hp-section-title">Motion</h2>
		<ul class="notes">
			<li>
				<strong>Showing.</strong> The toast rises 16px as it fades in, over <code class="nowrap">--dur-sheet</code>
				(240ms) on <code>--settle</code>: the timing of a sheet from the same edge. A smaller move went unseen at the
				screen edge.
			</li>
			<li>
				<strong>Dismissing.</strong> It drops 16px as it fades out, over
				<code class="nowrap">--dur-sheet-exit</code> (170ms). After a swipe it carries on from where the finger let go,
				the way it was swiped, by its own width or height.
			</li>
			<li>
				<strong>Replacing.</strong> The text and the size change at once, and the box replays a short entrance: 8px
				up with a fade, over <code class="nowrap">--dur-pop</code> (160ms). A toast that arrives during it starts it
				again from where the box is. One that arrives while the toast leaves brings it back instead, so a burst of
				toasts never fades out and in.
			</li>
			<li>
				<strong>Reduced motion.</strong> Each step fades in place, with no movement. The durations and the curve are
				read from the toast, so the motion page’s tuning applies.
			</li>
		</ul>
	</section>

	<section aria-labelledby="placement">
		<h2 id="placement" class="hp-section-title">Placement</h2>
		<ul class="notes">
			<li>
				Bottom centre on every screen, a gutter above the bottom edge and its safe area. It is as wide as its text, up
				to 30rem, and keeps the page gutters. Long text wraps and never shortens. For another cap, give the Toaster a
				class and set <code>--toast-width</code> in the app’s stylesheet:
				<code>.wide-toast &#123; --toast-width: 36rem; &#125;</code>. A <code>style</code> passed to a
				Hardpoint component is applied through the CSSOM and also works under a strict Content Security Policy, but
				a <code>style</code> attribute on an element in the app’s own markup is blocked.
			</li>
			<li>
				On phones it sits above AppShell’s bottom bar. While the on-screen keyboard is up, it sits above the keyboard.
			</li>
			<li>
				It is on <code class="nowrap">--layer-toast</code>: above dialogs, sheets, popovers and menus, below
				tooltips. A press on it does not close the dialog or menu under it.
			</li>
		</ul>
	</section>

	<section aria-labelledby="a11y">
		<h2 id="a11y" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				A hidden status line, mounted with the Toaster, reads each message to screen readers. The same message twice is
				read twice. The toast itself is not a live region, so its fade never repeats it.
			</li>
			<li>
				The toast never takes focus by itself. It is a region named Notifications, last in the page, so screen reader
				users can reach it by landmark. <kbd>F8</kbd> moves focus to the action, or to the close button when there is
				no action, and <kbd>Tab</kbd> moves between them. <kbd>Escape</kbd>, the close button or the action dismisses
				the toast and puts focus back where it was.
			</li>
			<li>
				The action and the close button are 44px high on touch screens. Text is 16px on touch screens and 14px with a
				mouse.
			</li>
		</ul>
	</section>
</main>

<Toaster />

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

	/* The project the archive sample acts on. */
	.project {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin: 0;
	}
	.state {
		color: var(--muted);
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
