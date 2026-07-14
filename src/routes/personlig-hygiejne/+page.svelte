<script lang="ts">
	import PracticeDocument from '$lib/components/PracticeDocument.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Personlig hygiejne — Nabo Brejning</title>
	<meta name="description" content="Arbejdsgang for personlig hygiejne hos Nabo Brejning." />
</svelte:head>

<PracticeDocument plan={data.plan} />
