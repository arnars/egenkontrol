<script lang="ts">
	import { resolve } from '$app/paths';
	import DocumentHeader from '$lib/components/DocumentHeader.svelte';

	const pages = [
		{
			title: 'Rengøring',
			description: 'Statisk plan for områder, metode, frekvens og kontrol.',
			href: '/rengoering',
			kind: 'Plan'
		},
		{
			title: 'Personlig hygiejne',
			description: 'Håndhygiejne, arbejdstøj, sygdom, sår og besøgende.',
			href: '/personlig-hygiejne',
			kind: 'Arbejdsgang'
		},
		{
			title: 'Adskillelse',
			description: 'Opbevaring, klargøring og forebyggelse af krydskontamination.',
			href: '/adskillelse',
			kind: 'Arbejdsgang'
		},
		{
			title: 'Skadedyr',
			description: 'Forebyggelse pr. område og registrering ved konkrete fund.',
			href: '/skadedyr',
			kind: 'Plan + hændelser'
		},
		{
			title: 'Varemodtagelse',
			description: 'Kort arbejdsgang og registrering af fejl ved leverancer.',
			href: '/varemodtagelse',
			kind: 'Hændelser'
		}
	] as const;
</script>

<svelte:head>
	<title>Planer — Nabo Brejning</title>
	<meta name="description" content="Arbejdsgange og hændelser i Nabo Brejnings egenkontrol." />
</svelte:head>

<DocumentHeader
	eyebrow="Arbejdsgange"
	title="Planer"
	introduction="Her ligger de arbejdsgange, som ikke skal fylde i den daglige kontrolliste. Der registreres kun noget, når den konkrete plan eller en hændelse kræver det."
/>

<nav class="grid" aria-label="Planer og hændelser">
	{#each pages as item}
		<a
			class="group grid min-h-28 grid-cols-[1fr_auto] items-center gap-6 border-b border-line px-2 py-6 text-ink no-underline hover:bg-soft"
			href={resolve(item.href)}
		>
			<span>
				<span class="block font-sans text-xl font-medium tracking-[-.025em]">{item.title}</span>
				<span class="mt-1 block max-w-xl font-sans text-sm leading-relaxed text-muted"
					>{item.description}</span
				>
			</span>
			<span class="flex items-center gap-4">
				<span class="hidden font-mono text-[10px] tracking-wider text-muted uppercase sm:block"
					>{item.kind}</span
				>
				<span class="grid h-8 w-8 place-items-center rounded-full border border-line font-sans"
					>→</span
				>
			</span>
		</a>
	{/each}
</nav>
