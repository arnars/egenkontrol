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

<div class="app-shell">
	<header class="app-nav print-hidden">
		{#if data.claims}
			<form method="POST" action="/auth/logout">
				<button class="text-button" type="submit">Log ud</button>
			</form>
			<nav class="segmented-nav" aria-label="Primær navigation">
				<a class="is-active" href={resolve('/')} aria-current="page">Kontroller</a>
				<a href="#historik">Historik</a>
			</nav>
		{:else}
			<span class="app-nav-spacer" aria-hidden="true"></span>
		{/if}
	</header>

	<main>{@render children()}</main>
</div>
