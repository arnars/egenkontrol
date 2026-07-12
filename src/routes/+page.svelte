<script lang="ts">
	import { assessMeasurement, formatTemperature } from '$lib/domain/today-controls';
	import type { PageData } from './$types';

	type Completion = {
		value: number;
		deviation: boolean;
		completedAt: Date;
	};

	let { data }: { data: PageData } = $props();
	let view = $state<'today' | 'week'>('today');
	let activeControlId = $state<string | null>(null);
	let temperatureInput = $state('');
	let deviation = $state(false);
	let error = $state('');
	let eventMessage = $state('');
	let completions = $state<Record<string, Completion>>({});

	let activeControl = $derived(data.controls.find((control) => control.id === activeControlId));
	let pendingControls = $derived(
		data.controls.filter((control) => completions[control.id] === undefined)
	);
	let completedControls = $derived(
		data.controls.filter((control) => completions[control.id] !== undefined)
	);

	const todayLabel = new Intl.DateTimeFormat('da-DK', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(new Date());

	function openControl(id: string) {
		activeControlId = id;
		temperatureInput = '';
		deviation = false;
		error = '';
		eventMessage = '';
	}

	function closeControl() {
		activeControlId = null;
		temperatureInput = '';
		deviation = false;
		error = '';
	}

	function saveControl() {
		if (!activeControl) return;

		const normalized = temperatureInput.replace(',', '.').trim();
		const value = Number(normalized);
		if (normalized === '' || !Number.isFinite(value)) {
			error = 'Indtast en gyldig temperatur.';
			return;
		}

		const assessment = assessMeasurement(activeControl, value);
		if (assessment.requiresDeviation && !deviation) {
			error = `${assessment.message} Markér afvigelse for at fortsætte.`;
			return;
		}

		completions[activeControl.id] = { value, deviation, completedAt: new Date() };
		closeControl();
	}

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

<div class="page-heading-meta">
	<p>{data.locationName} · {todayLabel}</p>
	<div class="view-switch" aria-label="Periode">
		<button
			class:active={view === 'today'}
			aria-pressed={view === 'today'}
			onclick={() => (view = 'today')}>I dag</button
		>
		<button
			class:active={view === 'week'}
			aria-pressed={view === 'week'}
			onclick={() => (view = 'week')}>Ugen</button
		>
	</div>
</div>

<header class="hero">
	<div>
		<p class="eyebrow">{view === 'today' ? 'Dagens drift' : 'Ugens overblik'}</p>
		<h1>{view === 'today' ? 'Dagens kontroller' : 'Ugens kontroller'}</h1>
	</div>
	<p>
		{view === 'today'
			? `${countLabel(pendingControls.length)} mangler. Hændelsesbaserede kontroller startes, når de bliver relevante.`
			: 'Kontroller grupperes senere efter dag. Dagsvisningen forbliver den primære arbejdsgang.'}
	</p>
</header>

{#if data.configurationStatus !== 'approved'}
	<p class="draft-notice" role="status">
		Konfigurationen er et arbejdsudkast. Grænser og hyppigheder afventer virksomhedens godkendelse.
	</p>
{/if}

<section class="control-section" aria-labelledby="pending-heading">
	<header class="section-heading">
		<h2 id="pending-heading">Mangler</h2>
		<span>{countLabel(pendingControls.length)}</span>
	</header>

	{#if pendingControls.length === 0}
		<p class="empty-state">Alle planlagte kontroller er gennemført.</p>
	{:else}
		<div class="control-list">
			{#each pendingControls as control (control.id)}
				<button class="control-row" onclick={() => openControl(control.id)}>
					<span class="control-copy">
						<strong>{control.assetLabel}</strong>
						<small
							>{control.assetType === 'freezer' ? 'Frost' : 'Køl'} · senest kl. {control.dueTime}</small
						>
					</span>
					<span class="control-action">
						<span>Mangler</span>
						<i aria-hidden="true">→</i>
					</span>
				</button>
			{/each}
		</div>
	{/if}
</section>

{#if activeControl}
	<section class="measurement-panel" aria-labelledby="measurement-heading">
		<header>
			<div>
				<p class="eyebrow">Registrér temperatur</p>
				<h2 id="measurement-heading">{activeControl.assetLabel}</h2>
			</div>
			<button class="text-button" onclick={closeControl}>Luk</button>
		</header>

		<div class="measurement-fields">
			<label>
				<span>Målt temperatur</span>
				<span class="temperature-input">
					<input
						bind:value={temperatureInput}
						inputmode="decimal"
						autocomplete="off"
						aria-describedby="profile-hint measurement-error"
					/>
					<i>°C</i>
				</span>
			</label>

			<label class="checkbox-field">
				<input type="checkbox" bind:checked={deviation} />
				<span>Markér afvigelse</span>
			</label>
		</div>

		<p id="profile-hint" class="field-hint">
			{activeControl.profileLabel}: højst {formatTemperature(activeControl.limit)}. Profilstatus:
			{activeControl.profileStatus === 'approved' ? 'godkendt' : 'afventer godkendelse'}.
		</p>
		<p id="measurement-error" class="field-error" aria-live="polite">{error}</p>

		<footer>
			<span>Senere gemmes bruger, tidspunkt og revision.</span>
			<div>
				<button class="secondary-button" onclick={closeControl}>Annullér</button>
				<button class="primary-button" onclick={saveControl}>Gem kontrol</button>
			</div>
		</footer>
	</section>
{/if}

<section class="control-section" aria-labelledby="completed-heading" id="historik">
	<header class="section-heading">
		<h2 id="completed-heading">Gennemført</h2>
		<span>{countLabel(completedControls.length)}</span>
	</header>
	<div class="control-list">
		{#each completedControls as control (control.id)}
			{@const completion = completions[control.id]}
			<div class="control-row is-complete">
				<span class="control-copy">
					<strong>{control.assetLabel}</strong>
					<small
						>{formatTemperature(completion.value)}{completion.deviation
							? ' · afvigelse'
							: ''}</small
					>
				</span>
				<span class="control-action">
					<span>Gemt</span>
					<i aria-hidden="true">✓</i>
				</span>
			</div>
		{/each}
	</div>
</section>

<section class="control-section" aria-labelledby="event-heading">
	<header class="section-heading">
		<h2 id="event-heading">Efter behov</h2>
		<span>Hændelsesbaseret</span>
	</header>
	<div class="control-list">
		{#each data.eventControls as control (control.id)}
			<button class="control-row" onclick={() => startEvent(control.title)}>
				<span class="control-copy">
					<strong>{control.title}</strong>
					<small>{control.description}</small>
				</span>
				<span class="control-action"><span>Start</span><i aria-hidden="true">→</i></span>
			</button>
		{/each}
	</div>
	{#if eventMessage}<p class="event-message" aria-live="polite">{eventMessage}</p>{/if}
</section>
