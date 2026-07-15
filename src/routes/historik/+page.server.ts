import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import catalog from '../../../config/egenkontrol.defaults.json';
import business from '../../../config/virksomhed.json';
import { historyTypeOptions, parseHistoryType } from '$lib/domain/control-history';
import { buildTemperatureControls } from '$lib/domain/today-controls';
import type { Actions, PageServerLoad } from './$types';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const queryLimit = 1_000;
const location = business.locations[0];
const timeZone = location?.timeZone ?? 'Europe/Copenhagen';
const controlDefinitions = buildTemperatureControls(
	business.assets,
	catalog.productTemperatureProfiles,
	business.controlOverrides,
	location?.id ?? ''
);
const controlLabels = new Map([
	...controlDefinitions.map((control) => [control.id, control.assetLabel] as const),
	...catalog.controls.map((control) => [control.id, control.title] as const)
]);

type StoredMeasurement = {
	field_id: string;
	value: number;
	unit: string;
	measured_at: string;
};

type StoredCompletion = {
	id: string;
	observed_at: string;
	metadata: {
		configuredControlId?: string;
		product?: string;
		batchDate?: string;
		durationMinutes?: number;
	} | null;
	measurements: StoredMeasurement[];
	deviations: Array<{
		description: string;
		corrective_actions: Array<{ description: string; status: string }>;
	}>;
};

type StoredOmission = {
	id: string;
	reason_code: string;
	reason_label: string;
	note: string | null;
	recorded_at: string;
	scheduled_controls: {
		local_date: string;
		occurrence_key: string;
	} | null;
};

type StoredOperationalEvent = {
	id: string;
	event_type: 'receiving' | 'pest';
	event_kind: 'receiving_deviation' | 'pest_incident';
	observed_at: string;
	payload: Record<string, unknown>;
};

type StoredCorrection = {
	id: string;
	source_type: 'completed_control' | 'scheduled_control_omission' | 'operational_event';
	source_id: string;
	revision: number;
	correction_reason: string;
	payload: Record<string, unknown>;
	corrected_at: string;
};

const measurementSchema = z.object({
	fieldId: z.string().trim().min(1).max(80),
	value: z.number().min(-100).max(200),
	unit: z.string().trim().min(1).max(20),
	measuredAt: z.iso.datetime()
});

const completionPayloadSchema = z
	.object({
		observedAt: z.iso.datetime(),
		metadata: z.object({
			product: z.string().trim().max(120).optional(),
			batchDate: z.union([z.iso.date(), z.literal('')]).optional()
		}),
		measurements: z.array(measurementSchema).min(1).max(5),
		deviationDescription: z.string().trim().max(1000).nullable(),
		correctiveAction: z.string().trim().max(1000).nullable()
	})
	.refine(
		(value) => Boolean(value.deviationDescription) === Boolean(value.correctiveAction),
		'Afvigelse og handling skal enten begge udfyldes eller begge være tomme.'
	);

const omissionPayloadSchema = z.object({
	reasonCode: z.string().trim().min(1).max(80),
	reasonLabel: z.string().trim().min(1).max(160),
	note: z.string().trim().max(500).nullable()
});

const receivingPayloadSchema = z.object({
	observedAt: z.iso.datetime(),
	eventKind: z.literal('receiving_deviation'),
	payload: z.object({
		supplier: z.string().trim().min(1).max(120),
		deliveryReference: z.string().trim().min(1).max(120),
		issueLabel: z.string().trim().min(1).max(160),
		assessment: z.string().trim().min(1).max(1000),
		actionLabel: z.string().trim().min(1).max(160),
		measuredTemperature: z.number().min(-100).max(200).nullable()
	})
});

const pestPayloadSchema = z.object({
	observedAt: z.iso.datetime(),
	eventKind: z.literal('pest_incident'),
	payload: z.object({
		areaLabel: z.string().trim().min(1).max(160),
		incidentLabel: z.string().trim().min(1).max(160),
		observation: z.string().trim().min(1).max(1000),
		productImpact: z.enum(['yes', 'no', 'unknown']),
		actions: z.array(z.string().trim().min(1).max(300)).max(20)
	})
});

const correctionBaseSchema = z.object({
	sourceType: z.enum(['completed_control', 'scheduled_control_omission', 'operational_event']),
	sourceId: z.string().uuid(),
	correctionReason: z.string().trim().min(3).max(500),
	requestId: z.string().uuid(),
	payload: z.string().min(2).max(20_000)
});

function formatLocalDate(value: Date) {
	return value.toISOString().slice(0, 10);
}

function parseLocalDate(localDate: string) {
	if (!datePattern.test(localDate)) return null;
	const date = new Date(`${localDate}T12:00:00Z`);
	return Number.isNaN(date.valueOf()) || formatLocalDate(date) !== localDate ? null : date;
}

function addDays(localDate: string, amount: number) {
	const date = parseLocalDate(localDate);
	if (!date) return localDate;
	date.setUTCDate(date.getUTCDate() + amount);
	return formatLocalDate(date);
}

function localDate(value: string | Date) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(value));
}

function localMidnightUtc(localDateValue: string) {
	const date = parseLocalDate(localDateValue);
	if (!date) throw new Error('Ugyldig lokal dato');
	const utcGuess = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(new Date(utcGuess))
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, Number(part.value)])
	);
	const representedAsUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second
	);
	return new Date(utcGuess - (representedAsUtc - utcGuess)).toISOString();
}

function configuredControlId(occurrenceKey: string, occurrenceDate: string) {
	const suffix = `:${occurrenceDate}`;
	return occurrenceKey.endsWith(suffix) ? occurrenceKey.slice(0, -suffix.length) : occurrenceKey;
}

function controlLabel(controlId?: string) {
	if (!controlId) return 'Kontrol';
	return controlLabels.get(controlId) ?? controlId;
}

function correctionMap(corrections: StoredCorrection[]) {
	const grouped = new Map<string, StoredCorrection[]>();
	for (const correction of corrections) {
		const key = `${correction.source_type}:${correction.source_id}`;
		const versions = grouped.get(key) ?? [];
		versions.push(correction);
		grouped.set(key, versions);
	}
	for (const versions of grouped.values()) versions.sort((a, b) => a.revision - b.revision);
	return grouped;
}

function measurementLabel(fieldId: string) {
	if (fieldId === 'startTemperature') return 'Starttemperatur';
	if (fieldId === 'endTemperature') return 'Sluttemperatur';
	return 'Temperatur';
}

function temperatureText(value: number, unit: string) {
	return `${Number(value).toLocaleString('da-DK', { maximumFractionDigits: 1 })} ${unit === 'celsius' ? '°C' : unit}`;
}

function originalCompletionSummary(completion: StoredCompletion) {
	const measurements = completion.measurements
		.map((measurement) => temperatureText(Number(measurement.value), measurement.unit))
		.join(' → ');
	const product = completion.metadata?.product ? ` · ${completion.metadata.product}` : '';
	const batch = completion.metadata?.batchDate ? ` · batch ${completion.metadata.batchDate}` : '';
	return `${measurements}${product}${batch}`;
}

function configuredDefault(controlId: string, fieldId: string) {
	const control = catalog.controls.find((item) => item.id === controlId);
	const field = control?.fields.find((item) => item.id === fieldId) as
		{ defaultValue?: unknown } | undefined;
	return typeof field?.defaultValue === 'number' ? field.defaultValue : null;
}

function configuredLimit(controlId: string, fieldId: 'toTemperature' | 'maximumDurationMinutes') {
	const control = catalog.controls.find((item) => item.id === controlId) as
		{ limit?: Record<string, unknown> } | undefined;
	const value = control?.limit?.[fieldId];
	return typeof value === 'number' ? value : null;
}

function correctedMeasurementRequiresDeviation(
	controlId: string | undefined,
	measurements: z.infer<typeof measurementSchema>[],
	durationMinutes: number | null
) {
	if (!controlId) return false;
	const temperatureControl = controlDefinitions.find((control) => control.id === controlId);
	if (temperatureControl) return measurements[0]?.value > temperatureControl.limit;
	if (controlId === 'heating-core-temperature') {
		const minimum = configuredDefault(controlId, 'minimumCoreTemperature');
		return minimum !== null && measurements[0]?.value < minimum;
	}
	if (controlId === 'hot-holding-temperature') {
		const minimum = configuredDefault(controlId, 'minimumTemperature');
		return minimum !== null && measurements[0]?.value < minimum;
	}
	if (controlId === 'cooling-time-temperature') {
		const maximumTemperature = configuredLimit(controlId, 'toTemperature');
		const maximumDuration = configuredLimit(controlId, 'maximumDurationMinutes');
		const end = measurements.find((measurement) => measurement.fieldId === 'endTemperature');
		return (
			(maximumTemperature !== null && end !== undefined && end.value > maximumTemperature) ||
			(maximumDuration !== null && durationMinutes !== null && durationMinutes > maximumDuration)
		);
	}
	return false;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const today = localDate(new Date());
	const defaultFrom = addDays(today, -29);
	const requestedFrom = url.searchParams.get('from');
	const requestedTo = url.searchParams.get('to');
	const historyType = parseHistoryType(url.searchParams.get('type'));
	const from = requestedFrom && parseLocalDate(requestedFrom) ? requestedFrom : defaultFrom;
	const to = requestedTo && parseLocalDate(requestedTo) ? requestedTo : today;
	const filterError = from > to ? 'Fra-dato skal ligge før eller på til-dato.' : '';
	const baseResult = {
		from,
		to,
		historyType,
		historyTypeOptions,
		today,
		timeZone,
		locationName: location?.name ?? business.company.name,
		presets: [7, 30, 90].map((days) => ({ days, from: addDays(today, -(days - 1)), to: today }))
	};
	if (filterError) {
		return {
			...baseResult,
			entries: [],
			totalCount: 0,
			truncated: false,
			filterError,
			loadError: '',
			availabilityMessage: ''
		};
	}

	const startsAt = localMidnightUtc(from);
	const endsBefore = localMidnightUtc(addDays(to, 1));
	const completionResult = await locals.supabase
		.from('completed_controls')
		.select(
			'id, observed_at, metadata, measurements(field_id, value, unit, measured_at), deviations(description, corrective_actions(description, status))',
			{ count: 'exact' }
		)
		.eq('location_id', location?.id ?? '')
		.gte('observed_at', startsAt)
		.lt('observed_at', endsBefore)
		.order('observed_at', { ascending: false })
		.range(0, queryLimit - 1);
	const omissionResult = await locals.supabase
		.from('scheduled_control_omissions')
		.select(
			'id, reason_code, reason_label, note, recorded_at, scheduled_controls(local_date, occurrence_key)',
			{ count: 'exact' }
		)
		.eq('location_id', location?.id ?? '')
		.gte('recorded_at', startsAt)
		.lt('recorded_at', endsBefore)
		.order('recorded_at', { ascending: false })
		.range(0, queryLimit - 1);
	let operationalQuery = locals.supabase
		.from('operational_events')
		.select('id, event_type, event_kind, observed_at, payload', { count: 'exact' })
		.eq('location_id', location?.id ?? '')
		.in('event_type', ['receiving', 'pest'])
		.gte('observed_at', startsAt)
		.lt('observed_at', endsBefore)
		.order('observed_at', { ascending: false })
		.range(0, queryLimit - 1);
	if (historyType === 'receiving' || historyType === 'pest') {
		operationalQuery = operationalQuery.eq('event_type', historyType);
	}
	const operationalResult = await operationalQuery;

	const includeControls = historyType === 'all' || historyType === 'control';
	const includeIncidents = historyType !== 'control';
	const storedCompletions = includeControls
		? ((completionResult.data ?? []) as StoredCompletion[])
		: [];
	const storedOmissions = includeControls
		? ((omissionResult.data ?? []) as unknown as StoredOmission[])
		: [];
	const storedIncidents = includeIncidents
		? ((operationalResult.data ?? []) as StoredOperationalEvent[])
		: [];
	const sourceIds = [
		...storedCompletions.map((item) => item.id),
		...storedOmissions.map((item) => item.id),
		...storedIncidents.map((item) => item.id)
	];
	const correctionResult = sourceIds.length
		? await locals.supabase
				.from('evidence_corrections')
				.select('id, source_type, source_id, revision, correction_reason, payload, corrected_at')
				.in('source_id', sourceIds)
				.order('revision', { ascending: true })
		: { data: [] as StoredCorrection[], error: null };
	const corrections = correctionMap((correctionResult.data ?? []) as StoredCorrection[]);

	if (completionResult.error)
		console.error('Kunne ikke hente kontrolhistorik', completionResult.error.code);
	if (omissionResult.error)
		console.error('Kunne ikke hente historik for ingen måling', omissionResult.error.code);
	if (operationalResult.error)
		console.error('Kunne ikke hente operationelle hændelser', operationalResult.error.code);
	if (correctionResult.error)
		console.error('Kunne ikke hente rettelseshistorik', correctionResult.error.code);

	const completions = storedCompletions.map((completion) => {
		const versions = corrections.get(`completed_control:${completion.id}`) ?? [];
		const latest = versions.at(-1);
		const corrected = latest?.payload as
			| {
					observedAt: string;
					metadata: { product?: string; batchDate?: string };
					measurements: Array<{
						fieldId: string;
						value: number;
						unit: string;
						measuredAt: string;
					}>;
					deviationDescription: string | null;
					correctiveAction: string | null;
			  }
			| undefined;
		const metadata = { ...(completion.metadata ?? {}), ...(corrected?.metadata ?? {}) };
		const measurements =
			corrected?.measurements ??
			completion.measurements.map((measurement) => ({
				fieldId: measurement.field_id,
				value: Number(measurement.value),
				unit: measurement.unit,
				measuredAt: measurement.measured_at
			}));
		const originalDeviation = completion.deviations[0];
		const deviationDescription = corrected
			? corrected.deviationDescription
			: (originalDeviation?.description ?? null);
		const correctiveAction = corrected
			? corrected.correctiveAction
			: (originalDeviation?.corrective_actions[0]?.description ?? null);
		const controlId = metadata.configuredControlId;
		const isCooling = controlId === 'cooling-time-temperature';
		const primaryMeasurement =
			measurements.find((measurement) => measurement.fieldId === 'endTemperature') ??
			measurements[0];
		const context = [] as Array<{ label: string; value: string }>;
		if (metadata.product) context.push({ label: 'Ret', value: metadata.product });
		if (metadata.batchDate) context.push({ label: 'Batch', value: metadata.batchDate });
		if (isCooling) {
			for (const measurement of measurements) {
				context.push({
					label: measurementLabel(measurement.fieldId),
					value: temperatureText(measurement.value, measurement.unit)
				});
			}
			if (metadata.durationMinutes !== undefined) {
				context.push({ label: 'Varighed', value: `${metadata.durationMinutes} min.` });
			}
		}
		return {
			id: `completion:${completion.id}`,
			sourceType: 'completed_control' as const,
			sourceId: completion.id,
			kind: 'measurement' as const,
			occurredAt: corrected?.observedAt ?? completion.observed_at,
			localDate: localDate(corrected?.observedAt ?? completion.observed_at),
			controlLabel: controlLabel(controlId),
			status: deviationDescription ? ('deviation' as const) : ('normal' as const),
			value: primaryMeasurement ? Number(primaryMeasurement.value) : null,
			unit: primaryMeasurement?.unit ?? null,
			detail: deviationDescription,
			action: correctiveAction,
			context,
			correctionStatus: latest ? ('corrected' as const) : ('submitted' as const),
			correctionHistory: versions.map((version) => ({
				revision: version.revision,
				reason: version.correction_reason,
				correctedAt: version.corrected_at
			})),
			originalSummary: latest ? originalCompletionSummary(completion) : null,
			edit: {
				kind: 'completed_control' as const,
				observedAt: corrected?.observedAt ?? completion.observed_at,
				product: metadata.product ?? '',
				batchDate: metadata.batchDate ?? '',
				measurements,
				deviationDescription: deviationDescription ?? '',
				correctiveAction: correctiveAction ?? ''
			}
		};
	});

	const omissions = storedOmissions.map((omission) => {
		const versions = corrections.get(`scheduled_control_omission:${omission.id}`) ?? [];
		const latest = versions.at(-1);
		const corrected = latest?.payload as
			{ reasonCode: string; reasonLabel: string; note: string | null } | undefined;
		const scheduled = omission.scheduled_controls;
		const controlId = scheduled
			? configuredControlId(scheduled.occurrence_key, scheduled.local_date)
			: undefined;
		return {
			id: `omission:${omission.id}`,
			sourceType: 'scheduled_control_omission' as const,
			sourceId: omission.id,
			kind: 'omission' as const,
			occurredAt: omission.recorded_at,
			localDate: scheduled?.local_date ?? localDate(omission.recorded_at),
			controlLabel: controlLabel(controlId),
			status: 'no_measurement' as const,
			value: null,
			unit: null,
			detail: corrected?.reasonLabel ?? omission.reason_label,
			action: corrected ? corrected.note : omission.note,
			context: [],
			correctionStatus: latest ? ('corrected' as const) : ('submitted' as const),
			correctionHistory: versions.map((version) => ({
				revision: version.revision,
				reason: version.correction_reason,
				correctedAt: version.corrected_at
			})),
			originalSummary: latest
				? `${omission.reason_label}${omission.note ? ` · ${omission.note}` : ''}`
				: null,
			edit: {
				kind: 'scheduled_control_omission' as const,
				reasonCode: corrected?.reasonCode ?? omission.reason_code,
				reasonLabel: corrected?.reasonLabel ?? omission.reason_label,
				note: (corrected ? corrected.note : omission.note) ?? ''
			}
		};
	});

	const incidents = storedIncidents.map((event) => {
		const versions = corrections.get(`operational_event:${event.id}`) ?? [];
		const latest = versions.at(-1);
		const corrected = latest?.payload as
			| {
					observedAt: string;
					eventKind: StoredOperationalEvent['event_kind'];
					payload: Record<string, unknown>;
			  }
			| undefined;
		const payload = corrected?.payload ?? event.payload;
		const observedAt = corrected?.observedAt ?? event.observed_at;
		const history = versions.map((version) => ({
			revision: version.revision,
			reason: version.correction_reason,
			correctedAt: version.corrected_at
		}));
		if (event.event_kind === 'receiving_deviation') {
			const measuredTemperature =
				typeof payload.measuredTemperature === 'number' ? payload.measuredTemperature : null;
			return {
				id: `event:${event.id}`,
				sourceType: 'operational_event' as const,
				sourceId: event.id,
				kind: 'event' as const,
				occurredAt: observedAt,
				localDate: localDate(observedAt),
				controlLabel: 'Varemodtagelse',
				status: 'deviation' as const,
				value: measuredTemperature,
				unit: measuredTemperature === null ? null : 'celsius',
				detail: `${String(payload.supplier ?? 'Leverandør')} · ${String(payload.issueLabel ?? 'Fejl')} · ${String(payload.assessment ?? '')}`,
				action: String(payload.actionLabel ?? ''),
				context: [{ label: 'Leverance', value: String(payload.deliveryReference ?? '—') }],
				correctionStatus: latest ? ('corrected' as const) : ('submitted' as const),
				correctionHistory: history,
				originalSummary: latest
					? `${String(event.payload.supplier ?? '')} · ${String(event.payload.issueLabel ?? '')}`
					: null,
				edit: {
					kind: 'receiving_deviation' as const,
					observedAt,
					supplier: String(payload.supplier ?? ''),
					deliveryReference: String(payload.deliveryReference ?? ''),
					issueLabel: String(payload.issueLabel ?? ''),
					assessment: String(payload.assessment ?? ''),
					actionLabel: String(payload.actionLabel ?? ''),
					measuredTemperature
				}
			};
		}
		const actions = Array.isArray(payload.actions) ? payload.actions.map(String) : [];
		return {
			id: `event:${event.id}`,
			sourceType: 'operational_event' as const,
			sourceId: event.id,
			kind: 'event' as const,
			occurredAt: observedAt,
			localDate: localDate(observedAt),
			controlLabel: 'Skadedyr',
			status: 'deviation' as const,
			value: null,
			unit: null,
			detail: `${String(payload.incidentLabel ?? 'Fund')} · ${String(payload.areaLabel ?? 'Område')} · ${String(payload.observation ?? '')}`,
			action: actions.join(' · '),
			context: [
				{
					label: 'Fødevarer påvirket',
					value:
						payload.productImpact === 'yes'
							? 'Ja eller muligt'
							: payload.productImpact === 'no'
								? 'Nej'
								: 'Skal vurderes'
				}
			],
			correctionStatus: latest ? ('corrected' as const) : ('submitted' as const),
			correctionHistory: history,
			originalSummary: latest
				? `${String(event.payload.incidentLabel ?? '')} · ${String(event.payload.areaLabel ?? '')}`
				: null,
			edit: {
				kind: 'pest_incident' as const,
				observedAt,
				areaLabel: String(payload.areaLabel ?? ''),
				incidentLabel: String(payload.incidentLabel ?? ''),
				observation: String(payload.observation ?? ''),
				productImpact:
					payload.productImpact === 'yes' || payload.productImpact === 'no'
						? payload.productImpact
						: ('unknown' as const),
				actions
			}
		};
	});

	const entries = [...completions, ...omissions, ...incidents].sort(
		(left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
	);
	const sourceCount =
		(includeControls
			? (completionResult.count ?? completions.length) + (omissionResult.count ?? omissions.length)
			: 0) + (includeIncidents ? (operationalResult.count ?? incidents.length) : 0);
	return {
		...baseResult,
		entries,
		totalCount: entries.length,
		truncated: sourceCount > entries.length,
		filterError: '',
		availabilityMessage: '',
		loadError:
			completionResult.error ||
			omissionResult.error ||
			operationalResult.error ||
			correctionResult.error
				? 'Noget af historikken kunne ikke hentes. Prøv igen.'
				: ''
	};
};

export const actions: Actions = {
	correct: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });
		const parsedBase = correctionBaseSchema.safeParse(
			Object.fromEntries((await request.formData()).entries())
		);
		if (!parsedBase.success) {
			return fail(400, { error: 'Kontrollér rettelsen og skriv en kort begrundelse.' });
		}
		let rawPayload: unknown;
		try {
			rawPayload = JSON.parse(parsedBase.data.payload);
		} catch {
			return fail(400, { error: 'Rettelsen kunne ikke læses.' });
		}
		const payloadSchema =
			parsedBase.data.sourceType === 'completed_control'
				? completionPayloadSchema
				: parsedBase.data.sourceType === 'scheduled_control_omission'
					? omissionPayloadSchema
					: z.union([receivingPayloadSchema, pestPayloadSchema]);
		const parsedPayload = payloadSchema.safeParse(rawPayload);
		if (!parsedPayload.success) {
			return fail(400, { error: 'Et eller flere rettede felter er ugyldige.' });
		}

		let correctionPayload: unknown = parsedPayload.data;
		if (parsedBase.data.sourceType === 'completed_control') {
			const completionPayload = completionPayloadSchema.parse(parsedPayload.data);
			const { data: source, error: sourceError } = await locals.supabase
				.from('completed_controls')
				.select('id, metadata, measurements(field_id, unit)')
				.eq('id', parsedBase.data.sourceId)
				.eq('location_id', location?.id ?? '')
				.single();
			if (sourceError || !source)
				return fail(404, { error: 'Registreringen findes ikke længere.' });
			const expectedMeasurements = source.measurements
				.map((measurement) => `${measurement.field_id}:${measurement.unit}`)
				.sort();
			const correctedMeasurements = completionPayload.measurements
				.map((measurement) => `${measurement.fieldId}:${measurement.unit}`)
				.sort();
			if (JSON.stringify(expectedMeasurements) !== JSON.stringify(correctedMeasurements)) {
				return fail(400, { error: 'Rettelsen må ikke ændre målingernes type eller enhed.' });
			}
			const start = completionPayload.measurements.find(
				(measurement) => measurement.fieldId === 'startTemperature'
			);
			const end = completionPayload.measurements.find(
				(measurement) => measurement.fieldId === 'endTemperature'
			);
			const durationMinutes =
				start && end
					? Math.floor((Date.parse(end.measuredAt) - Date.parse(start.measuredAt)) / 60_000)
					: null;
			if (durationMinutes !== null && durationMinutes <= 0) {
				return fail(400, { error: 'Slutmålingen skal ligge efter startmålingen.' });
			}
			const controlId = (source.metadata as { configuredControlId?: string } | null)
				?.configuredControlId;
			if (
				correctedMeasurementRequiresDeviation(
					controlId,
					completionPayload.measurements,
					durationMinutes
				) &&
				(!completionPayload.deviationDescription || !completionPayload.correctiveAction)
			) {
				return fail(400, {
					error: 'Den rettede måling kræver en beskrevet afvigelse og korrigerende handling.'
				});
			}
			correctionPayload = {
				...completionPayload,
				observedAt: end?.measuredAt ?? completionPayload.observedAt,
				metadata: {
					...completionPayload.metadata,
					...(durationMinutes === null ? {} : { durationMinutes })
				}
			};
		} else if (parsedBase.data.sourceType === 'operational_event') {
			const operationalPayload = z
				.union([receivingPayloadSchema, pestPayloadSchema])
				.parse(parsedPayload.data);
			const { data: source, error: sourceError } = await locals.supabase
				.from('operational_events')
				.select('event_kind')
				.eq('id', parsedBase.data.sourceId)
				.eq('location_id', location?.id ?? '')
				.single();
			if (sourceError || !source)
				return fail(404, { error: 'Registreringen findes ikke længere.' });
			if (source.event_kind !== operationalPayload.eventKind) {
				return fail(400, { error: 'Rettelsen passer ikke til registreringens type.' });
			}
		}
		const { error } = await locals.supabase.rpc('record_evidence_correction', {
			p_location_id: location?.id ?? '',
			p_source_type: parsedBase.data.sourceType,
			p_source_id: parsedBase.data.sourceId,
			p_payload: correctionPayload,
			p_correction_reason: parsedBase.data.correctionReason,
			p_request_id: parsedBase.data.requestId
		});
		if (error) {
			console.error('Kunne ikke gemme rettelse', error.code);
			return fail(500, { error: 'Rettelsen kunne ikke gemmes. Dine felter er bevaret.' });
		}
		return { success: true };
	}
};
