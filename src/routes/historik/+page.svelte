<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- query-parametre tilføjes efter base-aware resolve() */
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import DocumentHeader from '$lib/components/DocumentHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let groups = $derived.by(() => {
		const grouped: Record<string, typeof data.entries> = {};
		for (const entry of data.entries) {
			(grouped[entry.localDate] ??= []).push(entry);
		}
		return Object.entries(grouped).map(([localDate, entries]) => ({ localDate, entries }));
	});
	let deviations = $derived(data.entries.filter((entry) => entry.status === 'deviation').length);
	let omissions = $derived(
		data.entries.filter((entry) => entry.status === 'no_measurement').length
	);
	let activeCorrectionId = $state<string | null>(null);
	let correctionRequestId = $state('');
	let correctionError = $state('');
	let correctionMessage = $state('');
	let savingCorrection = $state(false);

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

	function measurementLabel(fieldId: string) {
		if (fieldId === 'startTemperature') return 'Starttemperatur';
		if (fieldId === 'endTemperature') return 'Sluttemperatur';
		return 'Temperatur';
	}

	function countLabel(count: number) {
		return `${count} ${count === 1 ? 'registrering' : 'registreringer'}`;
	}

	function periodQuery(from: string, to: string) {
		const type = data.historyType === 'all' ? '' : `&type=${encodeURIComponent(data.historyType)}`;
		return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${type}`;
	}

	function localDateTimeInput(value: string) {
		const date = new Date(value);
		const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 16);
	}

	function toggleCorrection(id: string) {
		activeCorrectionId = activeCorrectionId === id ? null : id;
		correctionRequestId = crypto.randomUUID();
		correctionError = '';
		correctionMessage = '';
	}

	function printHistory() {
		window.print();
	}

	function enhanceCorrection(entry: PageData['entries'][number]): SubmitFunction {
		return ({ formData, cancel }) => {
			correctionError = '';
			try {
				let payload: Record<string, unknown>;
				if (entry.edit.kind === 'completed_control') {
					const fieldIds = formData.getAll('measurementFieldId').map(String);
					const values = formData
						.getAll('measurementValue')
						.map((value) => Number(String(value).replace(',', '.')));
					const units = formData.getAll('measurementUnit').map(String);
					const measuredAt = formData
						.getAll('measurementAt')
						.map((value) => new Date(String(value)).toISOString());
					if (values.some((value) => !Number.isFinite(value))) throw new Error('temperature');
					payload = {
						observedAt: new Date(String(formData.get('observedAt'))).toISOString(),
						metadata: {
							product: String(formData.get('product') ?? '').trim(),
							batchDate: String(formData.get('batchDate') ?? '')
						},
						measurements: fieldIds.map((fieldId, index) => ({
							fieldId,
							value: values[index],
							unit: units[index],
							measuredAt: measuredAt[index]
						})),
						deviationDescription: String(formData.get('deviationDescription') ?? '').trim() || null,
						correctiveAction: String(formData.get('correctiveAction') ?? '').trim() || null
					};
				} else if (entry.edit.kind === 'scheduled_control_omission') {
					payload = {
						reasonCode: entry.edit.reasonCode,
						reasonLabel: String(formData.get('reasonLabel') ?? '').trim(),
						note: String(formData.get('note') ?? '').trim() || null
					};
				} else if (entry.edit.kind === 'receiving_deviation') {
					const rawTemperature = String(formData.get('measuredTemperature') ?? '').trim();
					const measuredTemperature = rawTemperature
						? Number(rawTemperature.replace(',', '.'))
						: null;
					if (measuredTemperature !== null && !Number.isFinite(measuredTemperature)) {
						throw new Error('temperature');
					}
					payload = {
						observedAt: new Date(String(formData.get('observedAt'))).toISOString(),
						eventKind: 'receiving_deviation',
						payload: {
							supplier: String(formData.get('supplier') ?? '').trim(),
							deliveryReference: String(formData.get('deliveryReference') ?? '').trim(),
							issueLabel: String(formData.get('issueLabel') ?? '').trim(),
							assessment: String(formData.get('assessment') ?? '').trim(),
							actionLabel: String(formData.get('actionLabel') ?? '').trim(),
							measuredTemperature
						}
					};
				} else {
					payload = {
						observedAt: new Date(String(formData.get('observedAt'))).toISOString(),
						eventKind: 'pest_incident',
						payload: {
							areaLabel: String(formData.get('areaLabel') ?? '').trim(),
							incidentLabel: String(formData.get('incidentLabel') ?? '').trim(),
							observation: String(formData.get('observation') ?? '').trim(),
							productImpact: String(formData.get('productImpact') ?? ''),
							actions: String(formData.get('actions') ?? '')
								.split('\n')
								.map((value) => value.trim())
								.filter(Boolean)
						}
					};
				}
				formData.set('payload', JSON.stringify(payload));
			} catch {
				correctionError = 'Kontrollér temperaturer og tidspunkter.';
				cancel();
				return;
			}
			savingCorrection = true;
			return async ({ result }) => {
				savingCorrection = false;
				if (result.type === 'success') {
					activeCorrectionId = null;
					correctionMessage = 'Rettelsen er gemt. Den oprindelige registrering er bevaret.';
					await invalidateAll();
					return;
				}
				if (result.type === 'failure') {
					correctionError = String(result.data?.error ?? 'Rettelsen kunne ikke gemmes.');
					return;
				}
				correctionError = 'Din session er udløbet. Genindlæs siden og log ind igen.';
			};
		};
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
	<div class="hidden border-b border-ink pb-5 print:block">
		<p class="m-0 font-mono text-[10px] tracking-wider uppercase">Nabo Brejning · Egenkontrol</p>
		<p class="mt-2 mb-0 text-sm">Periode: {data.from} — {data.to}</p>
	</div>

	{#if correctionMessage}
		<p class="my-6 border-l-2 border-ink px-4 py-2 font-sans text-sm print:hidden" role="status">
			{correctionMessage}
		</p>
	{/if}

	<section class="border-b border-line py-8 print:hidden" aria-labelledby="filter-heading">
		<div class="mb-5 flex flex-wrap items-baseline justify-between gap-4">
			<h2 class="m-0 font-sans text-xl font-medium tracking-[-.025em]" id="filter-heading">
				Periode
			</h2>
			<div class="flex flex-wrap items-center gap-2">
				<nav class="flex flex-wrap gap-2" aria-label="Hurtige perioder">
					{#each data.presets as preset (preset.days)}
						<a
							class="flex h-8 items-center border border-line px-3 font-mono text-[10px] tracking-wider text-muted uppercase no-underline hover:border-ink hover:text-ink"
							href={resolve('/historik') + periodQuery(preset.from, preset.to)}
							>{preset.days} dage</a
						>
					{/each}
				</nav>
				<button
					class="h-8 cursor-pointer border border-ink bg-ink px-4 font-mono text-[10px] tracking-wider text-paper uppercase"
					type="button"
					onclick={printHistory}>Print / Gem PDF</button
				>
			</div>
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
					{#each data.historyTypeOptions as option (option.value)}
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
				Perioden indeholder flere registreringer, end visningen viser. Vælg et kortere interval for
				at se alt.
			</p>
		{/if}

		<div>
			{#each groups as group (group.localDate)}
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
							<div class="border-t border-line first:border-ink" data-history-entry>
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
										{#if entry.context.length}
											<dl class="mt-3 mb-0 flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm">
												{#each entry.context as item (`${item.label}:${item.value}`)}
													<div class="flex gap-2">
														<dt class="text-muted">{item.label}:</dt>
														<dd class="m-0">{item.value}</dd>
													</div>
												{/each}
											</dl>
										{/if}
										{#if entry.correctionHistory.length}
											<div
												class="mt-3 border-l-2 border-ink pl-3 font-sans text-xs leading-relaxed"
											>
												<strong>Rettet</strong> · {entry.correctionHistory.at(-1)?.reason}
												<details class="mt-1 print:hidden">
													<summary class="cursor-pointer text-muted">Vis revisionsspor</summary>
													<p class="mb-1">Oprindeligt: {entry.originalSummary}</p>
													<ul class="m-0 pl-5">
														{#each entry.correctionHistory as correction (correction.revision)}
															<li>
																Revision {correction.revision} · {dateLabel(
																	correction.correctedAt.slice(0, 10)
																)} · {correction.reason}
															</li>
														{/each}
													</ul>
												</details>
											</div>
										{/if}
										<button
											class="mt-3 cursor-pointer border-0 bg-transparent p-0 font-mono text-[10px] tracking-wider text-muted uppercase underline decoration-line underline-offset-4 print:hidden"
											type="button"
											onclick={() => toggleCorrection(entry.id)}
											aria-expanded={activeCorrectionId === entry.id}
										>
											{activeCorrectionId === entry.id ? 'Luk rettelse' : 'Genåbn og ret'}
										</button>
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

								{#if activeCorrectionId === entry.id}
									<form
										class="grid gap-5 border-t border-line bg-paper px-4 py-6 font-sans print:hidden"
										method="POST"
										action="?/correct"
										use:enhance={enhanceCorrection(entry)}
									>
										<input type="hidden" name="sourceType" value={entry.sourceType} />
										<input type="hidden" name="sourceId" value={entry.sourceId} />
										<input type="hidden" name="requestId" value={correctionRequestId} />
										<input type="hidden" name="payload" value={JSON.stringify({})} />
										<header>
											<p class="mb-1 font-mono text-[10px] tracking-wider text-muted uppercase">
												Rettelse med revisionsspor
											</p>
											<h3 class="m-0 text-lg font-medium">{entry.controlLabel}</h3>
										</header>

										{#if entry.edit.kind === 'completed_control'}
											<label class="grid max-w-sm gap-2 text-sm font-medium">
												Kontrollens tidspunkt
												<input
													class="min-h-12 border border-line bg-white px-3 text-base"
													type="datetime-local"
													name="observedAt"
													value={localDateTimeInput(entry.edit.observedAt)}
													required
												/>
											</label>
											{#if entry.edit.product || entry.edit.batchDate || entry.edit.measurements.length > 1}
												<div class="grid gap-4 sm:grid-cols-2">
													<label class="grid gap-2 text-sm font-medium">
														Ret eller vare
														<input
															class="min-h-12 border border-line bg-white px-3 text-base"
															name="product"
															value={entry.edit.product}
															required
														/>
													</label>
													{#if entry.edit.batchDate || entry.edit.measurements.length > 1}
														<label class="grid gap-2 text-sm font-medium">
															Batchdato
															<input
																class="min-h-12 border border-line bg-white px-3 text-base"
																type="date"
																name="batchDate"
																value={entry.edit.batchDate}
																required
															/>
														</label>
													{/if}
												</div>
											{/if}
											<div class="grid gap-4 sm:grid-cols-2">
												{#each entry.edit.measurements as measurement (measurement.fieldId)}
													<div class="grid gap-3 border-t border-line pt-4">
														<input
															type="hidden"
															name="measurementFieldId"
															value={measurement.fieldId}
														/>
														<input type="hidden" name="measurementUnit" value={measurement.unit} />
														<label class="grid gap-2 text-sm font-medium">
															{measurementLabel(measurement.fieldId)}
															<input
																class="min-h-12 border border-line bg-white px-3 text-base"
																name="measurementValue"
																inputmode="decimal"
																value={String(measurement.value).replace('.', ',')}
																required
															/>
														</label>
														<label class="grid gap-2 text-sm font-medium">
															Målingstidspunkt
															<input
																class="min-h-12 border border-line bg-white px-3 text-base"
																type="datetime-local"
																name="measurementAt"
																value={localDateTimeInput(measurement.measuredAt)}
																required
															/>
														</label>
													</div>
												{/each}
											</div>
											<div class="grid gap-4 sm:grid-cols-2">
												<label class="grid gap-2 text-sm font-medium">
													Afvigelse, hvis relevant
													<textarea
														class="min-h-24 border border-line bg-white p-3 text-base"
														name="deviationDescription">{entry.edit.deviationDescription}</textarea
													>
												</label>
												<label class="grid gap-2 text-sm font-medium">
													Korrigerende handling
													<textarea
														class="min-h-24 border border-line bg-white p-3 text-base"
														name="correctiveAction">{entry.edit.correctiveAction}</textarea
													>
												</label>
											</div>
										{:else if entry.edit.kind === 'scheduled_control_omission'}
											<label class="grid gap-2 text-sm font-medium">
												Grund
												<input
													class="min-h-12 border border-line bg-white px-3 text-base"
													name="reasonLabel"
													value={entry.edit.reasonLabel}
													required
												/>
											</label>
											<label class="grid gap-2 text-sm font-medium">
												Bemærkning
												<textarea
													class="min-h-24 border border-line bg-white p-3 text-base"
													name="note">{entry.edit.note}</textarea
												>
											</label>
										{:else if entry.edit.kind === 'receiving_deviation'}
											<div class="grid gap-4 sm:grid-cols-2">
												<label class="grid gap-2 text-sm font-medium"
													>Tidspunkt<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														type="datetime-local"
														name="observedAt"
														value={localDateTimeInput(entry.edit.observedAt)}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Leverandør<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="supplier"
														value={entry.edit.supplier}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Leverance<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="deliveryReference"
														value={entry.edit.deliveryReference}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Fejltype<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="issueLabel"
														value={entry.edit.issueLabel}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Handling<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="actionLabel"
														value={entry.edit.actionLabel}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Temperatur<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="measuredTemperature"
														inputmode="decimal"
														value={entry.edit.measuredTemperature === null
															? ''
															: String(entry.edit.measuredTemperature).replace('.', ',')}
													/></label
												>
											</div>
											<label class="grid gap-2 text-sm font-medium"
												>Vurdering<textarea
													class="min-h-24 border border-line bg-white p-3 text-base"
													name="assessment"
													required>{entry.edit.assessment}</textarea
												></label
											>
										{:else}
											<div class="grid gap-4 sm:grid-cols-2">
												<label class="grid gap-2 text-sm font-medium"
													>Tidspunkt<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														type="datetime-local"
														name="observedAt"
														value={localDateTimeInput(entry.edit.observedAt)}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Område<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="areaLabel"
														value={entry.edit.areaLabel}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Fund<input
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="incidentLabel"
														value={entry.edit.incidentLabel}
														required
													/></label
												>
												<label class="grid gap-2 text-sm font-medium"
													>Fødevarer påvirket<select
														class="min-h-12 border border-line bg-white px-3 text-base"
														name="productImpact"
														value={entry.edit.productImpact}
														><option value="unknown">Skal vurderes</option><option value="yes"
															>Ja eller muligt</option
														><option value="no">Nej</option></select
													></label
												>
											</div>
											<label class="grid gap-2 text-sm font-medium"
												>Observation<textarea
													class="min-h-24 border border-line bg-white p-3 text-base"
													name="observation"
													required>{entry.edit.observation}</textarea
												></label
											>
											<label class="grid gap-2 text-sm font-medium"
												>Handlinger, én pr. linje<textarea
													class="min-h-28 border border-line bg-white p-3 text-base"
													name="actions">{entry.edit.actions.join('\n')}</textarea
												></label
											>
										{/if}

										<label class="grid gap-2 text-sm font-medium">
											Hvorfor rettes registreringen?
											<input
												class="min-h-12 border border-line bg-white px-3 text-base"
												name="correctionReason"
												placeholder="Fx tastefejl"
												minlength="3"
												maxlength="500"
												required
											/>
										</label>
										{#if correctionError}<p class="m-0 text-sm text-danger" role="alert">
												{correctionError}
											</p>{/if}
										<div class="flex flex-wrap gap-3">
											<button
												class="min-h-11 cursor-pointer rounded-full bg-ink px-5 text-sm text-paper disabled:opacity-50"
												type="submit"
												disabled={savingCorrection}
												>{savingCorrection ? 'Gemmer…' : 'Gem rettelse'}</button
											>
											<button
												class="min-h-11 cursor-pointer border-0 bg-transparent px-3 text-sm text-muted"
												type="button"
												onclick={() => toggleCorrection(entry.id)}>Annuller</button
											>
										</div>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</article>
