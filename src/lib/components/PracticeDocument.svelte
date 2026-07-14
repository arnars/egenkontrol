<script lang="ts">
	import DocumentHeader from '$lib/components/DocumentHeader.svelte';
	import SourceFooter from '$lib/components/SourceFooter.svelte';
	import type { StaticPracticePlan } from '$lib/domain/working-practice';

	let { plan }: { plan: StaticPracticePlan } = $props();
</script>

<article>
	<DocumentHeader eyebrow={plan.statusLabel} title={plan.title} introduction={plan.introduction} />

	<div>
		{#each plan.sections as section, index}
			<section class="grid gap-7 border-b border-line py-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
				<header>
					<p class="m-0 font-mono text-[11px] tracking-widest text-muted uppercase">
						{String(index + 1).padStart(2, '0')}
					</p>
					<h2 class="mt-2 mb-0 font-sans text-xl leading-tight font-medium tracking-[-.025em]">
						{section.title}
					</h2>
				</header>
				<div class="max-w-3xl">
					{#if section.description}
						<p class="mt-0 font-serif text-[1.08rem] leading-[1.7]">{section.description}</p>
					{/if}
					<ul class="m-0 grid gap-3 pl-5 font-sans leading-relaxed">
						{#each section.items as item}<li>{item}</li>{/each}
					</ul>
				</div>
			</section>
		{/each}
	</div>

	<SourceFooter sources={plan.sources} />
</article>
