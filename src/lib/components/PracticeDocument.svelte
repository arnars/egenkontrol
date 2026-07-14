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
			<section
				class="grid gap-8 border-b border-line py-12 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-12"
			>
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
						<p
							class="mt-0 mb-6 border-l border-line pl-4 font-sans text-base leading-relaxed text-muted"
						>
							{section.description}
						</p>
					{/if}
					<ol class="m-0 grid list-none gap-4 p-0">
						{#each section.items as item, itemIndex}
							<li class="flex gap-4">
								<span class="mt-1.5 min-w-8 font-mono text-xs tracking-widest text-muted">
									{String(itemIndex + 1).padStart(2, '0')}
								</span>
								<p class="m-0 flex-1 font-sans text-base leading-relaxed tracking-tight md:text-lg">
									{item}
								</p>
							</li>
						{/each}
					</ol>
				</div>
			</section>
		{/each}
	</div>

	<SourceFooter sources={plan.sources} />
</article>
