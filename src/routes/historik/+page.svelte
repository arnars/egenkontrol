<script lang="ts">
	import { resolve } from '$app/paths';
	import DocumentHeader from '$lib/components/DocumentHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let groups = $derived.by(() => {
		const grouped = new Map<string, typeof data.entries>();
		for (const entry of data.entries) {
			const entries = grouped.get(entry.localDate) ?? [];
			entries.push(entry);
			grouped.set(entry.localDate, entries);
		}
		return [...grouped.entries()].map(([localDate, entries]) => ({ localDate, entries }));
	});
	let deviations = $derived(data.entries.filter((entry) => entry.status === 'deviation').length);
	let omissions = $derived(
		data.entries.filter((entry) => entry.status === 'no_measurement').length
	);

	function dateLabel(localDate: string) {
		return new Intl.DateTimeFormat('da-DK', {
			timeZone: 'UTC',
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(`${localDate}T12:00:00Z`));
	}

	function timeLabel(value: string) {
		return new Intl.DateTimeFormat('da-DK', {
			timeZone: data.timeZone,
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(value));
	}

	function temperature(value: number | null) {
		return value === null
			? '—'
			: `${value.toLocaleString('da-DK', { maximumFractionDigits: 1 })} °C`;
	}

	function countLabel(count: number) {
		return `${count} ${count === 1 ? 'registrering' : 'registreringer'}`;
	}

	function periodHref(from: string, to: string) {
		const params = new URLSearchParams({ from, to });
		if (data.historyType !== 'all') params.set('type', data.historyType);
		return `?${params.toString()}`;
	}
</script>

<svelte:head>
	<title>Kontrolhistorik — Nabo Brejning</title>
	<meta name="description" content="Historik over udførte kontroller hos Nabo Brejning." />
</svelte:head>

<article>
	<DocumentHeader
		eyebrow={data.locationName}
		title="Historik"
		introduction="Se målinger, dage uden måling, afvigelser og dokumenterede handlinger for en valgt periode. Historikken vises i lokationens lokale tid."
	/>

	<section class="border-b border-line py-8" aria-labelledby="filter-heading">
		<div class="mb-5 flex flex-wrap items-baseline justify-between gap-4">
			<h2 class="m-0 font-sans text-xl font-medium tracking-[-.025em]" id="filter-heading">
				Periode
			</h2>
			<nav class="flex flex-wrap gap-2" aria-label="Hurtige perioder">
				{#each data.presets as preset}
					<a
						class="flex h-8 items-center border border-line px-3 font-mono text-[10px] tracking-wider text-muted uppercase no-underline hover:border-ink hover:text-ink"
						href={periodHref(preset.from, preset.to)}>{preset.days} dage</a
					>
				{/each}
			</nav>
		</div>

		<form
			class="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1fr_1fr_auto]"
			method="GET"
			action={resolve('/historik')}
		>
			<label class="grid gap-2 font-sans text-sm font-medium">
				Fra
				<input
					class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
					type="date"
					name="from"
					value={data.from}
					max={data.today}
					required
				/>
			</label>
			<label class="grid gap-2 font-sans text-sm font-medium">
				Til og med
				<input
					class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
					type="date"
					name="to"
					value={data.to}
					max={data.today}
					required
				/>
			</label>
			<label class="grid gap-2 font-sans text-sm font-medium">
				Type
				<select
					class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
					name="type"
					value={data.historyType}
				>
					{#each data.historyTypeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<button
				class="min-h-12 cursor-pointer border border-ink bg-ink px-6 font-mono text-[11px] tracking-widest text-paper uppercase"
				type="submit">Vis periode</button
			>
		</form>
		{#if data.filterError}<p class="mb-0 font-sans text-sm text-danger" role="alert">
				{data.filterError}
			</p>{/if}
	</section>

	<section class="grid grid-cols-3 border-b border-line py-6" aria-label="Opsummering">
		<div class="border-r border-line px-4 first:pl-0">
			<strong class="block font-sans text-2xl font-medium">{data.totalCount}</strong>
			<span class="font-mono text-[10px] tracking-wider text-muted uppercase">Registreringer</span>
		</div>
		<div class="border-r border-line px-4">
			<strong class="block font-sans text-2xl font-medium">{deviations}</strong>
			<span class="font-mono text-[10px] tracking-wider text-muted uppercase">Afvigelser</span>
		</div>
		<div class="px-4 pr-0">
			<strong class="block font-sans text-2xl font-medium">{omissions}</strong>
			<span class="font-mono text-[10px] tracking-wider text-muted uppercase">Ingen måling</span>
		</div>
	</section>

	{#if data.availabilityMessage}
		<p class="my-10 border-l-2 border-ink pl-4 font-sans text-sm leading-relaxed text-muted">
			{data.availabilityMessage}
		</p>
	{:else if data.loadError}
		<p class="my-8 border-l-2 border-danger pl-4 font-sans text-sm text-danger" role="alert">
			{data.loadError}
		</p>
	{:else if data.entries.length === 0}
		<p class="my-12 font-sans text-muted">Der er ingen registreringer i den valgte periode.</p>
	{:else}
		{#if data.truncated}
			<p class="my-8 border-l-2 border-ink pl-4 font-sans text-sm text-muted">
				Perioden indeholder flere registreringer, end denne prototype viser. Vælg et kortere
				interval for at se alt.
			</p>
		{/if}

		<div>
			{#each groups as group}
				<section class="border-b border-line py-10" aria-labelledby={`history-${group.localDate}`}>
					<header class="mb-4 flex items-baseline justify-between gap-4">
						<h2
							class="m-0 font-sans text-xl font-medium tracking-[-.025em]"
							id={`history-${group.localDate}`}
						>
							{dateLabel(group.localDate)}
						</h2>
						<span class="font-mono text-[10px] tracking-wider text-muted uppercase">
							{countLabel(group.entries.length)}
						</span>
					</header>

					<div class="grid">
						{#each group.entries as entry (entry.id)}
							<div class="border-t border-line first:border-ink">
								<div
									class="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-2 py-4"
								>
									<div class="min-w-0">
										<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
											<strong class="font-sans text-base font-medium">{entry.controlLabel}</strong>
											<span class="font-mono text-[10px] tracking-wider text-muted uppercase"
												>kl. {timeLabel(entry.occurredAt)}</span
											>
										</div>
										<p class="mt-1 mb-0 font-sans text-sm leading-relaxed text-muted">
											{entry.status === 'normal'
												? 'Kontrol gennemført uden afvigelse'
												: entry.status === 'deviation'
													? `Afvigelse · ${entry.detail ?? 'beskrivelse mangler'}`
													: `Ingen måling · ${entry.detail}`}
										</p>
										{#if entry.action}
											<p class="mt-1 mb-0 font-sans text-sm leading-relaxed">
												<span class="text-muted">Handling:</span>
												{entry.action}
											</p>
										{/if}
									</div>
									<div class="text-right">
										<strong class="block font-sans text-lg font-medium">
											{entry.kind === 'measurement' ? temperature(entry.value) : '—'}
										</strong>
										<span
											class="font-mono text-[10px] tracking-wider uppercase"
											class:text-danger={entry.status === 'deviation'}
											class:text-muted={entry.status !== 'deviation'}
										>
											{entry.status === 'normal'
												? 'Gennemført'
												: entry.status === 'deviation'
													? 'Afvigelse'
													: 'Ingen måling'}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</article>
