<script lang="ts">
	import DocumentHeader from '$lib/components/DocumentHeader.svelte';
	import DocumentTable from '$lib/components/DocumentTable.svelte';
	import type { RiskAnalysisBlock, RiskAnalysisSection } from '$lib/domain/risk-analysis';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let document = $derived(data.document);
</script>

<svelte:head>
	<title>Risikoanalyse — Nabo Brejning</title>
	<meta
		name="description"
		content="Demonstration af en struktureret risikoanalyse i Nabo Brejnings egenkontrolsystem."
	/>
</svelte:head>

<article>
	<DocumentHeader
		eyebrow={`${document.statusLabel} · Revision ${document.revision}`}
		title={document.title}
		subtitle={document.subject}
		introduction={document.introduction}
	/>

	<nav class="border-b border-line py-8" aria-label="Indhold i risikoanalysen">
		<ol class="m-0 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
			{#each document.sections as section}
				<li>
					<a
						class="flex gap-3 font-sans text-sm text-muted no-underline hover:text-ink"
						href={`#${section.id}`}
					>
						<span class="font-mono text-[11px] tracking-wider">{section.number}</span>
						<span>{section.title}</span>
					</a>
				</li>
			{/each}
		</ol>
	</nav>

	<div>
		{#each document.sections as section}
			{@render sectionView(section, false)}
		{/each}
	</div>
</article>

{#snippet sectionView(section: RiskAnalysisSection, nested: boolean)}
	<section
		class:border-t={nested}
		class:border-line={nested}
		class:pt-9={nested}
		class="scroll-mt-8 py-12"
		id={section.id}
	>
		<div class="grid gap-7 lg:grid-cols-[12rem_minmax(0,1fr)]">
			<header>
				<p class="m-0 font-mono text-[11px] tracking-widest text-muted uppercase">
					Afsnit {section.number}
				</p>
				{#if nested}
					<h3 class="mt-2 mb-0 font-sans text-xl leading-tight font-medium tracking-[-.025em]">
						{section.title}
					</h3>
				{:else}
					<h2 class="mt-2 mb-0 font-sans text-xl leading-tight font-medium tracking-[-.025em]">
						{section.title}
					</h2>
				{/if}
			</header>
			<div class="min-w-0">
				{#each section.blocks as block}
					{@render blockView(block)}
				{/each}
				{#if section.subsections}
					{#each section.subsections as subsection}
						{@render sectionView(subsection, true)}
					{/each}
				{/if}
			</div>
		</div>
	</section>
{/snippet}

{#snippet blockView(block: RiskAnalysisBlock)}
	{#if block.type === 'paragraphs'}
		<div
			class="max-w-[72ch] text-[1.08rem] leading-[1.7] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
		>
			{#each block.paragraphs as paragraph}
				<p>{paragraph}</p>
			{/each}
		</div>
	{:else}
		<DocumentTable columns={block.columns} rows={block.rows} />
	{/if}
{/snippet}
