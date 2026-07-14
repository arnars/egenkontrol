import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import catalog from '../../config/egenkontrol.defaults.json';
import business from '../../config/virksomhed.json';
import {
	buildTemperatureControls,
	buildTemperatureWeekSchedule,
	buildScheduleMaterializationOccurrences,
	type Weekday
} from '$lib/domain/today-controls';
import {
	CompletionValidationError,
	prepareTemperatureCompletion
} from '$lib/server/controls/temperature-completion';
import {
	OmissionValidationError,
	prepareOmissionReason,
	prepareTemperatureOmission
} from '$lib/server/controls/temperature-omission';
import type { Actions, PageServerLoad } from './$types';

const location = business.locations[0];
type ConfiguredProcessControl = {
	id: string;
	title: string;
	description: string;
	fields: Array<{ id: string; defaultValue?: unknown }>;
	limit?: {
		fromTemperature: number;
		toTemperature: number;
		maximumDurationMinutes: number;
	};
};
const configuredControls = catalog.controls as ConfiguredProcessControl[];

function configuredControl(id: string) {
	const control = configuredControls.find((item) => item.id === id);
	if (!control) throw new Error(`Kontroldefinitionen ${id} mangler i konfigurationen.`);
	return control;
}

function configuredTemperature(control: ConfiguredProcessControl, fieldId: string) {
	const value = control.fields.find((field) => field.id === fieldId)?.defaultValue;
	if (typeof value !== 'number') {
		throw new Error(`Temperaturgrænsen ${fieldId} mangler på ${control.id}.`);
	}
	return value;
}

const controlDefinitions = buildTemperatureControls(
	business.assets,
	catalog.productTemperatureProfiles,
	business.controlOverrides,
	location?.id ?? ''
);
const temperatureDefinitionIds = [
	...new Set(controlDefinitions.map((control) => control.id.split(':')[0]))
];

type StoredCompletion = {
	id: string;
	observed_at: string;
	scheduled_control_id: string | null;
	metadata: {
		configuredControlId?: string;
		product?: string;
		batchDate?: string;
		durationMinutes?: number;
	} | null;
	measurements: Array<{ field_id: string; value: number; measured_at: string }>;
	deviations: Array<{
		id: string;
		corrective_actions: Array<{ description: string; status: string }>;
	}>;
};

type StoredOmission = {
	id: string;
	scheduled_control_id: string;
	reason_code: string;
	reason_label: string;
	note: string | null;
	recorded_at: string;
};

type MaterializedScheduleRow = {
	scheduled_control_id: string;
	occurrence_key: string;
	scheduled_status: 'upcoming' | 'due' | 'completed' | 'missed' | 'cancelled';
};

type MaterializedProcessRow = MaterializedScheduleRow & { definition_id: string };

type StoredOperationalEvent = {
	id: string;
	scheduled_control_id: string | null;
	event_kind: string;
	observed_at: string;
	payload: {
		product?: string;
		batchDate?: string;
		startTemperature?: number;
	};
};

const processMeasurementSchema = z.object({
	scheduledControlId: z.string().uuid(),
	definitionId: z.enum(['heating-core-temperature', 'hot-holding-temperature']),
	product: z.string().trim().min(1).max(120),
	value: z.coerce.number().min(-100).max(200),
	deviationDescription: z.string().trim().max(1000).optional(),
	correctiveAction: z.string().trim().max(1000).optional(),
	requestId: z.string().uuid()
});

const coolingStartSchema = z.object({
	scheduledControlId: z.string().uuid(),
	product: z.string().trim().min(1).max(120),
	batchDate: z.iso.date(),
	startTemperature: z.coerce.number().min(-100).max(200),
	startedAt: z.iso.datetime(),
	requestId: z.string().uuid()
});

const coolingCompletionSchema = z.object({
	scheduledControlId: z.string().uuid(),
	endTemperature: z.coerce.number().min(-100).max(200),
	completedAt: z.iso.datetime(),
	deviationDescription: z.string().trim().max(1000).optional(),
	correctiveAction: z.string().trim().max(1000).optional(),
	requestId: z.string().uuid()
});

function formObject(formData: FormData) {
	return Object.fromEntries(formData.entries());
}

function localDate(value: string | Date) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: location?.timeZone ?? 'Europe/Copenhagen',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(value));
}

function currentSchedule(now = new Date()) {
	const today = localDate(now);
	const schedule = buildTemperatureWeekSchedule(
		controlDefinitions,
		(location?.operatingWeekdays ?? []) as Weekday[],
		today
	);
	const todaySchedule = schedule.days.find((day) => day.localDate === today);

	return { today, schedule, todaySchedule };
}

export const load: PageServerLoad = async ({ locals }) => {
	const { today, schedule: projectedSchedule } = currentSchedule();
	const occurrences = buildScheduleMaterializationOccurrences(projectedSchedule);
	const materialization = occurrences.length
		? await locals.supabase.rpc('materialize_temperature_schedule', {
				p_location_id: location?.id ?? '',
				p_occurrences: occurrences
			})
		: { data: [] as MaterializedScheduleRow[], error: null };

	if (materialization.error) {
		console.error('Kunne ikke materialisere ugeplanen', materialization.error.code);
	}
	const processMaterialization = await locals.supabase.rpc('materialize_weekly_process_controls', {
		p_location_id: location?.id ?? '',
		p_week_starts_on: projectedSchedule.startsOn
	});
	if (processMaterialization.error) {
		console.error(
			'Kunne ikke materialisere ugens proceskontroller',
			processMaterialization.error.code
		);
	}

	const materializedRows = (materialization.data ?? []) as MaterializedScheduleRow[];
	const scheduledByOccurrence = new Map(
		materializedRows.map((row) => [row.occurrence_key, row] as const)
	);
	const schedulePersistenceError =
		Boolean(materialization.error) ||
		occurrences.some((occurrence) => !scheduledByOccurrence.has(occurrence.occurrenceKey));
	const processPersistenceError =
		Boolean(processMaterialization.error) || (processMaterialization.data ?? []).length !== 3;
	const schedule = {
		...projectedSchedule,
		days: projectedSchedule.days.map((day) => ({
			...day,
			controls: day.controls.map((control) => {
				const stored = scheduledByOccurrence.get(control.occurrenceKey);
				return {
					...control,
					scheduledControlId: stored?.scheduled_control_id ?? null,
					scheduledStatus: stored?.scheduled_status ?? null
				};
			})
		}))
	};
	const todaySchedule = schedule.days.find((day) => day.localDate === today);
	const occurrenceByScheduledId = new Map(
		materializedRows.map((row) => [row.scheduled_control_id, row.occurrence_key] as const)
	);
	const { data, error } = await locals.supabase
		.from('completed_controls')
		.select(
			'id, observed_at, scheduled_control_id, metadata, measurements(field_id, value, measured_at), deviations(id, corrective_actions(description, status))'
		)
		.eq('location_id', location?.id ?? '')
		.order('observed_at', { ascending: false })
		.limit(100);

	if (error) console.error('Kunne ikke hente dagens kontroller', error.code);

	const { data: omissionData, error: omissionError } = await locals.supabase
		.from('scheduled_control_omissions')
		.select('id, scheduled_control_id, reason_code, reason_label, note, recorded_at')
		.eq('location_id', location?.id ?? '')
		.order('recorded_at', { ascending: false })
		.limit(100);

	if (omissionError) console.error('Kunne ikke hente kontroller uden måling', omissionError.code);

	const processRows = (processMaterialization.data ?? []) as MaterializedProcessRow[];
	const processScheduledIds = processRows.map((row) => row.scheduled_control_id);
	const operationalResult = processScheduledIds.length
		? await locals.supabase
				.from('operational_events')
				.select('id, scheduled_control_id, event_kind, observed_at, payload')
				.in('scheduled_control_id', processScheduledIds)
				.order('observed_at', { ascending: false })
		: { data: [] as StoredOperationalEvent[], error: null };
	if (operationalResult.error) {
		console.error('Kunne ikke hente proceshændelser', operationalResult.error.code);
	}

	const weeklyCompletions = Object.fromEntries(
		((data ?? []) as StoredCompletion[]).flatMap((completion) => {
			const controlId = completion.metadata?.configuredControlId;
			const value = completion.measurements[0]?.value;
			if (!controlId || value === undefined) return [];
			const completionLocalDate = localDate(completion.observed_at);
			const occurrenceKey = completion.scheduled_control_id
				? occurrenceByScheduledId.get(completion.scheduled_control_id)
				: `${controlId}:${completionLocalDate}`;
			if (!occurrenceKey) return [];

			return [
				[
					occurrenceKey,
					{
						id: completion.id,
						value: Number(value),
						deviation: completion.deviations.length > 0,
						correctiveAction: completion.deviations[0]?.corrective_actions[0]?.description ?? null,
						completedAt: completion.observed_at
					}
				] as const
			];
		})
	);
	const completions = Object.fromEntries(
		(todaySchedule?.controls ?? []).flatMap((control) => {
			const completion = weeklyCompletions[control.occurrenceKey];
			return completion ? [[control.id, completion]] : [];
		})
	);
	const weeklyOmissions = Object.fromEntries(
		((omissionData ?? []) as StoredOmission[]).flatMap((omission) => {
			const occurrenceKey = occurrenceByScheduledId.get(omission.scheduled_control_id);
			if (!occurrenceKey) return [];

			return [
				[
					occurrenceKey,
					{
						id: omission.id,
						reasonCode: omission.reason_code,
						reasonLabel: omission.reason_label,
						note: omission.note,
						recordedAt: omission.recorded_at
					}
				] as const
			];
		})
	);
	const omissions = Object.fromEntries(
		(todaySchedule?.controls ?? []).flatMap((control) => {
			const omission = weeklyOmissions[control.occurrenceKey];
			return omission ? [[control.id, omission]] : [];
		})
	);
	const heating = configuredControl('heating-core-temperature');
	const cooling = configuredControl('cooling-time-temperature');
	const hotHolding = configuredControl('hot-holding-temperature');
	if (!cooling.limit) throw new Error('Nedkølingskurven mangler i konfigurationen.');

	const processRowByDefinition = new Map(
		processRows.map((row) => [row.definition_id, row] as const)
	);
	const completionBySchedule = new Map(
		((data ?? []) as StoredCompletion[])
			.filter((completion) => completion.scheduled_control_id)
			.map((completion) => [completion.scheduled_control_id as string, completion] as const)
	);
	const omissionBySchedule = new Map(
		((omissionData ?? []) as StoredOmission[]).map(
			(omission) => [omission.scheduled_control_id, omission] as const
		)
	);
	const coolingStartBySchedule = new Map(
		((operationalResult.data ?? []) as StoredOperationalEvent[])
			.filter((event) => event.scheduled_control_id && event.event_kind === 'cooling_started')
			.map((event) => [event.scheduled_control_id as string, event] as const)
	);

	function processState(definitionId: string) {
		const scheduled = processRowByDefinition.get(definitionId);
		if (!scheduled) return { scheduledControlId: null, outcome: null };
		const completion = completionBySchedule.get(scheduled.scheduled_control_id);
		if (completion) {
			const values = new Map(
				completion.measurements.map((measurement) => [
					measurement.field_id,
					Number(measurement.value)
				])
			);
			const product = completion.metadata?.product ?? 'Registreret proces';
			const batch = completion.metadata?.batchDate
				? ` · batch ${completion.metadata.batchDate}`
				: '';
			const summary =
				definitionId === 'cooling-time-temperature'
					? `${product}${batch} · ${values.get('startTemperature') ?? '—'} °C → ${values.get('endTemperature') ?? '—'} °C`
					: `${product} · ${completion.measurements[0]?.value ?? '—'} °C`;
			return {
				scheduledControlId: scheduled.scheduled_control_id,
				outcome: {
					status: 'completed' as const,
					summary,
					recordedAt: completion.observed_at
				}
			};
		}
		const omission = omissionBySchedule.get(scheduled.scheduled_control_id);
		if (omission) {
			return {
				scheduledControlId: scheduled.scheduled_control_id,
				outcome: {
					status: 'not_relevant' as const,
					summary: omission.reason_label,
					recordedAt: omission.recorded_at
				}
			};
		}
		const coolingStart = coolingStartBySchedule.get(scheduled.scheduled_control_id);
		if (coolingStart) {
			return {
				scheduledControlId: scheduled.scheduled_control_id,
				outcome: {
					status: 'in_progress' as const,
					summary: `${coolingStart.payload.product ?? 'Nedkøling'} · batch ${coolingStart.payload.batchDate ?? '—'} · startet ved ${coolingStart.payload.startTemperature ?? '—'} °C`,
					recordedAt: coolingStart.observed_at,
					cooling: {
						product: coolingStart.payload.product ?? '',
						batchDate: coolingStart.payload.batchDate ?? today,
						startTemperature: Number(coolingStart.payload.startTemperature),
						startedAt: coolingStart.observed_at
					}
				}
			};
		}
		return { scheduledControlId: scheduled.scheduled_control_id, outcome: null };
	}

	const heatingState = processState(heating.id);
	const coolingState = processState(cooling.id);
	const hotHoldingState = processState(hotHolding.id);

	return {
		companyName: business.company.name,
		locationName: location?.name ?? business.company.name,
		configurationStatus: business.status,
		schedulePersistenceError,
		processPersistenceError,
		today,
		todaySchedule,
		schedule,
		controls: todaySchedule?.controls ?? [],
		completions,
		omissions,
		weeklyCompletions,
		weeklyOmissions,
		noMeasurementReasons: business.noMeasurementReasons,
		processControls: [
			{
				definitionId: heating.id,
				...heatingState,
				kind: 'heating' as const,
				title: heating.title,
				description: 'Dokumentér én relevant opvarmning i denne uge',
				minimumTemperature: configuredTemperature(heating, 'minimumCoreTemperature')
			},
			{
				definitionId: cooling.id,
				...coolingState,
				kind: 'cooling' as const,
				title: cooling.title,
				description: 'Dokumentér start og slut for én nedkøling i denne uge',
				fromTemperature: cooling.limit.fromTemperature,
				toTemperature: cooling.limit.toTemperature,
				maximumDurationMinutes: cooling.limit.maximumDurationMinutes
			},
			{
				definitionId: hotHolding.id,
				...hotHoldingState,
				kind: 'hot_holding' as const,
				title: hotHolding.title,
				description: 'Dokumentér én relevant varmholdelse i denne uge',
				minimumTemperature: configuredTemperature(hotHolding, 'minimumTemperature')
			}
		],
		eventControls: [
			{
				definitionId: 'receiving-check',
				title: 'Varemodtagelse',
				description: 'Kontrollér leveringen og registrér fejl',
				eventType: 'delivery'
			}
		]
	};
};

export const actions: Actions = {
	complete: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });

		const formData = await request.formData();
		const { todaySchedule } = currentSchedule();
		const control = todaySchedule?.controls.find((item) => item.id === formData.get('controlId'));
		if (!control) return fail(400, { error: 'Kontrollen findes ikke længere.' });

		try {
			const rawValue = String(formData.get('value') ?? '')
				.replace(',', '.')
				.trim();
			const command = prepareTemperatureCompletion({
				command: {
					scheduledControlId: formData.get('scheduledControlId'),
					controlId: formData.get('controlId'),
					value: rawValue,
					deviation: formData.get('deviation') === 'on',
					deviationDescription: formData.get('deviationDescription') || undefined,
					correctiveActionDescription: formData.get('correctiveActionDescription') || undefined,
					observedAt: new Date(),
					idempotencyKey: formData.get('idempotencyKey'),
					actorId: claims.sub
				},
				control,
				companyId: business.company.id,
				locationId: location?.id ?? '',
				controlDefinitionRevision: 1
			});

			const { error } = await locals.supabase.rpc('record_temperature_completion_with_action', {
				p_scheduled_control_id: command.scheduledControlId,
				p_control_id: command.controlId,
				p_location_id: command.locationId,
				p_value: command.value,
				p_deviation: command.deviation,
				p_deviation_description: command.deviationDescription ?? null,
				p_corrective_action_description: command.correctiveActionDescription ?? null,
				p_observed_at: command.observedAt.toISOString(),
				p_idempotency_key: command.idempotencyKey
			});

			if (error) {
				console.error('Kunne ikke gemme temperaturkontrol', error.code);
				return fail(500, { error: 'Kontrollen kunne ikke gemmes. Dine felter er bevaret.' });
			}

			return { success: true };
		} catch (error) {
			if (error instanceof CompletionValidationError) return fail(400, { error: error.message });
			return fail(400, { error: 'Kontrollér målingen og prøv igen.' });
		}
	},
	omit: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });

		const formData = await request.formData();
		const { todaySchedule } = currentSchedule();
		const control = todaySchedule?.controls.find((item) => item.id === formData.get('controlId'));
		if (!control) return fail(400, { error: 'Kontrollen findes ikke længere.' });

		try {
			const command = prepareTemperatureOmission({
				command: {
					scheduledControlId: formData.get('scheduledControlId'),
					controlId: formData.get('controlId'),
					reasonCode: formData.get('reasonCode'),
					note: formData.get('note') || undefined
				},
				expectedControlId: control.id,
				reasons: business.noMeasurementReasons
			});

			const { error } = await locals.supabase.rpc('record_temperature_omission', {
				p_scheduled_control_id: command.scheduledControlId,
				p_location_id: location?.id ?? '',
				p_reason_code: command.reasonCode,
				p_reason_label: command.reasonLabel,
				p_note: command.note ?? null
			});

			if (error) {
				console.error('Kunne ikke gemme ingen måling', error.code);
				return fail(500, { error: 'Valget kunne ikke gemmes. Dine felter er bevaret.' });
			}

			return { success: true };
		} catch (error) {
			if (error instanceof OmissionValidationError) return fail(400, { error: error.message });
			return fail(400, { error: 'Kontrollér grunden og prøv igen.' });
		}
	},
	omitDay: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });

		const formData = await request.formData();
		const { today, todaySchedule } = currentSchedule();
		if (!todaySchedule?.isOperatingDay) {
			return fail(400, { error: 'Der er ingen planlagte temperaturkontroller i dag.' });
		}

		try {
			const reason = prepareOmissionReason({
				command: {
					reasonCode: formData.get('reasonCode'),
					note: formData.get('note') || undefined
				},
				reasons: business.noMeasurementReasons
			});

			const { data: pendingRows, error: pendingError } = await locals.supabase
				.from('scheduled_controls')
				.select('id')
				.eq('location_id', location?.id ?? '')
				.eq('local_date', today)
				.in('control_definition_id', temperatureDefinitionIds)
				.in('status', ['upcoming', 'due', 'missed']);

			if (pendingError) {
				console.error('Kunne ikke hente dagens resterende kontroller', pendingError.code);
				return fail(500, { error: 'Dagens kontroller kunne ikke hentes. Prøv igen.' });
			}

			const scheduledControlIds = (pendingRows ?? []).map((row) => row.id);
			if (scheduledControlIds.length === 0) {
				return fail(409, { error: 'Der er ingen resterende temperaturkontroller i dag.' });
			}

			const { error } = await locals.supabase.rpc('record_temperature_day_omissions', {
				p_scheduled_control_ids: scheduledControlIds,
				p_location_id: location?.id ?? '',
				p_local_date: today,
				p_reason_code: reason.reasonCode,
				p_reason_label: reason.reasonLabel,
				p_note: reason.note ?? null
			});

			if (error) {
				console.error('Kunne ikke gemme ingen målinger i dag', error.code);
				return fail(500, {
					error: 'Dagens kontroller kunne ikke afsluttes samlet. Ingen blev ændret.'
				});
			}

			return { success: true };
		} catch (error) {
			if (error instanceof OmissionValidationError) return fail(400, { error: error.message });
			return fail(400, { error: 'Kontrollér grunden og prøv igen.' });
		}
	},
	completeProcess: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });
		const parsed = processMeasurementSchema.safeParse(formObject(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'Kontrollér ret og temperatur.' });

		const { error } = await locals.supabase.rpc('record_weekly_process_completion', {
			p_scheduled_control_id: parsed.data.scheduledControlId,
			p_location_id: location?.id ?? '',
			p_product: parsed.data.product,
			p_value: parsed.data.value,
			p_observed_at: new Date().toISOString(),
			p_deviation_description: parsed.data.deviationDescription || null,
			p_corrective_action: parsed.data.correctiveAction || null,
			p_request_id: parsed.data.requestId
		});
		if (error) {
			console.error('Kunne ikke gemme ugentlig proceskontrol', error.code);
			return fail(500, { error: 'Proceskontrollen kunne ikke gemmes. Dine felter er bevaret.' });
		}
		return { success: true };
	},
	startCooling: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });
		const parsed = coolingStartSchema.safeParse(formObject(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'Kontrollér ret, batchdato og startmåling.' });

		const { error } = await locals.supabase.rpc('start_weekly_cooling_control', {
			p_scheduled_control_id: parsed.data.scheduledControlId,
			p_location_id: location?.id ?? '',
			p_product: parsed.data.product,
			p_batch_date: parsed.data.batchDate,
			p_start_temperature: parsed.data.startTemperature,
			p_started_at: parsed.data.startedAt,
			p_request_id: parsed.data.requestId
		});
		if (error) {
			console.error('Kunne ikke starte nedkølingskontrol', error.code);
			return fail(500, { error: 'Nedkølingen kunne ikke startes. Dine felter er bevaret.' });
		}
		return { success: true };
	},
	completeCooling: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });
		const parsed = coolingCompletionSchema.safeParse(formObject(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'Kontrollér sluttemperatur og sluttidspunkt.' });

		const { error } = await locals.supabase.rpc('complete_weekly_cooling_control', {
			p_scheduled_control_id: parsed.data.scheduledControlId,
			p_location_id: location?.id ?? '',
			p_end_temperature: parsed.data.endTemperature,
			p_completed_at: parsed.data.completedAt,
			p_deviation_description: parsed.data.deviationDescription || null,
			p_corrective_action: parsed.data.correctiveAction || null,
			p_request_id: parsed.data.requestId
		});
		if (error) {
			console.error('Kunne ikke afslutte nedkølingskontrol', error.code);
			return fail(500, { error: 'Nedkølingen kunne ikke afsluttes. Dine felter er bevaret.' });
		}
		return { success: true };
	},
	omitProcess: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });
		const scheduledControlId = String((await request.formData()).get('scheduledControlId') ?? '');
		if (!z.string().uuid().safeParse(scheduledControlId).success) {
			return fail(400, { error: 'Ugens proceskontrol findes ikke.' });
		}
		const { error } = await locals.supabase.rpc('record_weekly_process_not_relevant', {
			p_scheduled_control_id: scheduledControlId,
			p_location_id: location?.id ?? ''
		});
		if (error) {
			console.error('Kunne ikke markere proceskontrol som ikke relevant', error.code);
			return fail(500, { error: 'Valget kunne ikke gemmes. Prøv igen.' });
		}
		return { success: true };
	}
};
