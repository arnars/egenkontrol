<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { assessMeasurement, formatTemperature } from '$lib/domain/today-controls';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let view = $state<'today' | 'week'>('today');
	let activeControlId = $state<string | null>(null);
	let recordingMode = $state<'measurement' | 'no_measurement'>('measurement');
	let temperatureInput = $state('');
	let deviation = $state(false);
	let deviationDescription = $state('');
	let correctiveActionDescription = $state('');
	let idempotencyKey = $state('');
	let omissionReasonCode = $state('');
	let omissionNote = $state('');
	let dayOmissionOpen = $state(false);
	let dayOmissionReasonCode = $state('');
	let dayOmissionNote = $state('');
	let dayOmissionError = $state('');
	let saving = $state(false);
	let error = $state('');
	let eventMessage = $state('');

	let activeControl = $derived(data.controls.find((control) => control.id === activeControlId));
	let completions = $derived(data.completions);
	let pendingControls = $derived(
		data.controls.filter(
			(control) => completions[control.id] === undefined && data.omissions[control.id] === undefined
		)
	);
	let completedControls = $derived(
		data.controls.filter(
			(control) => completions[control.id] !== undefined || data.omissions[control.id] !== undefined
		)
	);
	let weekPendingCount = $derived(
		data.schedule.days.reduce(
			(total, day) =>
				total +
				day.controls.filter(
					(control) =>
						day.localDate <= data.today &&
						data.weeklyCompletions[control.occurrenceKey] === undefined &&
						data.weeklyOmissions[control.occurrenceKey] === undefined
				).length,
			0
		)
	);
	let weekPlannedCount = $derived(
		data.schedule.days.reduce(
			(total, day) =>
				total +
				day.controls.filter(
					(control) =>
						day.localDate > data.today &&
						data.weeklyCompletions[control.occurrenceKey] === undefined &&
						data.weeklyOmissions[control.occurrenceKey] === undefined
				).length,
			0
		)
	);

	function dateValue(localDate: string) {
		return new Date(`${localDate}T12:00:00Z`);
	}

	function dayLabel(localDate: string) {
		return new Intl.DateTimeFormat('da-DK', {
			timeZone: 'UTC',
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(dateValue(localDate));
	}

	let todayLabel = $derived(dayLabel(data.today));

	function openControl(id: string) {
		dayOmissionOpen = false;
		dayOmissionError = '';
		activeControlId = id;
		recordingMode = 'measurement';
		temperatureInput = '';
		deviation = false;
		deviationDescription = '';
		correctiveActionDescription = '';
		idempotencyKey = crypto.randomUUID();
		omissionReasonCode = data.noMeasurementReasons[0]?.code ?? '';
		omissionNote = '';
		error = '';
		eventMessage = '';
	}

	function openDayOmission() {
		closeControl();
		dayOmissionOpen = true;
		dayOmissionReasonCode = data.noMeasurementReasons[0]?.code ?? '';
		dayOmissionNote = '';
		dayOmissionError = '';
	}

	function closeDayOmission() {
		dayOmissionOpen = false;
		dayOmissionReasonCode = data.noMeasurementReasons[0]?.code ?? '';
		dayOmissionNote = '';
		dayOmissionError = '';
	}

	function closeControl() {
		activeControlId = null;
		recordingMode = 'measurement';
		temperatureInput = '';
		deviation = false;
		deviationDescription = '';
		correctiveActionDescription = '';
		idempotencyKey = '';
		omissionReasonCode = data.noMeasurementReasons[0]?.code ?? '';
		omissionNote = '';
		error = '';
	}

	const enhanceCompletion: SubmitFunction = ({ cancel }) => {
		if (!activeControl) return;

		const normalized = temperatureInput.replace(',', '.').trim();
		const value = Number(normalized);
		if (normalized === '' || !Number.isFinite(value)) {
			error = 'Indtast en gyldig temperatur.';
			cancel();
			return;
		}

		const assessment = assessMeasurement(activeControl, value);
		if (assessment.requiresDeviation && !deviation) {
			error = `${assessment.message} Markér afvigelse for at fortsætte.`;
			cancel();
			return;
		}

		if (deviation && deviationDescription.trim() === '') {
			error = 'Beskriv afvigelsen for at fortsætte.';
			cancel();
			return;
		}

		if (deviation && correctiveActionDescription.trim() === '') {
			error = 'Beskriv den korrigerende handling for at fortsætte.';
			cancel();
			return;
		}

		saving = true;
		error = '';

		return async ({ result }) => {
			saving = false;
			if (result.type === 'success') {
				await invalidateAll();
				closeControl();
				return;
			}

			if (result.type === 'failure') {
				error = String(result.data?.error ?? 'Kontrollen kunne ikke gemmes.');
				return;
			}

			error = 'Din session er udløbet. Genindlæs siden og log ind igen.';
		};
	};

	const enhanceOmission: SubmitFunction = ({ cancel }) => {
		const reason = data.noMeasurementReasons.find((item) => item.code === omissionReasonCode);
		if (!reason) {
			error = 'Vælg en grund til ingen måling.';
			cancel();
			return;
		}

		if (reason.requiresNote && omissionNote.trim() === '') {
			error = 'Skriv en kort forklaring til den valgte grund.';
			cancel();
			return;
		}

		saving = true;
		error = '';
		return async ({ result }) => {
			saving = false;
			if (result.type === 'success') {
				await invalidateAll();
				closeControl();
				return;
			}
			if (result.type === 'failure') {
				error = String(result.data?.error ?? 'Valget kunne ikke gemmes.');
				return;
			}
			error = 'Din session er udløbet. Genindlæs siden og log ind igen.';
		};
	};

	const enhanceDayOmission: SubmitFunction = ({ cancel }) => {
		const reason = data.noMeasurementReasons.find((item) => item.code === dayOmissionReasonCode);
		if (!reason) {
			dayOmissionError = 'Vælg en grund til ingen målinger.';
			cancel();
			return;
		}

		if (reason.requiresNote && dayOmissionNote.trim() === '') {
			dayOmissionError = 'Skriv en kort forklaring til den valgte grund.';
			cancel();
			return;
		}

		saving = true;
		dayOmissionError = '';
		return async ({ result }) => {
			saving = false;
			if (result.type === 'success') {
				await invalidateAll();
				closeDayOmission();
				return;
			}
			if (result.type === 'failure') {
				dayOmissionError = String(result.data?.error ?? 'Dagens kontroller kunne ikke afsluttes.');
				return;
			}
			dayOmissionError = 'Din session er udløbet. Genindlæs siden og log ind igen.';
		};
	};

	function startEvent(title: string) {
		closeControl();
		eventMessage = `${title} bliver næste selvstændige registreringsflow.`;
	}

	function countLabel(count: number) {
		return `${count} ${count === 1 ? 'kontrol' : 'kontroller'}`;
	}
</script>

<svelte:head>
	<title>Dagens kontroller — {data.companyName}</title>
</svelte:head>

<div class="mb-8 flex items-center justify-between gap-4">
	<p class="m-0 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
		{data.locationName} · {todayLabel}
	</p>
	<div class="flex gap-1" aria-label="Periode">
		<button
			class="min-h-11 cursor-pointer border-0 bg-transparent px-4 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase {view ===
			'today'
				? 'text-ink underline underline-offset-[.35rem]'
				: ''}"
			aria-pressed={view === 'today'}
			onclick={() => (view = 'today')}>I dag</button
		>
		<button
			class="min-h-11 cursor-pointer border-0 bg-transparent px-4 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase {view ===
			'week'
				? 'text-ink underline underline-offset-[.35rem]'
				: ''}"
			aria-pressed={view === 'week'}
			onclick={() => (view = 'week')}>Ugen</button
		>
	</div>
</div>

<header
	class="mb-6 grid grid-cols-[minmax(0,1fr)_minmax(18rem,.72fr)] items-end gap-12 border-b border-line pb-10 max-[720px]:grid-cols-1 max-[720px]:gap-6"
>
	<div>
		<p class="m-0 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
			{view === 'today' ? 'Dagens drift' : 'Ugens overblik'}
		</p>
		<h1
			class="mt-2 mb-0 max-w-[12ch] font-sans text-[clamp(3rem,6vw,4.5rem)] leading-[.92] font-semibold tracking-[-.065em] max-[720px]:text-[clamp(2.8rem,14vw,4rem)]"
		>
			{view === 'today' ? 'Dagens kontroller' : 'Ugens kontroller'}
		</h1>
	</div>
	<p class="m-0 font-sans text-[1.05rem] leading-[1.65] text-muted">
		{view === 'today'
			? data.todaySchedule?.isOperatingDay
				? `${countLabel(pendingControls.length)} mangler. Hændelsesbaserede kontroller startes, når de bliver relevante.`
				: 'Ingen faste kontroller i dag. Lokationen er markeret som lukket i driftsplanen.'
			: `${countLabel(weekPendingCount)} mangler, og ${countLabel(weekPlannedCount)} er planlagt senere på ugens driftsdage. Lukkedage opretter ingen faste kontroller.`}
	</p>
</header>

{#if data.configurationStatus !== 'approved'}
	<p class="mb-10 bg-soft px-4 py-3 font-sans text-sm leading-relaxed text-muted" role="status">
		Konfigurationen er et arbejdsudkast. Grænser og hyppigheder afventer virksomhedens godkendelse.
	</p>
{/if}

{#if data.schedulePersistenceError}
	<p class="mb-10 bg-soft px-4 py-3 font-sans text-sm leading-relaxed text-danger" role="alert">
		Ugeplanen kunne ikke forbindes med databasen. Planen vises, men faste kontroller kan ikke
		gemmes, før forbindelsen virker igen.
	</p>
{/if}

{#if view === 'week'}
	<section class="mt-14" aria-labelledby="week-heading">
		<header class="flex items-center justify-between gap-4 border-b border-line pb-3">
			<h2 class="m-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]" id="week-heading">
				Ugeplan
			</h2>
			<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
				{weekPendingCount} mangler · {weekPlannedCount} planlagt
			</span>
		</header>

		<div class="grid">
			{#each data.schedule.days as day (day.localDate)}
				<section class="border-b border-line py-6" aria-labelledby={`day-${day.localDate}`}>
					<header class="mb-3 flex items-center justify-between gap-4 px-2">
						<h3
							class="m-0 font-sans text-lg font-medium first-letter:uppercase"
							id={`day-${day.localDate}`}
						>
							{dayLabel(day.localDate)}{day.localDate === data.today ? ' · i dag' : ''}
						</h3>
						<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
							{day.isOperatingDay ? countLabel(day.controls.length) : 'Lukket'}
						</span>
					</header>

					{#if !day.isOperatingDay}
						<p class="m-0 px-2 font-sans text-sm text-muted">Ingen faste kontroller planlægges.</p>
					{:else if day.controls.length === 0}
						<p class="m-0 px-2 font-sans text-sm text-muted">Ingen faste kontroller denne dag.</p>
					{:else}
						<div class="grid">
							{#each day.controls as control (control.occurrenceKey)}
								{@const completion = data.weeklyCompletions[control.occurrenceKey]}
								{@const omission = data.weeklyOmissions[control.occurrenceKey]}
								<div class="flex min-h-16 items-center justify-between gap-4 px-2 py-3 text-ink">
									<span class="grid gap-1">
										<strong class="font-sans font-medium">{control.assetLabel}</strong>
										<small class="text-sm text-muted"
											>{control.assetType === 'freezer' ? 'Frost' : 'Køl'} · senest kl.
											{control.dueTime}</small
										>
									</span>
									<span class="flex items-center gap-3">
										<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
											>{completion
												? 'Gemt'
												: omission
													? `Ingen måling · ${omission.reasonLabel}`
													: day.localDate > data.today
														? 'Planlagt'
														: 'Mangler'}</span
										>
										<i
											class="grid h-8 w-8 place-items-center rounded-full border font-sans not-italic {completion ||
											omission
												? 'border-ink bg-ink text-paper'
												: 'border-line'}"
											aria-hidden="true">{completion ? '✓' : omission ? '–' : '·'}</i
										>
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</section>
{:else}
	<section class="mt-14" aria-labelledby="pending-heading">
		<header class="flex items-center justify-between gap-4 border-b border-line pb-3">
			<h2 class="m-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]" id="pending-heading">
				Mangler
			</h2>
			<span class="flex items-center gap-4">
				<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
					>{countLabel(pendingControls.length)}</span
				>
				{#if pendingControls.length > 0}
					<button
						class="min-h-11 cursor-pointer border border-ink bg-transparent px-4 font-mono text-[.72rem] tracking-[.11em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-50"
						disabled={data.schedulePersistenceError}
						onclick={openDayOmission}>Ingen målinger i dag</button
					>
				{/if}
			</span>
		</header>

		{#if pendingControls.length === 0}
			<p class="mt-6 font-sans text-muted">
				{data.todaySchedule?.isOperatingDay
					? 'Alle planlagte kontroller er gennemført.'
					: 'Ingen faste kontroller på en lukket driftsdag.'}
			</p>
		{:else}
			<div class="grid">
				{#each pendingControls as control (control.id)}
					<button
						class="flex min-h-19 w-full cursor-pointer items-center justify-between gap-4 border-0 border-b border-line bg-transparent px-2 py-3.5 text-left text-ink hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50"
						disabled={!control.scheduledControlId}
						onclick={() => openControl(control.id)}
					>
						<span class="grid gap-1">
							<strong class="font-sans text-[1.05rem] font-medium">{control.assetLabel}</strong>
							<small class="text-[.95rem] text-muted"
								>{control.assetType === 'freezer' ? 'Frost' : 'Køl'} · senest kl. {control.dueTime}</small
							>
						</span>
						<span class="flex items-center gap-3">
							<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
								>Mangler</span
							>
							<i
								class="grid h-8 w-8 place-items-center rounded-full border border-line font-sans not-italic"
								aria-hidden="true">→</i
							>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</section>

	{#if dayOmissionOpen}
		<section
			class="my-8 grid gap-6 bg-paper p-6 print:hidden"
			aria-labelledby="day-omission-heading"
		>
			<header class="flex items-start justify-between gap-4">
				<div>
					<p class="m-0 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
						Afslut dagens resterende kontroller
					</p>
					<h2
						class="mt-1 mb-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]"
						id="day-omission-heading"
					>
						Ingen målinger i dag
					</h2>
				</div>
				<button
					class="min-h-11 cursor-pointer border-0 bg-transparent px-4 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
					onclick={closeDayOmission}>Luk</button
				>
			</header>

			<form class="grid gap-6" method="POST" action="?/omitDay" use:enhance={enhanceDayOmission}>
				<p class="m-0 font-sans text-base leading-relaxed text-ink">
					Dette afslutter alle {countLabel(pendingControls.length)} uden en temperaturværdi. Allerede
					gemte målinger ændres ikke.
				</p>

				<label class="grid gap-2.5">
					<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">Grund</span>
					<select
						class="min-h-13 w-full rounded-none border border-line bg-page px-3.5 font-sans text-base text-ink"
						name="reasonCode"
						bind:value={dayOmissionReasonCode}
					>
						{#each data.noMeasurementReasons as reason (reason.code)}
							<option value={reason.code}>{reason.label}</option>
						{/each}
					</select>
				</label>

				<label class="grid gap-2.5">
					<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
						>Bemærkning {data.noMeasurementReasons.find(
							(item) => item.code === dayOmissionReasonCode
						)?.requiresNote
							? '· påkrævet'
							: '· valgfri'}</span
					>
					<textarea
						class="w-full resize-y rounded-none border border-line bg-page p-3.5 font-sans text-base leading-relaxed text-ink"
						name="note"
						bind:value={dayOmissionNote}
						rows="3"
						maxlength="1000"></textarea>
				</label>

				<p class="m-0 min-h-5 font-sans text-sm leading-relaxed text-danger" aria-live="polite">
					{dayOmissionError}
				</p>

				<footer class="flex items-center justify-end gap-3 max-[720px]:[&>*]:flex-1">
					<button
						class="min-h-12 cursor-pointer border border-ink bg-transparent px-5 font-mono text-[.72rem] tracking-[.11em] text-ink uppercase"
						type="button"
						onclick={closeDayOmission}>Annullér</button
					>
					<button
						class="min-h-12 cursor-pointer border border-ink bg-ink px-5 font-mono text-[.72rem] tracking-[.11em] text-paper uppercase disabled:cursor-wait disabled:opacity-65"
						type="submit"
						disabled={saving}>{saving ? 'Gemmer…' : 'Gem ingen målinger'}</button
					>
				</footer>
			</form>
		</section>
	{/if}

	{#if activeControl}
		<section
			class="my-8 grid gap-6 bg-paper p-6 print:hidden"
			aria-labelledby="measurement-heading"
		>
			<header class="flex items-center justify-between gap-4">
				<div>
					<p class="m-0 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
						Afslut kontrol
					</p>
					<h2
						class="m-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]"
						id="measurement-heading"
					>
						{activeControl.assetLabel}
					</h2>
				</div>
				<button
					class="min-h-11 cursor-pointer border-0 bg-transparent px-4 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
					onclick={closeControl}>Luk</button
				>
			</header>

			<div class="grid grid-cols-2 border border-line" aria-label="Registreringstype">
				<button
					class="min-h-12 cursor-pointer border-0 px-4 font-mono text-[.72rem] tracking-[.11em] uppercase {recordingMode ===
					'measurement'
						? 'bg-ink text-paper'
						: 'bg-page text-ink'}"
					type="button"
					aria-pressed={recordingMode === 'measurement'}
					onclick={() => {
						recordingMode = 'measurement';
						error = '';
					}}>Temperatur</button
				>
				<button
					class="min-h-12 cursor-pointer border-0 px-4 font-mono text-[.72rem] tracking-[.11em] uppercase {recordingMode ===
					'no_measurement'
						? 'bg-ink text-paper'
						: 'bg-page text-ink'}"
					type="button"
					aria-pressed={recordingMode === 'no_measurement'}
					onclick={() => {
						recordingMode = 'no_measurement';
						error = '';
					}}>Ingen måling</button
				>
			</div>

			{#if recordingMode === 'measurement'}
				<form class="grid gap-6" method="POST" action="?/complete" use:enhance={enhanceCompletion}>
					<input type="hidden" name="controlId" value={activeControl.id} />
					<input type="hidden" name="scheduledControlId" value={activeControl.scheduledControlId} />
					<input type="hidden" name="idempotencyKey" value={idempotencyKey} />
					<div
						class="grid grid-cols-[minmax(0,1fr)_minmax(14rem,.45fr)] items-end gap-6 max-[720px]:grid-cols-1"
					>
						<label class="grid gap-2.5">
							<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
								>Målt temperatur</span
							>
							<span class="relative block">
								<input
									class="min-h-13 w-full rounded-none border border-line bg-page py-2.5 pr-13 pl-3.5 font-sans text-lg text-ink"
									name="value"
									bind:value={temperatureInput}
									inputmode="decimal"
									autocomplete="off"
									aria-describedby="profile-hint measurement-error"
								/>
								<i class="absolute top-1/2 right-4 -translate-y-1/2 font-mono text-muted not-italic"
									>°C</i
								>
							</span>
						</label>

						<label class="flex min-h-13 cursor-pointer items-center gap-3">
							<input
								class="m-0 h-6 w-6 accent-ink"
								name="deviation"
								type="checkbox"
								bind:checked={deviation}
							/>
							<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
								>Markér afvigelse</span
							>
						</label>
					</div>

					{#if deviation}
						<div class="grid grid-cols-2 gap-6 max-[720px]:grid-cols-1">
							<label class="grid gap-2.5">
								<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
									>Beskriv afvigelsen</span
								>
								<textarea
									class="w-full resize-y rounded-none border border-line bg-page p-3.5 font-sans text-base leading-relaxed text-ink"
									name="deviationDescription"
									bind:value={deviationDescription}
									rows="3"
									maxlength="2000"
									required></textarea>
							</label>
							<label class="grid gap-2.5">
								<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
									>Hvad gjorde du?</span
								>
								<textarea
									class="w-full resize-y rounded-none border border-line bg-page p-3.5 font-sans text-base leading-relaxed text-ink"
									name="correctiveActionDescription"
									bind:value={correctiveActionDescription}
									rows="3"
									maxlength="2000"
									required></textarea>
							</label>
						</div>
					{/if}

					<p id="profile-hint" class="m-0 font-sans text-sm leading-relaxed text-muted">
						{activeControl.profileLabel}: højst {formatTemperature(activeControl.limit)}.
						Profilstatus:
						{activeControl.profileStatus === 'approved' ? 'godkendt' : 'afventer godkendelse'}.
					</p>
					<p
						id="measurement-error"
						class="m-0 min-h-5 font-sans text-sm leading-relaxed text-danger"
						aria-live="polite"
					>
						{error}
					</p>

					<footer
						class="flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch"
					>
						<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
							>Bruger, tidspunkt og definitionens revision gemmes i revisionssporet.</span
						>
						<div class="flex gap-3 max-[720px]:[&>*]:flex-1">
							<button
								class="min-h-12 cursor-pointer border border-ink bg-transparent px-5 font-mono text-[.72rem] tracking-[.11em] text-ink uppercase"
								type="button"
								onclick={closeControl}>Annullér</button
							>
							<button
								class="min-h-12 cursor-pointer border border-ink bg-ink px-5 font-mono text-[.72rem] tracking-[.11em] text-paper uppercase disabled:cursor-wait disabled:opacity-65"
								type="submit"
								disabled={saving}>{saving ? 'Gemmer…' : 'Gem kontrol'}</button
							>
						</div>
					</footer>
				</form>
			{:else}
				<form class="grid gap-6" method="POST" action="?/omit" use:enhance={enhanceOmission}>
					<input type="hidden" name="controlId" value={activeControl.id} />
					<input type="hidden" name="scheduledControlId" value={activeControl.scheduledControlId} />

					<label class="grid gap-2.5">
						<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">Grund</span>
						<select
							class="min-h-13 w-full rounded-none border border-line bg-page px-3.5 font-sans text-base text-ink"
							name="reasonCode"
							bind:value={omissionReasonCode}
						>
							{#each data.noMeasurementReasons as reason (reason.code)}
								<option value={reason.code}>{reason.label}</option>
							{/each}
						</select>
					</label>

					<label class="grid gap-2.5">
						<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
							>Bemærkning {data.noMeasurementReasons.find(
								(item) => item.code === omissionReasonCode
							)?.requiresNote
								? '· påkrævet'
								: '· valgfri'}</span
						>
						<textarea
							class="w-full resize-y rounded-none border border-line bg-page p-3.5 font-sans text-base leading-relaxed text-ink"
							name="note"
							bind:value={omissionNote}
							rows="3"
							maxlength="1000"></textarea>
					</label>

					<p class="m-0 font-sans text-sm leading-relaxed text-muted">
						Der gemmes ingen temperatur. Grund, bruger og tidspunkt registreres i revisionssporet.
					</p>
					<p class="m-0 min-h-5 font-sans text-sm leading-relaxed text-danger" aria-live="polite">
						{error}
					</p>

					<footer class="flex items-center justify-end gap-3 max-[720px]:[&>*]:flex-1">
						<button
							class="min-h-12 cursor-pointer border border-ink bg-transparent px-5 font-mono text-[.72rem] tracking-[.11em] text-ink uppercase"
							type="button"
							onclick={closeControl}>Annullér</button
						>
						<button
							class="min-h-12 cursor-pointer border border-ink bg-ink px-5 font-mono text-[.72rem] tracking-[.11em] text-paper uppercase disabled:cursor-wait disabled:opacity-65"
							type="submit"
							disabled={saving}>{saving ? 'Gemmer…' : 'Gem ingen måling'}</button
						>
					</footer>
				</form>
			{/if}
		</section>
	{/if}

	<section class="mt-14" aria-labelledby="completed-heading" id="historik">
		<header class="flex items-center justify-between gap-4 border-b border-line pb-3">
			<h2 class="m-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]" id="completed-heading">
				Afsluttet
			</h2>
			<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
				>{countLabel(completedControls.length)}</span
			>
		</header>
		<div class="grid">
			{#each completedControls as control (control.id)}
				{@const completion = completions[control.id]}
				{@const omission = data.omissions[control.id]}
				<div
					class="flex min-h-19 w-full items-center justify-between gap-4 border-b border-line px-2 py-3.5 text-left text-ink"
				>
					<span class="grid gap-1">
						<strong class="font-sans text-[1.05rem] font-medium">{control.assetLabel}</strong>
						<small class="text-[.95rem] text-muted"
							>{completion
								? `${formatTemperature(completion.value)}${
										completion.deviation
											? completion.correctiveAction
												? ' · afvigelse · handling dokumenteret'
												: ' · afvigelse'
											: ''
									}`
								: `Ingen måling · ${omission.reasonLabel}${omission.note ? ` · ${omission.note}` : ''}`}</small
						>
					</span>
					<span class="flex items-center gap-3">
						<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
							>{completion ? 'Gemt' : 'Ingen måling'}</span
						>
						<i
							class="grid h-8 w-8 place-items-center rounded-full border border-ink bg-ink font-sans text-paper not-italic"
							aria-hidden="true">{completion ? '✓' : '–'}</i
						>
					</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="mt-14 print:hidden" aria-labelledby="event-heading">
		<header class="flex items-center justify-between gap-4 border-b border-line pb-3">
			<h2 class="m-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]" id="event-heading">
				Efter behov
			</h2>
			<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase"
				>Hændelsesbaseret</span
			>
		</header>
		<div class="grid">
			{#each data.eventControls as control (control.id)}
				<button
					class="flex min-h-19 w-full cursor-pointer items-center justify-between gap-4 border-0 border-b border-line bg-transparent px-2 py-3.5 text-left text-ink hover:bg-soft"
					onclick={() => startEvent(control.title)}
				>
					<span class="grid gap-1">
						<strong class="font-sans text-[1.05rem] font-medium">{control.title}</strong>
						<small class="text-[.95rem] text-muted">{control.description}</small>
					</span>
					<span class="flex items-center gap-3"
						><span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">Start</span
						><i
							class="grid h-8 w-8 place-items-center rounded-full border border-line font-sans not-italic"
							aria-hidden="true">→</i
						></span
					>
				</button>
			{/each}
		</div>
		{#if eventMessage}<p
				class="mt-5 mb-10 bg-soft px-4 py-3 font-sans text-sm leading-relaxed text-muted"
				aria-live="polite"
			>
				{eventMessage}
			</p>{/if}
	</section>
{/if}
