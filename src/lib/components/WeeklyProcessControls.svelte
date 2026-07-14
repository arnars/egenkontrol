<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';

	type ProcessControl = {
		definitionId: string;
		title: string;
		description: string;
		scheduledControlId: string | null;
		outcome: WeeklyOutcome | null;
	} & (
		| {
				kind: 'heating';
				minimumTemperature: number;
		  }
		| {
				kind: 'hot_holding';
				minimumTemperature: number;
		  }
		| {
				kind: 'cooling';
				fromTemperature: number;
				toTemperature: number;
				maximumDurationMinutes: number;
		  }
	);

	type WeeklyOutcome = {
		status: 'completed' | 'not_relevant' | 'in_progress';
		summary: string;
		recordedAt: string;
		cooling?: {
			product: string;
			batchDate: string;
			startTemperature: number;
			startedAt: string;
		};
	};

	let {
		controls,
		today
	}: {
		controls: ProcessControl[];
		today: string;
	} = $props();

	let activeId = $state<string | null>(null);
	let productOrBatch = $state('');
	let batchDate = $state('');
	let measuredTemperature = $state('');
	let startTemperature = $state('');
	let startTime = $state('');
	let endTemperature = $state('');
	let endTime = $state('');
	let deviationDescription = $state('');
	let correctiveAction = $state('');
	let error = $state('');
	let savedMessage = $state('');
	let requestId = $state('');
	let saving = $state(false);

	let activeControl = $derived(controls.find((control) => control.definitionId === activeId));
	let completedCount = $derived(
		controls.filter((control) => control.outcome && control.outcome.status !== 'in_progress').length
	);

	function numberValue(value: string) {
		const normalized = value.replace(',', '.').trim();
		return normalized === '' ? Number.NaN : Number(normalized);
	}

	function formatTemperature(value: number) {
		return `${value.toLocaleString('da-DK', { maximumFractionDigits: 1 })} °C`;
	}

	function localDateTimeInput(value: string) {
		const date = new Date(value);
		const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 16);
	}

	function deviationRequired() {
		if (!activeControl) return false;
		if (activeControl.kind === 'heating' || activeControl.kind === 'hot_holding') {
			const value = numberValue(measuredTemperature);
			return Number.isFinite(value) && value < activeControl.minimumTemperature;
		}

		const end = numberValue(endTemperature);
		const start = new Date(startTime).getTime();
		const finish = new Date(endTime).getTime();
		const durationMinutes = (finish - start) / 60_000;
		return (
			(Number.isFinite(end) && end > activeControl.toTemperature) ||
			(Number.isFinite(durationMinutes) && durationMinutes > activeControl.maximumDurationMinutes)
		);
	}

	function resetForm() {
		productOrBatch = '';
		batchDate = today;
		measuredTemperature = '';
		startTemperature = '';
		startTime = '';
		endTemperature = '';
		endTime = '';
		deviationDescription = '';
		correctiveAction = '';
		error = '';
	}

	function toggleControl(id: string) {
		const control = controls.find((item) => item.definitionId === id);
		const outcome = control?.outcome;
		if (outcome && outcome.status !== 'in_progress') return;
		activeId = activeId === id ? null : id;
		resetForm();
		requestId = crypto.randomUUID();
		if (activeId === id && outcome?.cooling) {
			productOrBatch = outcome.cooling.product;
			batchDate = outcome.cooling.batchDate;
			startTemperature = String(outcome.cooling.startTemperature).replace('.', ',');
			startTime = localDateTimeInput(outcome.cooling.startedAt);
		}
		savedMessage = '';
	}

	function enhanceProcess(control: ProcessControl): SubmitFunction {
		return ({ formData, cancel, submitter }) => {
			const isOmission = submitter?.getAttribute('formaction')?.includes('omitProcess') ?? false;
			const inProgress = control.outcome?.status === 'in_progress';
			error = '';

			if (!control.scheduledControlId) {
				error = 'Ugens kontrol kunne ikke forbindes med databasen.';
				cancel();
				return;
			}

			if (!isOmission) {
				if (productOrBatch.trim() === '') {
					error =
						control.kind === 'cooling'
							? 'Skriv hvilken ret nedkølingen gælder.'
							: 'Skriv hvilken ret eller vare målingen gælder.';
					cancel();
					return;
				}
				if (control.kind === 'cooling' && !inProgress) {
					if (!batchDate || !Number.isFinite(numberValue(startTemperature)) || !startTime) {
						error = 'Udfyld ret, batchdato, starttemperatur og starttidspunkt.';
						cancel();
						return;
					}
					formData.set('startedAt', new Date(startTime).toISOString());
				} else if (control.kind === 'cooling') {
					if (!Number.isFinite(numberValue(endTemperature)) || !endTime) {
						error = 'Udfyld sluttemperatur og sluttidspunkt.';
						cancel();
						return;
					}
					if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
						error = 'Sluttidspunktet skal ligge efter starttidspunktet.';
						cancel();
						return;
					}
					formData.set('completedAt', new Date(endTime).toISOString());
				} else if (!Number.isFinite(numberValue(measuredTemperature))) {
					error = 'Indtast en gyldig temperatur.';
					cancel();
					return;
				}

				if (deviationRequired() && deviationDescription.trim() === '') {
					error = 'Beskriv afvigelsen for at fortsætte.';
					cancel();
					return;
				}
				if (deviationRequired() && correctiveAction.trim() === '') {
					error = 'Beskriv den korrigerende handling for at fortsætte.';
					cancel();
					return;
				}
			}

			saving = true;
			return async ({ result }) => {
				saving = false;
				if (result.type === 'success') {
					savedMessage = isOmission
						? `${control.title} er markeret som ikke relevant i denne uge.`
						: control.kind === 'cooling' && !inProgress
							? 'Nedkølingen er startet og står som igangværende.'
							: `${control.title} er gemt for denne uge.`;
					activeId = null;
					resetForm();
					await invalidateAll();
					return;
				}
				if (result.type === 'failure') {
					error = String(result.data?.error ?? 'Registreringen kunne ikke gemmes.');
					return;
				}
				error = 'Din session er udløbet. Genindlæs siden og log ind igen.';
			};
		};
	}
</script>

<section class="mt-14 print:hidden" aria-labelledby="weekly-process-heading">
	<header class="flex items-end justify-between gap-4 border-b border-line pb-3">
		<div>
			<p class="mb-1 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
				Dokumentér én relevant hændelse
			</p>
			<h2
				class="m-0 font-sans text-[1.6rem] font-medium tracking-[-.035em]"
				id="weekly-process-heading"
			>
				Ugens proceskontroller
			</h2>
		</div>
		<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
			{completedCount} af {controls.length} afsluttet
		</span>
	</header>

	<p class="mt-4 mb-2 max-w-2xl font-sans text-sm leading-relaxed text-muted">
		Vælg én konkret opvarmning, nedkøling eller varmholdelse i løbet af ugen. Hvis aktiviteten ikke
		forekommer, markeres den som ikke relevant for netop denne uge. Afvigelser registreres altid.
	</p>

	<div class="grid">
		{#each controls as control (control.definitionId)}
			{@const outcome = control.outcome}
			{@const inProgress = outcome?.status === 'in_progress'}
			<section class="border-b border-line" aria-labelledby={`process-${control.definitionId}`}>
				<button
					class="flex min-h-19 w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-2 py-3.5 text-left text-ink hover:bg-soft disabled:cursor-default"
					type="button"
					onclick={() => toggleControl(control.definitionId)}
					disabled={Boolean(outcome && !inProgress)}
					aria-expanded={activeId === control.definitionId}
				>
					<span class="grid gap-1">
						<strong
							class="font-sans text-[1.05rem] font-medium"
							id={`process-${control.definitionId}`}>{control.title}</strong
						>
						<small class="text-[.95rem] text-muted">{outcome?.summary ?? control.description}</small
						>
					</span>
					<span class="flex items-center gap-3">
						<span class="font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
							{outcome
								? outcome.status === 'not_relevant'
									? 'Ikke relevant'
									: outcome.status === 'in_progress'
										? 'I gang'
										: 'Gemt'
								: 'Mangler'}
						</span>
						<i
							class="grid h-8 w-8 place-items-center rounded-full border font-sans not-italic {outcome
								? 'border-ink bg-ink text-paper'
								: 'border-line'}"
							aria-hidden="true"
							>{outcome?.status === 'completed'
								? '✓'
								: outcome?.status === 'not_relevant'
									? '–'
									: outcome?.status === 'in_progress'
										? '…'
										: activeId === control.definitionId
											? '×'
											: '+'}</i
						>
					</span>
				</button>

				{#if activeId === control.definitionId}
					<form
						class="mx-2 mb-6 grid gap-6 border-t border-line pt-6"
						method="POST"
						action={control.kind === 'cooling'
							? inProgress
								? '?/completeCooling'
								: '?/startCooling'
							: '?/completeProcess'}
						use:enhance={enhanceProcess(control)}
					>
						<input
							type="hidden"
							name="scheduledControlId"
							value={control.scheduledControlId ?? ''}
						/>
						<input type="hidden" name="definitionId" value={control.definitionId} />
						<input type="hidden" name="requestId" value={requestId} />
						<div class="flex flex-wrap items-start justify-between gap-4">
							<p class="m-0 max-w-2xl font-sans text-sm leading-relaxed text-muted">
								{#if control.kind === 'heating'}
									Udkastet bruger mindst {formatTemperature(control.minimumTemperature)}. Andre
									godkendte produkt- og procesprofiler kan gælde.
								{:else if control.kind === 'hot_holding'}
									Udkastet bruger mindst {formatTemperature(control.minimumTemperature)} under varmholdelsen.
								{:else}
									Udkastet bruger {formatTemperature(control.fromTemperature)} til
									{formatTemperature(control.toTemperature)} inden for
									{control.maximumDurationMinutes / 60} timer.
								{/if}
							</p>
							{#if !inProgress}
								<button
									class="min-h-11 cursor-pointer border border-line bg-transparent px-4 font-sans text-sm text-ink"
									type="submit"
									formaction="?/omitProcess"
									formnovalidate
									disabled={saving || !control.scheduledControlId}>Ikke relevant i denne uge</button
								>
							{/if}
						</div>

						<label class="grid max-w-xl gap-2 font-sans text-sm font-medium">
							{control.kind === 'cooling' ? 'Ret' : 'Ret, vare eller batch'}
							<input
								class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
								name="product"
								bind:value={productOrBatch}
								readonly={inProgress}
								maxlength="120"
								required
							/>
						</label>

						{#if control.kind === 'cooling'}
							<label class="grid max-w-xs gap-2 font-sans text-sm font-medium">
								Batchdato
								<input
									class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
									type="date"
									name="batchDate"
									bind:value={batchDate}
									readonly={inProgress}
									required
								/>
							</label>
						{/if}

						{#if control.kind === 'cooling'}
							<div class="grid gap-5 {inProgress ? 'md:grid-cols-2' : 'max-w-xl'}">
								<fieldset class="m-0 grid gap-4 border border-line p-5">
									<legend class="px-2 font-sans text-sm font-medium">Start</legend>
									<label class="grid gap-2 font-sans text-sm font-medium">
										Temperatur
										<input
											class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
											type="text"
											inputmode="decimal"
											name="startTemperature"
											bind:value={startTemperature}
											readonly={inProgress}
											required
										/>
									</label>
									<label class="grid gap-2 font-sans text-sm font-medium">
										Tidspunkt
										<input
											class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
											type="datetime-local"
											bind:value={startTime}
											readonly={inProgress}
											required
										/>
									</label>
								</fieldset>
								{#if inProgress}<fieldset class="m-0 grid gap-4 border border-line p-5">
										<legend class="px-2 font-sans text-sm font-medium">Slut</legend>
										<label class="grid gap-2 font-sans text-sm font-medium">
											Temperatur
											<input
												class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
												type="text"
												inputmode="decimal"
												name="endTemperature"
												bind:value={endTemperature}
												required
											/>
										</label>
										<label class="grid gap-2 font-sans text-sm font-medium">
											Tidspunkt
											<input
												class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
												type="datetime-local"
												bind:value={endTime}
												required
											/>
										</label>
									</fieldset>{/if}
							</div>
						{:else}
							<label class="grid max-w-xs gap-2 font-sans text-sm font-medium">
								Målt temperatur
								<input
									class="min-h-12 border border-line bg-paper px-3 font-sans text-base"
									type="text"
									inputmode="decimal"
									name="value"
									bind:value={measuredTemperature}
									required
								/>
							</label>
						{/if}

						{#if deviationRequired()}
							<div class="grid gap-5 border-l-2 border-danger pl-5 md:grid-cols-2">
								<label class="grid gap-2 font-sans text-sm font-medium">
									Hvad afviger?
									<textarea
										class="min-h-24 resize-y border border-line bg-paper p-3 font-sans text-base"
										name="deviationDescription"
										bind:value={deviationDescription}
										required></textarea>
								</label>
								<label class="grid gap-2 font-sans text-sm font-medium">
									Korrigerende handling
									<textarea
										class="min-h-24 resize-y border border-line bg-paper p-3 font-sans text-base"
										name="correctiveAction"
										bind:value={correctiveAction}
										required></textarea>
								</label>
							</div>
						{/if}

						{#if error}<p class="m-0 font-sans text-sm text-danger" role="alert">{error}</p>{/if}

						<div class="flex flex-wrap gap-3">
							<button
								class="min-h-12 cursor-pointer border border-ink bg-ink px-6 font-sans text-sm text-paper"
								disabled={saving || !control.scheduledControlId}
								type="submit"
								>{saving
									? 'Gemmer…'
									: control.kind === 'cooling' && !inProgress
										? 'Start nedkøling'
										: control.kind === 'cooling'
											? 'Afslut nedkøling'
											: 'Gem ugens kontrol'}</button
							>
							<button
								class="min-h-12 cursor-pointer border border-line bg-transparent px-6 font-sans text-sm text-ink"
								type="button"
								onclick={() => (activeId = null)}>Annuller</button
							>
						</div>
					</form>
				{/if}
			</section>
		{/each}
	</div>

	{#if savedMessage}
		<p class="mt-5 mb-0 border-l-2 border-ink pl-4 font-sans text-sm text-muted" role="status">
			{savedMessage}
		</p>
	{/if}
</section>
