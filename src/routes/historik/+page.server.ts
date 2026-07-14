import catalog from '../../../config/egenkontrol.defaults.json';
import business from '../../../config/virksomhed.json';
import {
	historyTypeOptions,
	parseHistoryType,
	unavailableHistoryMessage
} from '$lib/domain/control-history';
import { buildTemperatureControls } from '$lib/domain/today-controls';
import type { PageServerLoad } from './$types';

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
const controlLabels = new Map(
	controlDefinitions.map((control) => [control.id, control.assetLabel] as const)
);

type StoredCompletion = {
	id: string;
	observed_at: string;
	status: 'submitted' | 'corrected';
	metadata: { configuredControlId?: string } | null;
	measurements: Array<{ value: number; unit: string }>;
	deviations: Array<{
		description: string;
		corrective_actions: Array<{ description: string; status: string }>;
	}>;
};

type StoredOmission = {
	id: string;
	reason_label: string;
	note: string | null;
	recorded_at: string;
	scheduled_controls: {
		local_date: string;
		occurrence_key: string;
	} | null;
};

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
	const offset = representedAsUtc - utcGuess;
	return new Date(utcGuess - offset).toISOString();
}

function configuredControlId(occurrenceKey: string, occurrenceDate: string) {
	const suffix = `:${occurrenceDate}`;
	return occurrenceKey.endsWith(suffix) ? occurrenceKey.slice(0, -suffix.length) : occurrenceKey;
}

function controlLabel(controlId?: string) {
	if (!controlId) return 'Kontrol';
	return controlLabels.get(controlId) ?? controlId;
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

	if (filterError) {
		return {
			from,
			to,
			historyType,
			historyTypeOptions,
			today,
			timeZone,
			locationName: location?.name ?? business.company.name,
			entries: [],
			totalCount: 0,
			truncated: false,
			filterError,
			loadError: '',
			availabilityMessage: unavailableHistoryMessage(historyType),
			presets: [7, 30, 90].map((days) => ({ days, from: addDays(today, -(days - 1)), to: today }))
		};
	}

	if (historyType === 'receiving' || historyType === 'pest') {
		return {
			from,
			to,
			historyType,
			historyTypeOptions,
			today,
			timeZone,
			locationName: location?.name ?? business.company.name,
			entries: [],
			totalCount: 0,
			truncated: false,
			filterError: '',
			loadError: '',
			availabilityMessage: unavailableHistoryMessage(historyType),
			presets: [7, 30, 90].map((days) => ({ days, from: addDays(today, -(days - 1)), to: today }))
		};
	}

	const startsAt = localMidnightUtc(from);
	const endsBefore = localMidnightUtc(addDays(to, 1));
	const completionResult = await locals.supabase
		.from('completed_controls')
		.select(
			'id, observed_at, status, metadata, measurements(value, unit), deviations(description, corrective_actions(description, status))',
			{ count: 'exact' }
		)
		.eq('location_id', location?.id ?? '')
		.gte('observed_at', startsAt)
		.lt('observed_at', endsBefore)
		.order('observed_at', { ascending: false })
		.range(0, queryLimit - 1);
	const omissionResult = await locals.supabase
		.from('scheduled_control_omissions')
		.select('id, reason_label, note, recorded_at, scheduled_controls(local_date, occurrence_key)', {
			count: 'exact'
		})
		.eq('location_id', location?.id ?? '')
		.gte('recorded_at', startsAt)
		.lt('recorded_at', endsBefore)
		.order('recorded_at', { ascending: false })
		.range(0, queryLimit - 1);

	if (completionResult.error)
		console.error('Kunne ikke hente kontrolhistorik', completionResult.error.code);
	if (omissionResult.error)
		console.error('Kunne ikke hente historik for ingen måling', omissionResult.error.code);

	const completions = ((completionResult.data ?? []) as StoredCompletion[]).map((completion) => {
		const measurement = completion.measurements[0];
		const deviation = completion.deviations[0];
		return {
			id: `completion:${completion.id}`,
			kind: 'measurement' as const,
			occurredAt: completion.observed_at,
			localDate: localDate(completion.observed_at),
			controlLabel: controlLabel(completion.metadata?.configuredControlId),
			status: deviation ? ('deviation' as const) : ('normal' as const),
			value: measurement ? Number(measurement.value) : null,
			unit: measurement?.unit ?? null,
			detail: deviation?.description ?? null,
			action: deviation?.corrective_actions[0]?.description ?? null,
			correctionStatus: completion.status
		};
	});
	const omissions = ((omissionResult.data ?? []) as StoredOmission[]).map((omission) => {
		const scheduled = omission.scheduled_controls;
		const controlId = scheduled
			? configuredControlId(scheduled.occurrence_key, scheduled.local_date)
			: undefined;
		return {
			id: `omission:${omission.id}`,
			kind: 'omission' as const,
			occurredAt: omission.recorded_at,
			localDate: scheduled?.local_date ?? localDate(omission.recorded_at),
			controlLabel: controlLabel(controlId),
			status: 'no_measurement' as const,
			value: null,
			unit: null,
			detail: omission.reason_label,
			action: omission.note,
			correctionStatus: 'submitted' as const
		};
	});
	const entries = [...completions, ...omissions].sort(
		(left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
	);
	const totalCount =
		(completionResult.count ?? completions.length) + (omissionResult.count ?? omissions.length);

	return {
		from,
		to,
		historyType,
		historyTypeOptions,
		today,
		timeZone,
		locationName: location?.name ?? business.company.name,
		entries,
		totalCount,
		truncated: totalCount > entries.length,
		filterError: '',
		availabilityMessage: '',
		loadError:
			completionResult.error || omissionResult.error
				? 'Noget af historikken kunne ikke hentes. Prøv igen.'
				: '',
		presets: [7, 30, 90].map((days) => ({ days, from: addDays(today, -(days - 1)), to: today }))
	};
};
