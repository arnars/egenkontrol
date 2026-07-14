<script lang="ts">
	import { resolve } from '$app/paths';

	const pages = [
		{
			title: 'Rengøring',
			description: 'Statisk plan for områder, metode, frekvens og kontrol.',
			href: '/rengoering',
			kind: 'Plan'
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

<header class="border-b border-line pb-12">
	<p class="mb-4 font-mono text-[11px] tracking-widest text-muted uppercase">Arbejdsgange</p>
	<h1
		class="m-0 font-serif text-[clamp(3rem,7vw,6.5rem)] leading-[.88] font-normal tracking-[-.055em]"
	>
		Planer
	</h1>
	<p class="mt-6 mb-0 max-w-2xl font-sans text-lg leading-relaxed text-muted">
		Her ligger de arbejdsgange, som ikke skal fylde i den daglige kontrolliste. Der registreres kun
		noget, når den konkrete plan eller en hændelse kræver det.
	</p>
</header>

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
