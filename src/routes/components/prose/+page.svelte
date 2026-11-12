<script lang="ts">
	import { Button } from '#lib';
	import { staircase } from '../../staircase';

	// Long text for the samples is a constant: braces in the markup below would
	// read as Svelte expressions.
	const longLine =
		"const summary = items.filter((item) => item.state === 'ready' && item.owner !== null).map((item) => `${item.name} (${item.count})`).join(', ');";
	const listing = `function total(items) {
	let sum = 0;
	for (const item of items) {
		sum += item.count;
	}
	return sum;
}`;
	const wrapperMarkup = `<div class="hp-prose-code">
	<pre tabindex="0"><code>…</code></pre>
	<Button class="hp-prose-copy" variant="tertiary" icon aria-label="Copy code">…</Button>
</div>`;
	const tableMarkup = `<div class="hp-prose-scroll" tabindex="0">
	<table>…</table>
</div>`;

	// The copy button writes to the clipboard and shows a check for a moment. A
	// real app may use a toast instead.
	let copiedId = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	async function copy(id: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			return;
		}
		copiedId = id;
		clearTimeout(timer);
		timer = setTimeout(() => (copiedId = ''), 1600);
	}
</script>

<svelte:head>
	<title>Prose · Components · Hardpoint</title>
</svelte:head>

{#snippet codeBlock(id: string, text: string)}
	<div class="hp-prose-code">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<pre tabindex="0"><code>{text}</code></pre>
		<Button class="hp-prose-copy" variant="tertiary" icon aria-label="Copy code" onclick={() => copy(id, text)}>
			{#if copiedId === id}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5" /></svg>
			{:else}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M5 5h8v8H5zM3 11V3h8" /></svg>
			{/if}
		</Button>
		<span class="hp-visually-hidden" role="status">{copiedId === id ? 'Copied' : ''}</span>
	</div>
{/snippet}

<header><h1 class="hp-view-title">Prose</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Styles for rendered markdown and other long-form text. It is a class, not a component: put
		<code>hp-prose</code> on the container of HTML you cannot add classes to, such as the output of a
		markdown renderer or sanitised HTML.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>base.css</code> defines <code>.hp-prose</code>. Every rule in it is
				<code>:where(.hp-prose) …</code>, so it adds no specificity: a rule an app writes for its own
				container or for one element inside it wins without <code>!important</code>.
			</li>
			<li>
				Blocks do not stop at the reading measure that a lone <code>p</code> gets outside the class.
				The container's width decides, so give it a readable one. The samples below use
				<code>var(--measure)</code>, which is 32em.
			</li>
			<li>
				The text is 16px on 24px lines. Set another <code>font-size</code> on the container and the
				gaps, list indents, code and line heights follow it, because they are in <code>em</code>. The
				two heading sizes are the type tokens, so <code>h1</code> is the page-title size and
				<code>h2</code> the section-title size, and neither follows the container.
			</li>
			<li>
				Headings are as written, never caps. <code>h3</code> to <code>h6</code> stay at body size:
				<code>h3</code> is heavier, <code>h4</code> is medium, and <code>h5</code> and <code>h6</code>
				are medium in the muted ink. A heading has more space above than below, so it groups with what
				follows.
			</li>
			<li>
				Gaps are 1em between blocks and tighter inside them: 0.5em under a heading and between the
				blocks of a list item, 0.25em between list items. The first and last child of the container
				and of every box inside it touch its edges.
			</li>
			<li>
				Lists use square markers for bullets and tabular figures for numbers, in the muted ink. A
				numbered list keeps the <code>start</code> it was given. A checkbox in a list item draws as the
				Checkbox box in its disabled form; the renderer writes it with <code>disabled</code>.
			</li>
			<li>
				A code block is Geist Mono at 0.875em on 20px lines. It never wraps: it scrolls sideways
				inside its own box, with a thin scrollbar on a mouse. The box is a 1px <code>--border</code>
				line rather than a fill, because the hover tint cannot be seen on black and the band tint is
				too heavy under a long listing. Add <code>tabindex="0"</code> to a block that scrolls, so a
				keyboard user can scroll it.
			</li>
			<li>
				A copy button goes in <code>.hp-prose-code</code>, a wrapper around the
				<code>pre</code> and the app's Button with the class <code>hp-prose-copy</code>. The button sits
				at the top end of the box and the <code>pre</code> leaves room for it, so text never runs under
				it. It is outside the code, so a renderer that replaces the <code>pre</code> keeps it. Use the
				tertiary icon Button.
			</li>
			<li>
				A table in <code>.hp-prose-scroll</code> that is wider than the column scrolls sideways inside
				it, and the page stays its width. The table keeps its own <code>display</code>. Headers are as
				written in <code>--surface-band</code>, cells are Geist, and every row has a 1px line between
				it and the next, because cells that wrap into several lines need one. A cell's
				<code>align</code> attribute sets its alignment.
			</li>
			<li>
				A quote has a 3px <code>--border</code> edge and muted text. Titanium stays for selection. A
				rule is a 1px <code>--border</code> line. An image is a block as wide as itself, at most the
				container. An app that shows alt text instead of images renders the text and needs no rule.
			</li>
		</ul>
	</section>

	<section aria-labelledby="markup">
		<h2 id="markup" class="hp-section-title">Markup the app adds</h2>
		<p class="lede">
			Only two wrappers need the app's help; every other element is styled where it stands.
		</p>
		<div class="hp-prose listing">
			<pre><code>{wrapperMarkup}</code></pre>
			<pre><code>{tableMarkup}</code></pre>
		</div>
	</section>

	<section aria-labelledby="elements">
		<h2 id="elements" class="hp-section-title">Every element</h2>
		<p class="lede">One container with <code>hp-prose</code>, as a renderer writes it.</p>

		<div class="hp-prose sample">
			<h1>Heading level one</h1>
			<p>
				A paragraph with <em>emphasis</em>, <strong>strong text</strong>, <del>strikethrough</del>,
				<code>inline code</code> and <a href="#elements">a link</a>. The text keeps to the container's
				width, and a long word such as
				<a href="#elements">https://example.test/reference/a-path-that-has-no-spaces-and-keeps-going</a>
				breaks inside the column.
			</p>

			<h2>Heading level two</h2>
			<p>A second paragraph, after a heading that groups with it.</p>

			<h3>Heading level three</h3>
			<p>The next paragraph.</p>
			<h4>Heading level four</h4>
			<p>The next paragraph.</p>
			<h5>Heading level five</h5>
			<p>The next paragraph.</p>
			<h6>Heading level six</h6>
			<p>The next paragraph.</p>

			<blockquote>
				<p>A quote has an edge and muted text. It may run over several lines, and hold <code>code</code>.</p>
				<p>A second paragraph in the same quote.</p>
			</blockquote>

			<hr />

			<ul>
				<li>An item in a bulleted list.</li>
				<li>
					An item with a list under it:
					<ul>
						<li>A nested item.</li>
						<li>
							A nested item with another level:
							<ol>
								<li>First step of a nested numbered list.</li>
								<li>Second step.</li>
							</ol>
						</li>
					</ul>
				</li>
				<li>An item long enough to wrap onto a second line, so the text edge and the marker can be checked together.</li>
			</ul>

			<ol start="9">
				<li>A numbered list that starts at nine.</li>
				<li>Ten has two digits, and the figures line up.</li>
				<li>Eleven.</li>
			</ol>

			<ul class="contains-task-list">
				<li class="task-list-item"><input type="checkbox" checked disabled aria-label="Done" /> A finished task</li>
				<li class="task-list-item"><input type="checkbox" disabled aria-label="Open" /> An open task</li>
				<li class="task-list-item">
					<input type="checkbox" disabled aria-label="Open" /> An open task long enough to wrap onto a second line, with its box beside the first line only
				</li>
			</ul>

			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<pre tabindex="0"><code>{longLine}</code></pre>

			{@render codeBlock('listing', listing)}

			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="hp-prose-scroll" tabindex="0">
				<table>
					<thead>
						<tr>
							<th>Component</th>
							<th align="center">Status</th>
							<th align="right">Items</th>
							<th align="right">Share</th>
							<th>Reference</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Navigation</td>
							<td align="center">Ready</td>
							<td align="right">1,204</td>
							<td align="right">42.5%</td>
							<td>quarterly_summary_attachment_final_reviewed</td>
						</tr>
						<tr>
							<td>Forms</td>
							<td align="center">Draft</td>
							<td align="right">96</td>
							<td align="right">3.3%</td>
							<td>A cell with words that wrap onto several lines instead of widening the column.</td>
						</tr>
						<tr>
							<td>Feedback</td>
							<td align="center">Ready</td>
							<td align="right">8</td>
							<td align="right">0.3%</td>
							<td>compatibility_matrix_for_the_second_release</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p><img src={staircase.src} alt={staircase.alt} width={staircase.width} height={staircase.height} /></p>

			<p>The last paragraph has no space under it.</p>
		</div>
	</section>

	<section aria-labelledby="narrow">
		<h2 id="narrow" class="hp-section-title">In a 320px column</h2>
		<p class="lede">
			A long address, a long code token, a code block, a wide table and an image in a column 320px wide
			(narrower where the screen is). Nothing widens the page: words break, code and the table scroll
			inside their own boxes.
		</p>

		<div class="hp-prose narrow">
			<p>
				A paragraph with a long address,
				<a href="#narrow">https://example.test/reference/a-path-that-has-no-spaces-and-keeps-going</a>,
				then a long token that wraps inside its own box:
				<code>a-token-that-is-too-wide-for-a-column-this-narrow-to-hold</code>
			</p>
			<ul>
				<li>An item in a list.</li>
				<li class="task-list-item"><input type="checkbox" checked disabled aria-label="Done" /> A finished task</li>
			</ul>
			{@render codeBlock('narrow', longLine)}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="hp-prose-scroll" tabindex="0">
				<table>
					<thead>
						<tr>
							<th>Component</th>
							<th align="right">Items</th>
							<th>Reference</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Navigation</td>
							<td align="right">1,204</td>
							<td>quarterly_summary_attachment_final_reviewed</td>
						</tr>
						<tr>
							<td>Forms</td>
							<td align="right">96</td>
							<td>compatibility_matrix_for_the_second_release</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p><img src={staircase.src} alt={staircase.alt} width={staircase.width} height={staircase.height} /></p>
		</div>
	</section>

	<section aria-labelledby="size">
		<h2 id="size" class="hp-section-title">A smaller size</h2>
		<p class="lede">
			The same class on a container set to 14px. The app's own rule sets the size, and gaps, indents and
			code follow it.
		</p>
		<div class="hp-prose small">
			<h3>Heading level three</h3>
			<p>A paragraph with <code>inline code</code> and <a href="#size">a link</a>.</p>
			<ul>
				<li>An item in a list.</li>
				<li>Another item.</li>
			</ul>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<pre tabindex="0"><code>{listing}</code></pre>
		</div>
	</section>

	<section aria-labelledby="a11y">
		<h2 id="a11y" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				The renderer's elements keep their meaning: headings, lists, quotes and tables stay what they
				are. A list keeps its markers, and a table keeps its <code>display</code>, because only the
				wrapper scrolls.
			</li>
			<li>
				Give each task checkbox a name, or let it sit in its item's text, as the renderer writes it. It
				is disabled, so it takes no focus.
			</li>
			<li>
				A scrolling code block or table wrapper needs <code>tabindex="0"</code> so a keyboard user can
				scroll it. The copy button is a real button, 44px on touch screens, named by
				<code>aria-label</code>. Say when the copy worked, with an icon change, a live region or a
				Toast.
			</li>
			<li>
				Text is the two inks. The marker, the quote and the small headings use the muted ink, which
				keeps its contrast on both themes. Prose has no motion.
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

	section {
		margin-top: var(--space-12);
	}

	.intro code,
	.lede code,
	.notes code {
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

	/* An app's own rule: a readable width on the container. It beats the
	   class's zero-specificity rules without any trick. */
	.sample {
		max-width: var(--measure);
	}
	.narrow {
		max-width: 20rem;
	}
	.small {
		max-width: var(--measure);
		font-size: 14px;
	}
	.listing {
		max-width: var(--measure);
	}
</style>
