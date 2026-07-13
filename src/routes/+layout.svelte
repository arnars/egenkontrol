<script lang="ts">
	import { resolve } from '$app/paths';
	import '../styles/app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
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
			<form method="POST" action="/auth/logout">
				<button
					class="min-h-11 cursor-pointer border-0 bg-transparent px-4 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
					type="submit">Log ud</button
				>
			</form>
			<nav
				class="grid w-72 grid-cols-2 rounded-full border border-line bg-paper p-1 max-[720px]:w-[min(18rem,calc(100vw-2.5rem))]"
				aria-label="Primær navigation"
			>
				<a
					class="flex min-h-11 items-center justify-center rounded-full bg-ink font-mono text-[.7rem] tracking-[.12em] text-paper uppercase no-underline"
					href={resolve('/')}
					aria-current="page">Kontroller</a
				>
				<a
					class="flex min-h-11 items-center justify-center rounded-full font-mono text-[.7rem] tracking-[.12em] text-muted uppercase no-underline"
					href="#historik">Historik</a
				>
			</nav>
		{:else}
			<span class="w-px" aria-hidden="true"></span>
		{/if}
	</header>

	<main>{@render children()}</main>
</div>
