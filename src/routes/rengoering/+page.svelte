<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let plan = $derived(data.plan);
</script>

<svelte:head>
	<title>Rengøring — Nabo Brejning</title>
	<meta name="description" content="Rengøringsplan for Nabo Brejning." />
</svelte:head>

<article>
	<header
		class="grid gap-7 border-b border-line pb-12 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end"
	>
		<div>
			<p class="mb-4 font-mono text-[11px] tracking-widest text-muted uppercase">
				{plan.statusLabel}
			</p>
			<h1
				class="m-0 font-serif text-[clamp(3rem,7vw,6.5rem)] leading-[.88] font-normal tracking-[-.055em]"
			>
				{plan.title}
			</h1>
		</div>
		<p class="m-0 border-l-2 border-ink pl-5 font-sans text-[.95rem] leading-relaxed text-muted">
			{plan.introduction}
		</p>
	</header>

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
		<div class="overflow-x-auto border-y border-line">
			<table
				class="w-full min-w-[900px] table-fixed border-collapse text-left font-sans text-sm leading-relaxed"
			>
				<thead>
					<tr class="border-b border-ink">
						{#each ['Område', 'Omfang', 'Metode', 'Hvornår', 'Kontrol'] as column}
							<th
								class="px-3 py-3 font-mono text-[10px] tracking-wider text-muted uppercase first:pl-0 last:pr-0"
								>{column}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each plan.tasks as task}
						<tr class="border-b border-line last:border-0">
							<td class="py-4 pr-3 align-top font-medium">{task.area}</td>
							<td class="px-3 py-4 align-top">{task.scope}</td>
							<td class="px-3 py-4 align-top">{task.method}</td>
							<td class="px-3 py-4 align-top">{task.frequency}</td>
							<td class="py-4 pl-3 align-top">{task.check}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<footer class="border-t border-line py-8 font-sans text-sm text-muted">
		<span class="mr-4 font-mono text-[10px] tracking-wider uppercase">Fagligt grundlag</span>
		{#each plan.sources as source, index}
			<a
				class="text-muted underline decoration-line underline-offset-4 hover:text-ink"
				href={source.url}>{source.label}</a
			>{index < plan.sources.length - 1 ? ' · ' : ''}
		{/each}
	</footer>
</article>
