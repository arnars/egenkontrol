<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let plan = $derived(data.plan);
	let formOpen = $state(false);
	let supplier = $state('');
	let deliveryReference = $state('');
	let issueType = $state(plan.issueTypes[0]?.id ?? '');
	let temperature = $state('');
	let actionId = $state(plan.actions[0]?.id ?? '');
	let note = $state('');
	let savedMessage = $state('');

	function savePreview(event: SubmitEvent) {
		event.preventDefault();
		const issue = plan.issueTypes.find((item) => item.id === issueType)?.label ?? 'Fejl';
		const action = plan.actions.find((item) => item.id === actionId)?.label ?? 'handling valgt';
		savedMessage = `Demoregistrering oprettet for ${deliveryReference}: ${issue}. ${action}.`;
		formOpen = false;
	}
</script>

<svelte:head>
	<title>Varemodtagelse — Nabo Brejning</title>
	<meta
		name="description"
		content="Minimal modtagekontrol og registrering af leveringsfejl hos Nabo Brejning."
	/>
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
		<div>
			<p class="mb-2 font-mono text-[11px] tracking-widest text-muted uppercase">
				Ved hver levering
			</p>
			<h2 class="m-0 font-sans text-xl font-medium tracking-[-.025em]">Kontrollér</h2>
		</div>
		<ol class="m-0 grid max-w-3xl list-none gap-4 p-0">
			{#each plan.checks as check, index}
				<li class="grid grid-cols-[2rem_1fr] gap-3 font-sans leading-relaxed">
					<span class="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
					<span>{check}</span>
				</li>
			{/each}
		</ol>
	</section>

	{#if savedMessage}
		<p class="my-6 border-l-2 border-ink bg-paper px-5 py-4 font-sans text-sm" role="status">
			{savedMessage} Den er kun gemt i denne frontendvisning.
		</p>
	{/if}

	<section class="py-12">
		<div class="flex flex-wrap items-end justify-between gap-5">
			<div>
				<p class="mb-2 font-mono text-[11px] tracking-widest text-muted uppercase">
					Kun hvis noget ikke er i orden
				</p>
				<h2 class="m-0 font-sans text-2xl font-medium tracking-[-.035em]">Registrér en fejl</h2>
				<p class="mt-3 mb-0 max-w-xl font-sans text-sm leading-relaxed text-muted">
					En fejlfri levering kræver ingen indtastning i denne prototype. Følgeseddel eller faktura
					bevares fortsat som sporbarhedsdokumentation.
				</p>
			</div>
			<button
				class="min-h-11 cursor-pointer rounded-full border border-ink bg-ink px-5 font-sans text-sm text-paper"
				type="button"
				onclick={() => (formOpen = !formOpen)}
				aria-expanded={formOpen}>{formOpen ? 'Luk' : 'Registrér fejl'}</button
			>
		</div>

		{#if formOpen}
			<form class="mt-8 grid max-w-3xl gap-6 border-t border-line pt-8" onsubmit={savePreview}>
				<div class="grid gap-5 sm:grid-cols-2">
					<label class="grid gap-2 font-sans text-sm font-medium">
						Leverandør
						<input
							class="min-h-12 w-full border border-line bg-paper px-3 font-sans text-base"
							bind:value={supplier}
							required
							maxlength="120"
						/>
					</label>
					<label class="grid gap-2 font-sans text-sm font-medium">
						Leverance eller følgeseddel
						<input
							class="min-h-12 w-full border border-line bg-paper px-3 font-sans text-base"
							bind:value={deliveryReference}
							required
							maxlength="120"
						/>
					</label>
				</div>

				<div class="grid gap-5 sm:grid-cols-2">
					<label class="grid gap-2 font-sans text-sm font-medium">
						Hvad er der galt?
						<select
							class="min-h-12 w-full border border-line bg-paper px-3 font-sans text-base"
							bind:value={issueType}
						>
							{#each plan.issueTypes as type}
								<option value={type.id}>{type.label}</option>
							{/each}
						</select>
					</label>
					<label class="grid gap-2 font-sans text-sm font-medium">
						Handling
						<select
							class="min-h-12 w-full border border-line bg-paper px-3 font-sans text-base"
							bind:value={actionId}
						>
							{#each plan.actions as action}
								<option value={action.id}>{action.label}</option>
							{/each}
						</select>
					</label>
				</div>

				{#if issueType === 'temperature'}
					<label class="grid max-w-xs gap-2 font-sans text-sm font-medium">
						Målt temperatur
						<span class="relative">
							<input
								class="min-h-12 w-full border border-line bg-paper px-3 pr-10 font-sans text-base"
								type="text"
								inputmode="decimal"
								bind:value={temperature}
								required
							/>
							<span class="absolute top-1/2 right-3 -translate-y-1/2 font-sans text-sm text-muted"
								>°C</span
							>
						</span>
					</label>
				{/if}

				<label class="grid gap-2 font-sans text-sm font-medium">
					Kort beskrivelse og vurdering
					<textarea
						class="min-h-28 w-full resize-y border border-line bg-paper p-3 font-sans text-base"
						bind:value={note}
						required
						maxlength="500"></textarea>
				</label>

				<button
					class="min-h-12 justify-self-start rounded-full border border-ink bg-ink px-6 font-sans text-sm text-paper"
					type="submit"
				>
					Opret demoregistrering
				</button>
			</form>
		{/if}
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
