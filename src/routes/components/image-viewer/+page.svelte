<script lang="ts">
	import { Button, ImageViewer, MediaFrame, MediaImage, Toaster, toast } from '#lib';
	import { staircase } from '../../staircase';

	// ---- Photo, with the back gesture ----------------------------------------

	// The pattern from the Back gesture section, as an app without a router
	// writes it. SvelteKit, which runs these docs, warns once in development
	// that it prefers its own history helpers; the pattern still works here.
	let photoOpen = $state(false);
	$effect(() => {
		if (!photoOpen) return;
		history.pushState({ imageViewer: true }, '');
		const back = () => (photoOpen = false);
		addEventListener('popstate', back);
		return () => {
			removeEventListener('popstate', back);
			if (history.state?.imageViewer) history.back();
		};
	});

	// ---- Title and download --------------------------------------------------

	// The same photo held as a data: URL, as an image the app made or read
	// from a file would be.
	let dataUrl = $state<string | undefined>();
	$effect(() => {
		const request = new AbortController();
		fetch(staircase.src, { signal: request.signal })
			.then((response) => response.blob())
			.then((blob) => {
				const read = Promise.withResolvers<string>();
				const reader = new FileReader();
				reader.onload = () => read.resolve(reader.result as string);
				reader.onerror = () => read.reject(reader.error);
				reader.readAsDataURL(blob);
				return read.promise;
			})
			.then(
				(url) => (dataUrl = url),
				() => {}
			);
		return () => request.abort();
	});

	// ---- Your own save -------------------------------------------------------

	type SavePicker = (options: {
		suggestedName?: string;
		types?: { description?: string; accept: Record<string, string[]> }[];
	}) => Promise<FileSystemFileHandle>;

	// Asks where to save and confirms once the file is written. A cancelled
	// picker says nothing. A browser without the picker downloads the file.
	async function saveWithPicker() {
		const name = 'staircase.jpg';
		const blob = await (await fetch(staircase.src)).blob();
		const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
		if (!picker) {
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = name;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
			toast(`Downloading ${name}`);
			return;
		}
		let handle: FileSystemFileHandle;
		try {
			handle = await picker({
				suggestedName: name,
				types: [{ description: 'JPEG image', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } }]
			});
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			throw e;
		}
		const file = await handle.createWritable();
		await file.write(blob);
		await file.close();
		toast(`Saved ${name}`);
	}

	// ---- Loading and errors --------------------------------------------------

	// After each close the next open asks for a fresh copy, so it is slow
	// every time.
	let slowOpen = $state(false);
	let slowCount = $state(0);
	const slowSrc = $derived(`/components/image-viewer/slow-photo.jpg?n=${slowCount}`);
	$effect(() => {
		if (!slowOpen) return;
		return () => slowCount++;
	});

	// A few bytes of text: an error that makes no network request.
	let brokenSrc = $state('');
	$effect(() => {
		const url = URL.createObjectURL(new Blob(['Not an image'], { type: 'image/jpeg' }));
		brokenSrc = url;
		return () => URL.revokeObjectURL(url);
	});

	const usage = `<ImageViewer src={url} alt="…">
  {#snippet trigger({ props })}
    <button {...props} class="thumbnail">
      <MediaFrame ratio="3 / 2">
        <MediaImage src={thumbnailUrl} alt="…" />
      </MediaFrame>
    </button>
  {/snippet}
</ImageViewer>`;

	const backPattern = `let open = $state(false);

$effect(() => {
  if (!open) return;
  history.pushState({ imageViewer: true }, '');
  const back = () => (open = false);
  addEventListener('popstate', back);
  return () => {
    removeEventListener('popstate', back);
    // Closed another way: take the entry back off.
    if (history.state?.imageViewer) history.back();
  };
});`;
</script>

<svelte:head>
	<title>Image viewer · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Image viewer</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		One image over the whole screen, to look at closely. Two fingers, a double-tap, the wheel or the keys zoom it,
		and one finger or the arrow keys move it while it is zoomed. It fills the screen at every width, in the theme’s
		canvas colour. A button around a thumbnail opens it, so the keyboard reaches it too.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<pre><code>{usage}</code></pre>
		<ul class="notes">
			<li>
				<code>src</code> and <code>alt</code> are required. <code>alt</code> describes the image to screen readers. It
				also names the viewer when there is no <code>title</code>, so never leave it empty here.
			</li>
			<li>
				<code>title</code> puts a line in the top bar as written, such as a file name. A long one ends in an ellipsis
				on one line. When it is set, it names the viewer instead of <code>alt</code>.
			</li>
			<li>
				Open it from <code>trigger</code>, a snippet that spreads <code>props</code> onto a button around a thumbnail,
				or bind <code>open</code> from anywhere. The thumbnail’s <code>alt</code> names the button. Give the button no
				padding, border or background, so the frame is the target; this page also brightens the frame’s line on hover
				and press. Closing returns focus to the element that had it.
			</li>
			<li>
				<code>downloadName</code> shows a Download button that saves <code>src</code> under that file name.
				<code>ondownload</code> shows it too and replaces the built-in save. <code>downloadLabel</code> (default
				Download), <code>closeLabel</code> (default Close) and <code>loadingLabel</code> (default Loading image) set
				the words.
			</li>
			<li>
				Extra attributes go to the viewer element, with Bits UI’s <code>onOpenAutoFocus</code>,
				<code>onCloseAutoFocus</code>, <code>onEscapeKeydown</code> and <code>onInteractOutside</code>;
				<code>bind:ref</code> gives that element. The stage, <code>.hp-image-viewer-stage</code>, carries
				<code>data-state</code> (loading, loaded or error), <code>data-zoomed</code> above scale 1 and
				<code>data-gesture</code> (pan or pinch) while one runs.
			</li>
		</ul>
	</section>

	<section aria-labelledby="photo">
		<h2 id="photo" class="hp-section-title">Photo</h2>
		<p class="lede">
			A framed thumbnail opens the photo. Tap or click it, or move focus to it and press <kbd>Enter</kbd>. This one
			also closes with the browser’s back button or the system back gesture, as shown under Back gesture.
		</p>
		<figure class="figure">
			<ImageViewer bind:open={photoOpen} src={staircase.src} alt={staircase.alt}>
				{#snippet trigger({ props })}
					<button {...props} class="thumbnail">
						<MediaFrame ratio="3 / 2">
							<MediaImage
								src={staircase.src}
								alt={staircase.alt}
								width={staircase.width}
								height={staircase.height}
							/>
						</MediaFrame>
					</button>
				{/snippet}
			</ImageViewer>
			<figcaption class="hp-caption">Staircase at Küppersmühle museum, Duisburg. Duesseljan, CC0</figcaption>
		</figure>
	</section>

	<section aria-labelledby="download">
		<h2 id="download" class="hp-section-title">Title and download</h2>
		<p class="lede">
			A file name in the top bar and a Download button. The first opens a file from this site. The second holds the
			same photo as a <code>data:</code> URL, which the viewer turns into a <code>blob:</code> URL to save it.
		</p>
		<div class="row">
			<ImageViewer
				src={staircase.src}
				alt={staircase.alt}
				title="staircase-at-kuppersmuhle-museum-duisburg.jpg"
				downloadName="staircase.jpg"
			>
				{#snippet trigger({ props })}
					<Button {...props} opens>View file</Button>
				{/snippet}
			</ImageViewer>
			{#if dataUrl}
				<ImageViewer src={dataUrl} alt={staircase.alt} title="photo.jpg" downloadName="photo.jpg">
					{#snippet trigger({ props })}
						<Button {...props} opens>View data URL</Button>
					{/snippet}
				</ImageViewer>
			{:else}
				<Button opens disabled>View data URL</Button>
			{/if}
		</div>
		<ul class="notes">
			<li>
				Download saves the image through a link with the <code>download</code> attribute, under
				<code>downloadName</code>. A <code>data:</code> URL becomes a <code>blob:</code> URL first, because browsers
				limit links to long <code>data:</code> URLs; the viewer revokes it a minute later.
			</li>
			<li>
				An image from another origin needs <code>ondownload</code>. Browsers ignore <code>download</code> on a link to
				another origin and open the image instead, so the file would keep the server’s name, or none. Fetch it in
				<code>ondownload</code>, where that server allows it, and save the blob. Without <code>ondownload</code> the
				link opens in a new tab, so the app stays where it is.
			</li>
		</ul>
	</section>

	<section aria-labelledby="own-save">
		<h2 id="own-save" class="hp-section-title">Your own save</h2>
		<p class="lede">
			<code>ondownload</code> replaces the built-in save. Here it asks where to save with the browser’s save picker
			and confirms with a toast once the file is written; a cancelled picker says nothing. A browser without the
			picker downloads the file and says so. While the promise it returns is pending, another press on Download
			does nothing.
		</p>
		<div class="row">
			<ImageViewer src={staircase.src} alt={staircase.alt} title="staircase.jpg" ondownload={saveWithPicker}>
				{#snippet trigger({ props })}
					<Button {...props} opens>View with save picker</Button>
				{/snippet}
			</ImageViewer>
		</div>
	</section>

	<section aria-labelledby="loading">
		<h2 id="loading" class="hp-section-title">Loading and errors</h2>
		<p class="lede">
			The first photo arrives 1.5 seconds late: after 300ms a spinner shows in the middle. The second file is not an
			image: its alt text shows as a muted caption where the image would be, and Download stays.
		</p>
		<div class="row">
			<ImageViewer bind:open={slowOpen} src={slowSrc} alt={staircase.alt}>
				{#snippet trigger({ props })}
					<Button {...props} opens>View slow photo</Button>
				{/snippet}
			</ImageViewer>
			<ImageViewer src={brokenSrc} alt={staircase.alt} title="staircase.jpg" downloadName="staircase.jpg">
				{#snippet trigger({ props })}
					<Button {...props} opens>View broken file</Button>
				{/snippet}
			</ImageViewer>
		</div>
	</section>

	<section aria-labelledby="gestures">
		<h2 id="gestures" class="hp-section-title">Gestures and keys</h2>
		<ul class="notes">
			<li>Zoom runs from 1, the size that fits the screen, to 6 times that. A smaller image starts at its own size.</li>
			<li>
				<strong>Pinch.</strong> Two fingers zoom about the point between them, and the image follows them. Released
				below 1, or less than 5 percent above it, it settles back to 1, so it never rests a few pixels too large.
			</li>
			<li><strong>Double-tap or double-click.</strong> Zooms to 2.5 about the pressed point, or back to 1.</li>
			<li><strong>Wheel.</strong> Zooms about the cursor. A trackpad pinch does the same.</li>
			<li>
				<strong>Keys.</strong> <kbd>+</kbd> or <kbd>=</kbd> zooms in, <kbd>-</kbd> zooms out, <kbd>0</kbd> goes back
				to 1, and the arrow keys move the image while it is zoomed. Each press jumps.
			</li>
			<li>
				<strong>Pan.</strong> While the image is zoomed, one finger or a mouse drag moves it. It stops where an edge
				would leave a gap the image could fill.
			</li>
			<li>
				<strong>Closing.</strong> Close, <kbd>Escape</kbd>, a swipe down, or a press on the space around the image.
				The swipe and the press work at scale 1 only, so no gesture closes a zoomed image. A drag never counts as a
				press. Focus starts on Close and returns to the trigger.
			</li>
		</ul>
	</section>

	<section aria-labelledby="back">
		<h2 id="back" class="hp-section-title">Back gesture</h2>
		<p class="lede">
			On a phone, people leave a full-screen view with the back gesture. The viewer leaves the history to the app:
			add an entry when it opens and close it on <code>popstate</code>. When it closes another way, take the entry
			back off. The Photo sample above works this way.
		</p>
		<pre><code>{backPattern}</code></pre>
	</section>

	<section aria-labelledby="motion">
		<h2 id="motion" class="hp-section-title">Motion</h2>
		<ul class="notes">
			<li>
				The viewer fades in over <code>--dur-sheet</code> (240ms) and out over <code>--dur-sheet-exit</code> (170ms),
				as a dialog does. Reduced motion keeps the fade, since nothing moves.
			</li>
			<li>Pinch, pan, the wheel and the keys follow at once, with no easing.</li>
			<li>
				A double-tap zoom and the settle back to 1 move over <code>--dur-pop</code> (160ms) on
				<code>--settle</code>. With reduced motion they jump.
			</li>
		</ul>
	</section>

	<section aria-labelledby="access">
		<h2 id="access" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				The viewer is a modal dialog named by <code>title</code>, or by <code>alt</code> without one. The image keeps
				its <code>alt</code>. Nothing is announced on zoom.
			</li>
			<li>
				A pinch has single-pointer and key alternatives: the double-tap, the wheel and the keys. A drag has them too:
				the arrow keys pan, and a double-tap back to 1 and another on a different part brings that part up close.
				The swipe down has Close and <kbd>Escape</kbd>.
			</li>
			<li>
				The top bar sits under the top safe area. Download and Close are 44px high on touch screens and 36px with a
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

	pre {
		margin: var(--space-3) 0 var(--space-5);
		overflow-x: auto;
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
	.row + .notes {
		margin-top: var(--space-5);
	}

	.figure {
		max-width: 24rem;
	}
	figcaption {
		margin-top: var(--space-2);
		color: var(--muted);
	}

	/* The thumbnail is the button: the frame's hairline takes the control
	   boundary on hover and press. */
	.thumbnail {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: zoom-in;
		-webkit-tap-highlight-color: transparent;
	}
	.thumbnail :global(.hp-media-frame) {
		transition: border-color var(--dur-press) var(--settle);
	}
	.thumbnail:active :global(.hp-media-frame) {
		border-color: var(--border-control);
	}
	@media (hover: hover) and (pointer: fine) {
		.thumbnail :global(.hp-media-frame) {
			transition-duration: var(--dur-hover);
		}
		.thumbnail:hover :global(.hp-media-frame) {
			border-color: var(--border-control);
		}
		.thumbnail:active :global(.hp-media-frame) {
			transition-duration: var(--dur-press);
		}
	}
</style>
