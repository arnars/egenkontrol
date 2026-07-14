<script lang="ts">
	import DocumentHeader from '$lib/components/DocumentHeader.svelte';
	import DocumentTable from '$lib/components/DocumentTable.svelte';
	import SourceFooter from '$lib/components/SourceFooter.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let plan = $derived(data.plan);
</script>

<svelte:head>
	<title>Rengøring — Nabo Brejning</title>
	<meta name="description" content="Rengøringsplan for Nabo Brejning." />
</svelte:head>

<article>
	<DocumentHeader eyebrow={plan.statusLabel} title={plan.title} introduction={plan.introduction} />

	<section class="grid gap-8 border-b border-line py-12 lg:grid-cols-[12rem_minmax(0,1fr)]">
		<h2 class="m-0 font-sans text-xl font-medium tracking-[-.025em]">Grundprincipper</h2>
		<ul class="m-0 grid max-w-3xl gap-3 p-0 font-sans leading-relaxed">
			{#each plan.principles as principle, index}
				<li class="grid grid-cols-[1.75rem_1fr] gap-3">
					<span class="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
					<span>{principle}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="py-12">
		<div class="mb-7 grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
			<h2 class="m-0 font-sans text-xl font-medium tracking-[-.025em]">Plan</h2>
			<p class="m-0 max-w-2xl font-sans text-sm leading-relaxed text-muted">
				Frekvenserne er placeholders. De må først bruges som driftens plan, når de er tilpasset og
				godkendt.
			</p>
		</div>
		<DocumentTable
			columns={['Område', 'Omfang', 'Metode', 'Hvornår', 'Kontrol']}
			rows={plan.tasks.map((task) => [
				task.area,
				task.scope,
				task.method,
				task.frequency,
				task.check
			])}
		/>
	</section>

	<SourceFooter sources={plan.sources} />
</article>
