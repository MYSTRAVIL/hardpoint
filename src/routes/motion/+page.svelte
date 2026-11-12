<script lang="ts">
	import { flushSync, onMount } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import KeyValueList from '#lib/components/KeyValueList.svelte';
	import LoadRegion from '#lib/components/LoadRegion.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import MenuItem from '#lib/components/MenuItem.svelte';
	import MenuSeparator from '#lib/components/MenuSeparator.svelte';
	import Select, { type SelectItem } from '#lib/components/Select.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Stat from '#lib/components/Stat.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import Table, { type Column } from '#lib/components/Table.svelte';
	import Tag from '#lib/components/Tag.svelte';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import { Motion, useMotion } from '#lib/motion/index.js';
	import {
		SLOW_FACTOR,
		applyTuning,
		current,
		durationTokens,
		isUntuned,
		loadTuning,
		nudge,
		saveTuning,
		tuningCss,
		untuned,
		type DurationName,
		type TunedToken,
		type Tuning
	} from '../motion-tuning';
	import DecodeDemo from './DecodeDemo.svelte';
	import FlickerDemo from './FlickerDemo.svelte';
	import ImageDemo from './ImageDemo.svelte';
	import ShortDemo, { type ShortFamily } from './ShortDemo.svelte';

	const motion = useMotion();
	const token = (name: DurationName) => durationTokens.find((t) => t.name === name)!;

	// ---- Tuning ------------------------------------------------------------

	// The server renders the defaults; the browser loads this tab's tuning on
	// mount. Every change after that is saved and applied to <html>.
	let tuning = $state<Tuning>(untuned());
	let loaded = false;
	let announcement = $state('');

	const css = $derived(tuningCss(tuning));
	const untouched = $derived(isUntuned(tuning));

	$effect(() => {
		const t = $state.snapshot(tuning);
		if (!loaded) return;
		saveTuning(t);
		applyTuning(t);
	});

	function step(t: TunedToken, steps: number) {
		nudge(tuning, t, steps);
		announcement = `${t.name} ${current(tuning, t)}ms`;
	}
	function resetToken(t: TunedToken) {
		delete tuning.durations[t.name];
		announcement = `${t.name} back to ${t.default}ms`;
	}
	function resetAll() {
		tuning = untuned();
		announcement = 'Every token back to its stylesheet value';
	}

	// Copy: the clipboard API needs a secure context. A phone on the dev
	// server's network address has none, so the text is selected and copied
	// through the selection there.
	let pre = $state<HTMLPreElement>();
	let copied = $state<{ css: string; note: string } | null>(null);
	const copyNote = $derived(copied?.css === css ? copied.note : '');
	async function copyCss() {
		if (!css) return;
		const text = css;
		try {
			await navigator.clipboard.writeText(text);
			copied = { css: text, note: 'Copied.' };
		} catch {
			if (!pre) return;
			const range = document.createRange();
			range.selectNodeContents(pre);
			getSelection()?.removeAllRanges();
			getSelection()?.addRange(range);
			copied = {
				css: text,
				note: document.execCommand('copy') ? 'Copied.' : 'Selected. Copy it from the selection.'
			};
		}
	}

	// ---- Real components ---------------------------------------------------

	let replay = $state(0);
	let language = $state('en');
	const languages: SelectItem[] = [
		{ value: 'en', label: 'English' },
		{ value: 'de', label: 'Deutsch' },
		{ value: 'fr', label: 'Français' },
		{ value: 'es', label: 'Español' },
		{ value: 'pt', label: 'Português' },
		{ value: 'ja', label: '日本語' }
	];

	type FileRow = { id: string; name: string; owner: string; modified: string };
	const files: FileRow[] = [
		{ id: 'F-01', name: 'quarterly-report.pdf', owner: 'Lena Fischer', modified: '2026-11-08' },
		{ id: 'F-02', name: 'meeting-notes.md', owner: 'Omar Haddad', modified: '2026-11-08' },
		{ id: 'F-03', name: 'budget-2027.xlsx', owner: 'Priya Nair', modified: '2026-11-07' },
		{ id: 'F-04', name: 'team-photo.jpg', owner: 'Sam Okafor', modified: '2026-11-06' },
		{ id: 'F-05', name: 'onboarding-guide.docx', owner: 'Ingrid Berg', modified: '2026-11-05' },
		{ id: 'F-06', name: 'release-checklist.md', owner: 'Lena Fischer', modified: '2026-11-04' }
	];
	const fileColumns: Column<FileRow>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner', width: 'calc(14ch + var(--space-6))', hideBelow: 'expanded' },
		{ key: 'modified', label: 'Modified', width: 'calc(10ch + var(--bleed))' }
	];

	// ---- Short motion ------------------------------------------------------

	// One row per short-motion token. Each demo reads the token from the page,
	// so the tuning rows and slow motion apply to it.
	const shortRows: { family: ShortFamily; title: string; note: string }[] = [
		{
			family: 'mark',
			title: 'Selection marks',
			note: 'A change fades in the check, the mixed dash, the switch thumb and the menu marks at their new place. The thumb never slides. The menu stays open, so its marks change while it shows.'
		},
		{
			family: 'panel',
			title: 'Tab panel',
			note: 'A click or a tap fades the new panel in. Arrow keys, Home and End always cut.'
		},
		{
			family: 'segment',
			title: 'Progress and steps',
			note: 'Back and Forward move the upload by 10%. Segments fade their colour as they light or go out, and a step’s edge and tint fade when the current step changes.'
		},
		{
			family: 'message',
			title: 'Field error',
			note: 'Check shows the error or clears it. It fades in with the field’s red edge and goes at once.'
		}
	];

	// ---- Curves ------------------------------------------------------------

	// The live token values, so the plots follow tokens.css. The server
	// renders these copies of it.
	let settle = $state('cubic-bezier(0.2, 0.7, 0.2, 1)');
	let tick = $state('cubic-bezier(0.2, 0.7, 0.2, 1)');

	type CurveId = 'settle' | 'tick';
	const curves = $derived<
		{ id: CurveId; title: string; token: string; value: string; run: string; dur: TunedToken; note: string }[]
	>([
		{
			id: 'settle',
			title: 'Settle',
			token: '--settle',
			value: settle,
			run: 'var(--settle)',
			dur: token('--dur-sheet'),
			note: 'Ease out, for every response: presses, menus, dialogs and sheets. It plays at the sheet duration here.'
		},
		{
			id: 'tick',
			title: 'Tick',
			token: '--tick',
			value: tick,
			run: 'var(--tick)',
			dur: token('--dur-tick'),
			note: 'The number tick: fast at first, then easing into the new value. It is the settle curve, which the user chose over the reel’s counter curve.'
		}
	]);

	/** The control points of a `cubic-bezier()` value, or null. */
	function points(value: string): [number, number, number, number] | null {
		const m = value.match(/cubic-bezier\(([^)]+)\)/);
		const n = m ? m[1].split(',').map(Number) : [];
		return n.length === 4 && n.every(Number.isFinite) ? [n[0], n[1], n[2], n[3]] : null;
	}

	/** The curve as an SVG path in a 128px box: time across, progress up. */
	function plot(value: string): string {
		const p = points(value);
		if (!p) return '';
		const x = (t: number) => 0.5 + t * 127;
		const y = (v: number) => 0.5 + (1 - v) * 127;
		return `M${x(0)} ${y(0)}C${x(p[0])} ${y(p[1])} ${x(p[2])} ${y(p[3])} ${x(1)} ${y(1)}`;
	}

	const blocks: Partial<Record<CurveId, HTMLElement>> = {};
	const runs = $state<Partial<Record<CurveId, boolean>>>({});
	function play(id: CurveId) {
		// Back to the start without a transition, a style flush, then across
		// with one.
		flushSync(() => (runs[id] = false));
		void blocks[id]?.offsetWidth;
		runs[id] = true;
	}

	// ---- Tick --------------------------------------------------------------

	const numbers = new Intl.NumberFormat('en-US');
	const groupThousands = (n: number) => numbers.format(n);
	/** A change as the app writes it: a sign, a true minus, grouping. */
	const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '\u2212' : '') + numbers.format(Math.abs(n));

	let value = $state(12480);
	let change = $state(1204);

	function changeValue() {
		let next = value;
		while (next === value) next = 1000 + Math.floor(Math.random() * 99000);
		change = next - value;
		value = next;
	}

	// ---- Skeleton to content -----------------------------------------------

	// One record that loads on demand. Its region reads --dur-reveal from the
	// page, so the tuning rows and slow motion apply to it.
	let recordLoading = $state(false);
	let recordLoaded = $state(false);
	let recordTimer: ReturnType<typeof setTimeout> | undefined;
	function loadRecord(ms: number) {
		clearTimeout(recordTimer);
		recordLoading = true;
		recordTimer = setTimeout(() => {
			recordLoading = false;
			recordLoaded = true;
		}, ms);
	}
	$effect(() => () => clearTimeout(recordTimer));

	// The record's values, with the widths of the bars that stand for them.
	const projectFields = [
		{ key: 'Owner', value: 'Lena Fischer', width: '12ch' },
		{ key: 'Due', value: '2026-12-04', width: '10ch' },
		{ key: 'Status', value: 'Active', width: '6ch' }
	];

	// ---- Images and flicker-on ---------------------------------------------

	// Load both starts a load in each image demo. Replay remounts both flicker
	// mocks, so they appear for the first time again.
	let fadeDemo = $state<ReturnType<typeof ImageDemo>>();
	let resolveDemo = $state<ReturnType<typeof ImageDemo>>();
	let flickerReplay = $state(0);

	// ---- Decode ------------------------------------------------------------

	// Replay remounts the mock view, so its labels appear for the first time
	// again.
	let decodeReplay = $state(0);

	onMount(() => {
		tuning = loadTuning();
		loaded = true;
		const root = getComputedStyle(document.documentElement);
		settle = root.getPropertyValue('--settle').trim() || settle;
		tick = root.getPropertyValue('--tick').trim() || tick;
	});
</script>

<svelte:head>
	<title>Motion · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Motion</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Tokens set every duration and curve. Changes on this page retune the whole site, for this tab only: open
		the <a href="/specimen">specimen pages</a> and the <a href="/app">specimen app</a> to feel them there.
		Closing the tab drops them.
		{#if motion.reduced}
			Reduced motion is on in this browser, so overlays fade without moving, the stagger, the tick and the
			blocks below jump to their end, and nothing decodes, resolves or flickers.
		{:else}
			Reduced motion is off in this browser.
		{/if}
	</p>

	<section aria-labelledby="durations">
		<h2 id="durations" class="hp-section-title">Durations</h2>
		<p class="lede">
			One row per token. The buttons change a value by 10ms, the stagger step by 5ms, and the resolve step
			and the lab frame by 2ms, never below 0. Each change applies at once, on every page in this tab. Reset
			all also turns slow motion off.
		</p>

		<div class="rows" role="table" aria-label="Duration tokens">
			<div class="row head" role="row">
				<span class="hp-label" role="columnheader">Token</span>
				<span class="hp-label" role="columnheader">Role</span>
				<span class="hp-label num" role="columnheader">Default</span>
				<span class="hp-label num" role="columnheader">Current</span>
				<span role="columnheader"><span class="hp-visually-hidden">Change</span></span>
			</div>
			{#each durationTokens as t (t.name)}
				{@const ms = current(tuning, t)}
				{@const changed = tuning.durations[t.name] !== undefined}
				<div class="row" role="row">
					<span class="token" role="cell"><code>{t.name}</code></span>
					<span class="role hp-dense" role="cell">{t.role}</span>
					<span class="num default hp-mono hp-num hp-dense" role="cell"
						><span class="cell-label hp-label" aria-hidden="true">Default</span>{t.default}ms</span
					>
					<span class="num now hp-mono hp-num" role="cell"
						><span class="cell-label hp-label" aria-hidden="true">Current</span>{ms}ms</span
					>
					<span class="controls" role="cell">
						<Button
							icon
							aria-label="Shorter {t.name}"
							aria-disabled={ms === 0 ? 'true' : undefined}
							onclick={() => step(t, -1)}
						>
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M3 8h10" /></svg>
						</Button>
						<Button icon aria-label="Longer {t.name}" onclick={() => step(t, 1)}>
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg>
						</Button>
						<Button
							variant="tertiary"
							aria-label="Reset {t.name}"
							aria-disabled={changed ? undefined : 'true'}
							onclick={() => resetToken(t)}>Reset</Button
						>
					</span>
				</div>
			{/each}
		</div>
		<p class="hp-visually-hidden" role="status">{announcement}</p>

		<div class="tools">
			<div class="slow">
				<Switch
					label="Slow motion ×{SLOW_FACTOR}"
					hint="Every duration above runs five times longer, on top of the changes. The copied CSS leaves it out."
					bind:checked={tuning.slow}
				/>
			</div>
			<Button aria-disabled={untouched ? 'true' : undefined} onclick={resetAll}>Reset all</Button>
		</div>

		<div class="changes">
			<h3 class="sub">Changed tokens</h3>
			<pre class="hp-dense" class:empty={!css} bind:this={pre}>{css ||
					'Nothing changed. Every token has its stylesheet value.'}</pre>
			<div class="row-inline">
				<Button aria-disabled={css ? undefined : 'true'} onclick={copyCss}>Copy</Button>
				<p class="hp-caption readout" aria-live="polite">{copyNote}</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="components">
		<h2 id="components" class="hp-section-title">Feel them on real components</h2>
		<p class="lede">
			Each note names the tokens its control runs on. Reduced motion fades the overlays without moving them.
		</p>
		<div class="demos">
			<div class="demo">
				<h3 class="sub">Buttons</h3>
				<p class="hp-dense note">
					A mouse hover fades over <code>--dur-hover</code>, a press over <code>--dur-press</code>. On touch
					the press shows at once.
				</p>
				<div class="row-inline">
					<Button variant="primary">Save</Button>
					<Button>Preview</Button>
				</div>
			</div>

			<div class="demo">
				<h3 class="sub">Menu</h3>
				<p class="hp-dense note">
					Opens over <code>--dur-pop</code>, closes over <code>--dur-pop-exit</code>. Below 600px it is a
					sheet, on <code>--dur-sheet</code> and <code>--dur-sheet-exit</code>.
				</p>
				<div class="row-inline">
					<Menu label="Actions">
						{#snippet trigger({ props })}
							<Button {...props}>Actions</Button>
						{/snippet}
						<MenuItem>Rename</MenuItem>
						<MenuItem>Duplicate</MenuItem>
						<MenuItem>Move to folder</MenuItem>
						<MenuSeparator />
						<MenuItem variant="danger">Delete</MenuItem>
					</Menu>
				</div>
			</div>

			<div class="demo">
				<h3 class="sub">Tooltip</h3>
				<p class="hp-dense note">
					Opens over <code>--dur-pop</code>, closes over <code>--dur-pop-exit</code>. A resting mouse
					pointer or keyboard focus opens it; touch never does.
				</p>
				<div class="row-inline">
					<Tooltip text="Copy link">
						{#snippet trigger({ props })}
							<Button {...props} icon variant="tertiary" aria-label="Copy link">
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M5 5h8v8H5zM3 11V3h8" /></svg>
							</Button>
						{/snippet}
					</Tooltip>
				</div>
			</div>

			<div class="demo">
				<h3 class="sub">Select</h3>
				<p class="hp-dense note">
					The list opens under the field over <code>--dur-pop</code>. Below 600px it is a sheet, on
					<code>--dur-sheet</code>.
				</p>
				<Select label="Language" items={languages} bind:value={language} />
			</div>

			<div class="demo">
				<h3 class="sub">Dialog</h3>
				<p class="hp-dense note">
					Opens over <code>--dur-sheet</code>, closes over <code>--dur-sheet-exit</code>: centred from
					600px, a sheet below.
				</p>
				<div class="row-inline">
					<Dialog
						title="Archive project"
						description="Website redesign moves to the archive. Members keep read access."
					>
						{#snippet trigger({ props })}
							<Button {...props}>Archive project</Button>
						{/snippet}
						{#snippet actions({ close })}
							<Button onclick={close}>Cancel</Button>
							<Button variant="primary" onclick={close}>Archive</Button>
						{/snippet}
					</Dialog>
				</div>
			</div>

			<div class="demo wide">
				<h3 class="sub">Table entrance</h3>
				<p class="hp-dense note">
					{#if motion.reduced}
						Reduced motion is on, so the rows appear at once and Replay shows no movement.
					{:else}
						In the expressive tier the rows of the first render enter <code>--stagger-step</code> apart,
						each over <code>--dur-enter</code>. This table always runs in that tier, and Replay remounts
						it. Slow motion above makes each row easy to follow.
					{/if}
				</p>
				<div class="row-inline">
					<Button onclick={() => (replay += 1)}>Replay entrance</Button>
				</div>
				<Motion tier="expressive">
					{#key replay}
						<Table label="Files" rows={files} columns={fileColumns} key="id" />
					{/key}
				</Motion>
			</div>
		</div>
	</section>

	<section aria-labelledby="short">
		<h2 id="short" class="hp-section-title">Short motion</h2>
		<p class="lede">
			These controls change many times a day, so their motion is short and only fades. Nothing moves and
			nothing changes size. Tab changes made with keys always cut, so holding an arrow key starts no fade.
			Nothing fades when a page loads or a menu opens. Each row reads its token, so the rows above retune
			it and slow motion stretches it; 0ms makes it a snap.
			{#if motion.reduced}
				Reduced motion is on, and these still fade: they change only opacity and colour.
			{:else}
				With reduced motion these still fade: they change only opacity and colour.
			{/if}
		</p>
		<div class="short-rows">
			{#each shortRows as row (row.family)}
				{@const t = token(`--dur-${row.family}`)}
				<div class="short-row">
					<h3 class="sub">{row.title}</h3>
					<p class="hp-dense note">{row.note}</p>
					<p class="hp-dense note">
						<code>{t.name}</code>
						<span class="hp-num">{current(tuning, t)}ms</span>{#if tuning.slow}
							×{SLOW_FACTOR}{/if}
					</p>
					<ShortDemo family={row.family} />
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="curves">
		<h2 id="curves" class="hp-section-title">Curves</h2>
		<p class="lede">
			Each plot shows progress rising over time. Play moves the block across at the token’s current
			duration, so the changes above apply.
			{#if motion.reduced}
				Reduced motion is on, so each block jumps to its end without moving.
			{:else}
				With reduced motion each block jumps to its end without moving.
			{/if}
		</p>
		<div class="curves">
			{#each curves as c (c.id)}
				<div class="curve" style:--run-curve={c.run} style:--run-dur="var({c.dur.name})">
					<h3 class="sub">{c.title}</h3>
					<svg class="plot" viewBox="0 0 128 128" aria-hidden="true">
						<rect x="0.5" y="0.5" width="127" height="127" />
						<path d={plot(c.value)} />
					</svg>
					<p class="hp-mono hp-dense value">{c.token}<br />{c.value}</p>
					<p class="hp-dense note">{c.note}</p>
					<div class="track">
						<span class="block" data-run={runs[c.id] ? '' : undefined} bind:this={blocks[c.id]}></span>
					</div>
					<div class="row-inline">
						<Button aria-label="Play {c.title}" onclick={() => play(c.id)}>Play</Button>
						<span class="hp-dense note"
							><code>{c.dur.name}</code>
							<span class="hp-num">{current(tuning, c.dur)}ms</span>{#if tuning.slow}
								×{SLOW_FACTOR}{/if}</span
						>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="tick">
		<h2 id="tick" class="hp-section-title">Tick</h2>
		<p class="lede">
			A number that changes through an action or a live update ticks from the old value to the new one over
			<code>--dur-tick</code> on the <code>--tick</code> curve, never on load. This is the real
			<code>Stat</code>. Press Change value again during a tick: the figure continues from the value on
			screen.
			{#if motion.reduced}
				Reduced motion is on, so the figure jumps to the new value.
			{:else}
				With reduced motion the figure jumps.
			{/if}
		</p>
		<Stat
			variant="display"
			label="Storage used"
			{value}
			format={groupThousands}
			unit="MB"
			delta={signed(change)}
			deltaNote="since the last change"
		/>
		<div class="row-inline tick-actions">
			<Button onclick={changeValue}>Change value</Button>
		</div>
	</section>

	<section aria-labelledby="reveal">
		<h2 id="reveal" class="hp-section-title">Skeleton to content</h2>
		<p class="lede">
			When data takes more than 300ms, skeleton blocks that mirror the content fill its place, and the
			content replaces them when it arrives. The blocks show only after 300ms
			(<code>--skeleton-delay</code>). The content then crossfades in over <code>--dur-reveal</code>: each bar
			turns into its text, and the tag and the labels, which the blocks already show, stay as they are.
			Content that arrives sooner never shows blocks, so it appears at once. Retune
			<code>--dur-reveal</code> above; 0ms makes it a cut.
			{#if motion.reduced}
				Reduced motion is on, and the fade still runs: it changes only opacity.
			{:else}
				With reduced motion the fade still runs: it changes only opacity.
			{/if}
		</p>
		<div class="reveal">
			<div class="row-inline">
				<Button onclick={() => loadRecord(1200)}>Load in 1.2s</Button>
				<Button onclick={() => loadRecord(150)}>Load in 150ms</Button>
			</div>
			<LoadRegion
				loading={recordLoading}
				status={recordLoading ? 'Loading the project' : recordLoaded ? 'Project loaded' : ''}
			>
				{#snippet placeholder()}
					<div class="record">
						<div>
							<Tag>Project ID</Tag>
							<Skeleton class="hp-display hp-mono" width="8ch" />
						</div>
						<KeyValueList items={projectFields} keyWidth="6rem">
							{#snippet value(item)}<Skeleton width={item.width} />{/snippet}
						</KeyValueList>
						<Skeleton lines={2} width="15.5rem" />
					</div>
				{/snippet}
				<div class="record">
					<div>
						<Tag>Project ID</Tag>
						<p class="hp-display hp-mono">PRJ-0417</p>
					</div>
					<KeyValueList items={projectFields} keyWidth="6rem" />
					<p>Kick-off with the team on Monday.<br />Draft by 4 December.</p>
				</div>
			</LoadRegion>
		</div>
	</section>

	<section aria-labelledby="images">
		<h2 id="images" class="hp-section-title">Images</h2>
		<p class="lede">
			<code>MediaImage</code> fills a media frame with a photo. While the photo loads, a skeleton block fills
			the frame after 300ms (<code>--skeleton-delay</code>), as everywhere else. A photo that arrives within
			300ms, or is already cached, appears at once. A later one takes over from the block: it resolves from a
			mosaic only in the expressive tier, and fades in everywhere else and with reduced motion. Slow motion
			stretches both: it multiplies <code>--dur-reveal</code> and <code>--resolve-step</code>.
			{#if motion.reduced}
				Reduced motion is on, so both photos fade in.
			{:else}
				With reduced motion both photos fade in.
			{/if}
		</p>
		<div class="image-section">
			<div class="load-both">
				<p class="hp-dense note">
					Each button holds the photo back, as a slow network would. Load both starts a 1.2s load in both
					frames.
				</p>
				<div class="row-inline">
					<Button
						onclick={() => {
							fadeDemo?.load(1200);
							resolveDemo?.load(1200);
						}}>Load both</Button
					>
				</div>
			</div>

			<div class="images">
				<ImageDemo bind:this={fadeDemo} name="quiet tier" title="Quiet tier: fade">
					The photo fades in over the block for <code>--dur-reveal</code> on <code>--settle</code>, as content
					replaces skeletons above. Only opacity changes, so the fade also runs with reduced motion.
				</ImageDemo>
				<Motion tier="expressive">
					<ImageDemo bind:this={resolveDemo} name="expressive tier" title="Expressive tier: resolve">
						{#if motion.reduced}
							Reduced motion is on, so the photo fades in, as in the quiet tier.
						{:else}
							The photo arrives as square blocks that halve each step: about 32, 16, 8, 4 and 2px, one
							<code>--resolve-step</code> each. Then the photo itself shows, about 210ms after the first
							blocks.
						{/if}
					</ImageDemo>
				</Motion>
			</div>
		</div>
	</section>

	<section aria-labelledby="flicker">
		<h2 id="flicker" class="hp-section-title">Flicker-on (lab)</h2>
		<p class="lede">
			A lab piece, kept as a reference: no component uses it and the package does not ship it; its code
			lives beside this page. The mock switches on as labels do in the reel: on for one frame, off for one,
			then on for good. One frame is <code>--decode-frame</code>. Beside it, the same mock fades in over
			<code>--dur-reveal</code>. Replay remounts both. A flicker less than a second after the last one is
			skipped, so nothing here flashes more than once a second.
			{#if motion.reduced}
				Reduced motion is on, so the flicker is off and its mock shows at once.
			{:else}
				With reduced motion the flicker mock shows at once; the fade still runs.
			{/if}
		</p>
		<Motion tier="expressive">
			<div class="flicker">
				<div class="row-inline">
					<Button onclick={() => (flickerReplay += 1)}>Replay</Button>
				</div>
				<div class="mocks">
					<figure class="mock-demo">
						<figcaption class="hp-dense note">Flicker-on</figcaption>
						<div class="panel">
							{#key flickerReplay}
								<FlickerDemo mode="flicker" />
							{/key}
						</div>
					</figure>
					<figure class="mock-demo">
						<figcaption class="hp-dense note">Fade</figcaption>
						<div class="panel">
							{#key flickerReplay}
								<FlickerDemo mode="fade" />
							{/key}
						</div>
					</figure>
				</div>
			</div>
		</Motion>
	</section>

	<section aria-labelledby="decode">
		<h2 id="decode" class="hp-section-title">Decode (lab)</h2>
		<p class="lede">
			A lab piece, kept as a reference. It reads as a gimmick in real apps, so no component uses it and
			the package does not ship it; its code lives beside this page. Short fixed labels and titles decode
			when they first appear in the expressive tier: two frames of solid blocks, three frames of Geist
			Pixel Square noise, then the clean text. One frame is <code>--decode-frame</code>, 42ms unless the
			row above changes it, so a decode takes about 250ms. Each label starts on its own clock, up to two
			frames late, and the content below the header starts one frame after it. Values, user data and body
			text never decode. Screen readers get the final text the whole time.
			{#if motion.reduced}
				Reduced motion is on, so nothing decodes: Replay shows the text at once.
			{:else}
				With reduced motion nothing decodes.
			{/if}
		</p>
		<div class="decode">
			<div class="row-inline">
				<Button onclick={() => (decodeReplay += 1)}>Replay</Button>
			</div>
			<Motion tier="expressive">
				{#key decodeReplay}
					<DecodeDemo />
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

	/* Token names never break at their hyphens. */
	code {
		font-size: 0.875em;
		white-space: nowrap;
	}

	/* Headings inside the sections, as written. */
	.sub {
		font-weight: 500;
	}
	.note,
	.readout {
		color: var(--muted);
	}

	.row-inline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}

	/* ---- Durations ------------------------------------------------------ */

	/* Below 900px each token stacks over its buttons, and the rows group by
	   space. From 900px: one line per token under a header band. */
	.rows {
		display: grid;
		gap: var(--space-6);
		max-width: calc(60rem + 2 * var(--bleed));
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			'token now'
			'role default'
			'controls controls';
		align-items: center;
		gap: var(--space-1) var(--space-4);
	}
	.row > :nth-child(1) {
		grid-area: token;
	}
	.row > :nth-child(2) {
		grid-area: role;
	}
	.row > :nth-child(3) {
		grid-area: default;
	}
	.row > :nth-child(4) {
		grid-area: now;
	}
	.row > :nth-child(5) {
		grid-area: controls;
	}
	/* The header row stays for screen readers only. */
	.row.head {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.role,
	.default {
		color: var(--muted);
	}
	.num {
		text-align: right;
		white-space: nowrap;
	}
	.cell-label {
		margin-right: var(--space-2);
		color: var(--muted);
	}
	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}
	@media (min-width: 900px) {
		.rows {
			gap: 0;
			margin-inline: calc(-1 * var(--bleed));
		}
		.row,
		.row.head {
			position: static;
			width: auto;
			height: auto;
			overflow: visible;
			clip-path: none;
			grid-template-columns: 11rem minmax(0, 1fr) 5.5rem 5.5rem auto;
			grid-template-areas: 'token role default now controls';
			padding: calc(var(--space-1) * var(--density)) var(--bleed);
		}
		.row.head {
			min-height: 36px;
			margin-bottom: var(--space-2);
			background: var(--surface-band);
		}
		.controls {
			margin-top: 0;
		}
		.cell-label {
			display: none;
		}
	}

	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4) var(--space-8);
		margin-top: var(--space-8);
	}
	.slow {
		flex: 0 1 30rem;
	}

	.changes {
		display: grid;
		justify-items: start;
		gap: var(--space-3);
		margin-top: var(--space-8);
	}
	pre {
		max-width: 100%;
		margin: 0;
		overflow-x: auto;
	}
	pre.empty {
		color: var(--muted);
		font-family: var(--sans);
		white-space: normal;
	}

	/* ---- Real components ------------------------------------------------ */

	.demos {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
		gap: var(--space-10) var(--space-8);
	}
	.demo {
		display: grid;
		align-content: start;
		gap: var(--space-3);
		min-width: 0;
	}
	.demo.wide {
		grid-column: 1 / -1;
	}

	/* ---- Snap or short -------------------------------------------------- */

	.short-rows {
		display: grid;
		gap: var(--space-12);
	}
	.short-row {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
	}
	.short-row > .note {
		max-width: var(--measure);
	}
	.short-row > :global(.short) {
		max-width: 36rem;
		margin-top: var(--space-3);
	}

	/* ---- Curves --------------------------------------------------------- */

	.curves {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
		gap: var(--space-10) var(--space-8);
	}
	.curve {
		display: grid;
		align-content: start;
		gap: var(--space-3);
		min-width: 0;
	}
	.value {
		overflow-wrap: anywhere;
	}
	.plot {
		width: 128px;
		height: 128px;
	}
	.plot rect {
		fill: none;
		stroke: var(--border);
		stroke-width: 1;
	}
	.plot path {
		fill: none;
		stroke: var(--text);
		stroke-width: 1.5;
	}

	/* The block crosses the track's inner width: 100cqw less its own. */
	.track {
		box-sizing: content-box;
		height: var(--space-6);
		border: 1px solid var(--border);
		container-type: inline-size;
	}
	.block {
		display: block;
		width: var(--space-6);
		height: 100%;
		background: var(--text);
	}
	.block[data-run] {
		transform: translateX(calc(100cqw - 100%));
		transition: transform var(--run-dur) var(--run-curve);
	}
	@media (prefers-reduced-motion: reduce) {
		.block[data-run] {
			transition: none;
		}
	}

	/* ---- Tick ----------------------------------------------------------- */

	.tick-actions {
		margin-top: var(--space-5);
	}

	/* ---- Skeleton to content -------------------------------------------- */

	.reveal {
		display: grid;
		gap: var(--space-3);
		max-width: 36rem;
	}
	.reveal > :global(.hp-load-region) {
		margin-top: var(--space-3);
	}
	/* One column that shrinks to the demo, as the record specimen groups by
	   space. */
	.record {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
	}
	/* The tag names the identifier below it. */
	.record :global(.hp-tag) {
		margin-bottom: var(--space-3);
	}

	/* ---- Images and flicker-on ------------------------------------------ */

	.image-section {
		display: grid;
		gap: var(--space-10);
		max-width: 60rem;
	}
	.flicker {
		display: grid;
		gap: var(--space-3);
		max-width: 60rem;
	}
	.load-both,
	.mock-demo {
		display: grid;
		align-content: start;
		gap: var(--space-3);
		min-width: 0;
	}
	/* Each image demo spans four rows of this grid (heading, note, buttons,
	   frame) as a subgrid, so frames side by side line up. Side by side from
	   600px, stacked on phones; the mocks below likewise. */
	.images,
	.mocks {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-10) var(--space-8);
	}
	.mocks {
		row-gap: var(--space-6);
		margin-top: var(--space-3);
	}
	@media (min-width: 600px) {
		.images,
		.mocks {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	/* A hairline frame sets each mock apart from the docs around it, as in
	   the decode demo. */
	.panel {
		padding: var(--space-5);
		border: 1px solid var(--border);
	}

	/* ---- Decode --------------------------------------------------------- */

	/* About the width of a compact app view, so the mock header row puts
	   its title in the middle on a desktop. */
	.decode {
		display: grid;
		gap: var(--space-5);
		max-width: 60rem;
	}
</style>
