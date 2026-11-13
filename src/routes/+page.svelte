<script lang="ts">
	import { groups } from './pages';
</script>

<svelte:head>
	<title>Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Index</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A Svelte 5 design system on Bits UI. Titanium ink on a black canvas, the three Geist faces,
		square solid blocks for actions and tags, banded tables of mono data. Dark by default; light and
		system come through <code>data-theme</code> on <code>&lt;html&gt;</code>, as the Theme control
		on this site sets it.
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
