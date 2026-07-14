<script lang="ts">
	import PracticeDocument from '$lib/components/PracticeDocument.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Adskillelse — Nabo Brejning</title>
	<meta
		name="description"
		content="Arbejdsgang for adskillelse og krydskontamination hos Nabo Brejning."
	/>
</svelte:head>

<PracticeDocument plan={data.plan} />
