<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import '../styles/app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	function navClass(active: boolean) {
		return `flex h-8 items-center justify-center rounded-full font-mono text-[11px] tracking-widest uppercase no-underline transition ${active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`;
	}
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<title>Nabo Brejning — Egenkontrol</title>
	<meta
		name="description"
		content="Digitalt egenkontrolsystem til den daglige drift hos Nabo Brejning."
	/>
</svelte:head>

<div
	class="mx-auto w-[min(1120px,calc(100vw-2rem))] py-12 pb-20 max-[720px]:w-[min(calc(100%-1.25rem),1120px)] max-[720px]:pt-5 print:w-auto print:p-0"
>
	<header class="mb-14 flex items-center justify-between gap-4 pb-4 max-[720px]:mb-8 print:hidden">
		{#if data.claims}
			<form class="m-0" method="POST" action="/auth/logout">
				<button
					class="flex h-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-mono text-[11px] tracking-widest text-muted uppercase transition hover:text-ink"
					type="submit">Log ud</button
				>
			</form>
			<nav
				class="grid w-72 grid-cols-3 rounded-full border border-line bg-paper p-1"
				aria-label="Primær navigation"
			>
				<a
					class={navClass(page.route.id === '/')}
					href={resolve('/')}
					aria-current={page.route.id === '/' ? 'page' : undefined}>Kontroller</a
				>
				<a class={navClass(false)} href={`${resolve('/')}#historik`}>Historik</a>
				<a
					class={navClass(page.route.id === '/risikoanalyse')}
					href={resolve('/risikoanalyse')}
					aria-current={page.route.id === '/risikoanalyse' ? 'page' : undefined}>Risiko</a
				>
			</nav>
		{:else}
			<span class="w-px" aria-hidden="true"></span>
		{/if}
	</header>

	<main>{@render children()}</main>
</div>
