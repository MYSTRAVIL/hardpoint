<script lang="ts">
	// One scene per file in src/scenes. #name picks the scene.
	const scenes = import.meta.glob('./scenes/*.svelte', { eager: true });
	const name = location.hash.slice(1);
	const Scene = (scenes[`./scenes/${name}.svelte`] as { default: import('svelte').Component } | undefined)?.default;
</script>

{#if Scene}
	<Scene />
{:else}
	<p>No scene "{name}".</p>
{/if}
