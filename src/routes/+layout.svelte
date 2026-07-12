<script lang="ts">
	import { resolve } from '$app/paths';
	import '../styles/app.css';

	let { children } = $props();
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
		<span class="app-nav-spacer" aria-hidden="true"></span>
		<nav class="segmented-nav" aria-label="Primær navigation">
			<a class="is-active" href={resolve('/')} aria-current="page">Kontroller</a>
			<a href="#historik">Historik</a>
		</nav>
	</header>

	<main>{@render children()}</main>
</div>
