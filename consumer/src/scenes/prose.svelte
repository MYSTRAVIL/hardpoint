<script>
	import { Button } from '@mystravil/hardpoint';
	let copied = $state(0);
</script>

<main class="page">
	<div class="hp-prose">
		<h1>Heading one</h1>
		<h2>Heading two</h2>
		<h3>Heading three</h3>
		<h4>Heading four</h4>
		<h5>Heading five</h5>
		<h6>Heading six</h6>
		<p>A paragraph with <a href="#prose">a link</a>, <strong>strong</strong>, <em>emphasis</em>, <del>deleted</del>, <code>inline code</code> and <kbd>Ctrl</kbd>.</p>
		<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>
		<ol><li>First</li><li>Second</li></ol>
		<ul class="contains-task-list">
			<li class="task-list-item"><input type="checkbox" disabled checked /> Done task</li>
			<li class="task-list-item"><input type="checkbox" disabled /> Open task</li>
		</ul>
		<blockquote><p>A quotation that runs for a while.</p><p>A second paragraph.</p></blockquote>
		<hr />
		<div class="hp-prose-code">
			<pre><code>const answer = 42;
function long() &#123; return 'a line that is much longer than the column so that the block has to scroll sideways inside it'; &#125;</code></pre>
			<Button class="hp-prose-copy" variant="tertiary" icon aria-label="Copy code" onclick={() => copied++}>
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 5h8v8H5zM3 11V3h8" /></svg>
			</Button>
		</div>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="hp-prose-scroll" tabindex="0">
			<table>
				<thead><tr><th>Name</th><th>One</th><th>Two</th><th>Three</th><th>Four</th><th>Five</th><th>Six</th></tr></thead>
				<tbody>
					<tr><td>Alpha</td><td>1,000,000,000</td><td>2,000,000,000</td><td>3,000,000,000</td><td>4,000,000,000</td><td>5,000,000,000</td><td>6,000,000,000</td></tr>
					<tr><td>Beta</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr>
				</tbody>
			</table>
		</div>
		<img src="/staircase.jpg" alt="A staircase" width="320" />
		<p id="copied">{copied}</p>
	</div>
</main>
