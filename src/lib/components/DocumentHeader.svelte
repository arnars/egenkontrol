<script lang="ts">
	let {
		eyebrow,
		title,
		introduction,
		subtitle
	}: {
		eyebrow: string;
		title: string;
		introduction: string;
		subtitle?: string;
	} = $props();
</script>

<header
	class="grid gap-7 border-b border-line pb-12 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end"
>
	<div>
		<p class="mb-4 font-mono text-[11px] tracking-widest text-muted uppercase">{eyebrow}</p>
		<h1
			class="m-0 max-w-5xl font-sans text-5xl leading-[.92] font-semibold tracking-[-.07em] md:text-7xl"
		>
			{title}
		</h1>
		{#if subtitle}
			<p class="mt-5 mb-0 font-sans text-lg text-muted">{subtitle}</p>
		{/if}
	</div>
	<p class="m-0 border-l-2 border-ink pl-5 font-sans text-[.95rem] leading-relaxed text-muted">
		{introduction}
	</p>
</header>
