<script lang="ts">
	import type { SourceLink } from '$lib/domain/working-practice';

	let { sources }: { sources: SourceLink[] } = $props();
</script>

<footer class="border-t border-line py-8 font-sans text-sm text-muted">
	<span class="mr-4 font-mono text-[10px] tracking-wider uppercase">Fagligt grundlag</span>
	{#each sources as source, index}
		<a
			class="text-muted underline decoration-line underline-offset-4 hover:text-ink"
			href={source.url}>{source.label}</a
		>{index < sources.length - 1 ? ' · ' : ''}
	{/each}
</footer>
