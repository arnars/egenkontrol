<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let plan = $derived(data.plan);
	let formOpen = $state(false);
	let areaId = $state(plan.areas[0]?.id ?? '');
	let incidentType = $state(plan.incidentTypes[0]?.id ?? '');
	let observation = $state('');
	let productImpact = $state('unknown');
	let selectedActions = $state<string[]>([]);
	let savedMessage = $state('');
	let activeArea = $derived(plan.areas.find((area) => area.id === areaId));

	function changeArea(event: Event) {
		areaId = (event.currentTarget as HTMLSelectElement).value;
		selectedActions = [];
	}

	function savePreview(event: SubmitEvent) {
		event.preventDefault();
		const area = activeArea?.label ?? 'valgt område';
		const type = plan.incidentTypes.find((item) => item.id === incidentType)?.label ?? 'fund';
		savedMessage = `Demoregistrering oprettet: ${type} i ${area}. ${selectedActions.length} handling${selectedActions.length === 1 ? '' : 'er'} valgt.`;
		formOpen = false;
	}
</script>

<svelte:head>
	<title>Skadedyr — Nabo Brejning</title>
	<meta name="description" content="Plan og hændelser for skadedyrssikring hos Nabo Brejning." />
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

	{#if savedMessage}
		<p class="my-6 border-l-2 border-ink bg-paper px-5 py-4 font-sans text-sm" role="status">
			{savedMessage} Den er kun gemt i denne frontendvisning.
		</p>
	{/if}

	<section class="border-b border-line py-12">
		<div class="mb-8 flex flex-wrap items-end justify-between gap-5">
			<div>
				<p class="mb-2 font-mono text-[11px] tracking-widest text-muted uppercase">
					Kun ved fund eller mistanke
				</p>
				<h2 class="m-0 font-sans text-2xl font-medium tracking-[-.035em]">Registrér en hændelse</h2>
			</div>
			<button
				class="min-h-11 cursor-pointer rounded-full border border-ink bg-ink px-5 font-sans text-sm text-paper"
				type="button"
				onclick={() => (formOpen = !formOpen)}
				aria-expanded={formOpen}>{formOpen ? 'Luk' : 'Registrér fund'}</button
			>
		</div>

		{#if formOpen}
			<form class="grid max-w-3xl gap-6 border-t border-line pt-8" onsubmit={savePreview}>
				<div class="grid gap-5 sm:grid-cols-2">
					<label class="grid gap-2 font-sans text-sm font-medium">
						Område
						<select
							class="min-h-12 w-full rounded-none border border-line bg-paper px-3 font-sans text-base"
							value={areaId}
							onchange={changeArea}
						>
							{#each plan.areas as area}
								<option value={area.id}>{area.label}</option>
							{/each}
						</select>
					</label>
					<label class="grid gap-2 font-sans text-sm font-medium">
						Fund eller mistanke
						<select
							class="min-h-12 w-full rounded-none border border-line bg-paper px-3 font-sans text-base"
							bind:value={incidentType}
						>
							{#each plan.incidentTypes as type}
								<option value={type.id}>{type.label}</option>
							{/each}
						</select>
					</label>
				</div>

				{#if incidentType === 'rats'}
					<p
						class="m-0 border-l-2 border-danger pl-4 font-sans text-sm leading-relaxed text-danger"
					>
						{plan.ratNotice}
					</p>
				{/if}

				<label class="grid gap-2 font-sans text-sm font-medium">
					Hvad blev observeret?
					<textarea
						class="min-h-28 w-full resize-y rounded-none border border-line bg-paper p-3 font-sans text-base"
						bind:value={observation}
						required
						maxlength="500"></textarea>
				</label>

				<label class="grid max-w-sm gap-2 font-sans text-sm font-medium">
					Kan fødevarer være påvirket?
					<select
						class="min-h-12 rounded-none border border-line bg-paper px-3 font-sans text-base"
						bind:value={productImpact}
					>
						<option value="unknown">Skal vurderes</option>
						<option value="yes">Ja eller muligt</option>
						<option value="no">Nej</option>
					</select>
				</label>

				{#if activeArea}
					<fieldset class="m-0 grid gap-3 border-0 p-0">
						<legend class="mb-2 font-sans text-sm font-medium"
							>Handlinger i {activeArea.label}</legend
						>
						{#each activeArea.incidentActions as action}
							<label class="flex min-h-11 items-start gap-3 font-sans text-sm leading-relaxed">
								<input
									class="mt-1 h-5 w-5 shrink-0"
									type="checkbox"
									bind:group={selectedActions}
									value={action}
								/>
								<span>{action}</span>
							</label>
						{/each}
					</fieldset>
				{/if}

				<button
					class="min-h-12 justify-self-start rounded-full border border-ink bg-ink px-6 font-sans text-sm text-paper"
					type="submit"
				>
					Opret demoregistrering
				</button>
			</form>
		{/if}
	</section>

	<section class="py-12">
		<div class="mb-8 grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
			<h2 class="m-0 font-sans text-xl font-medium tracking-[-.025em]">Områder</h2>
			<p class="m-0 max-w-2xl font-sans text-sm leading-relaxed text-muted">
				Områder og handlinger kommer direkte fra JSON-konfigurationen og skal ændres, når den
				faktiske rumindretning er kortlagt.
			</p>
		</div>
		<div class="grid gap-0">
			{#each plan.areas as area}
				<section class="grid gap-6 border-t border-line py-8 lg:grid-cols-[12rem_1fr_1fr]">
					<div>
						<h3 class="m-0 font-sans text-lg font-medium">{area.label}</h3>
						<p class="mt-2 font-mono text-[10px] tracking-wider text-muted uppercase">
							Eksempel — bekræft rum
						</p>
					</div>
					<div>
						<h4 class="mt-0 mb-3 font-mono text-[10px] tracking-wider text-muted uppercase">
							Forebyggelse
						</h4>
						<ul class="m-0 grid gap-2 pl-5 font-sans text-sm leading-relaxed">
							{#each area.prevention as item}<li>{item}</li>{/each}
						</ul>
					</div>
					<div>
						<h4 class="mt-0 mb-3 font-mono text-[10px] tracking-wider text-muted uppercase">
							Ved fund
						</h4>
						<ul class="m-0 grid gap-2 pl-5 font-sans text-sm leading-relaxed">
							{#each area.incidentActions as item}<li>{item}</li>{/each}
						</ul>
					</div>
				</section>
			{/each}
		</div>
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
