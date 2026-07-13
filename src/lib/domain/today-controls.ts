export type AssetType = 'refrigerator' | 'freezer';

export type Weekday =
	'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type ConfiguredAsset = {
	id: string;
	locationId: string;
	label: string;
	type: string;
	active: boolean;
	temperatureProfileId?: string;
};

export type TemperatureProfile = {
	id: string;
	label: string;
	status: string;
	acceptance: {
		operator: string;
		value: number;
		unit: string;
	};
};

export type TemperatureControlDefinition = {
	id: string;
	assetId: string;
	assetLabel: string;
	assetType: AssetType;
	profileId: string;
	profileLabel: string;
	profileStatus: string;
	limit: number;
	unit: 'celsius';
	dueTime: string;
	frequency:
		| { kind: 'daily' }
		| { kind: 'weekly'; weekday: Weekday }
		| { kind: 'selected_weekdays'; weekdays: Weekday[] };
};

export type ScheduledTemperatureControl = TemperatureControlDefinition & {
	localDate: string;
	occurrenceKey: string;
};

export type TemperatureScheduleDay = {
	localDate: string;
	weekday: Weekday;
	isOperatingDay: boolean;
	controls: ScheduledTemperatureControl[];
};

export type TemperatureWeekSchedule = {
	startsOn: string;
	endsOn: string;
	days: TemperatureScheduleDay[];
};

export type ScheduleMaterializationOccurrence = {
	controlId: string;
	occurrenceKey: string;
	localDate: string;
	dueTime: string;
};

export type MeasurementAssessment =
	{ ok: true; requiresDeviation: false } | { ok: false; requiresDeviation: true; message: string };

type ControlOverride = {
	controlId: string;
	locationId: string;
	enabled: boolean;
	controlFrequency?: {
		kind: string;
		localTime?: string;
		weekday?: string;
		weekdays?: string[];
	};
};

const weekdays: Weekday[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
];

function isWeekday(value: string): value is Weekday {
	return weekdays.includes(value as Weekday);
}

function normalizeFrequency(frequency: ControlOverride['controlFrequency']) {
	if (!frequency || frequency.kind === 'daily') return { kind: 'daily' as const };
	if (frequency.kind === 'weekly' && frequency.weekday && isWeekday(frequency.weekday)) {
		return { kind: 'weekly' as const, weekday: frequency.weekday };
	}
	if (
		frequency.kind === 'selected_weekdays' &&
		frequency.weekdays?.length &&
		frequency.weekdays.every(isWeekday)
	) {
		return { kind: 'selected_weekdays' as const, weekdays: frequency.weekdays };
	}
	return null;
}

export function buildTemperatureControls(
	assets: ConfiguredAsset[],
	profiles: TemperatureProfile[],
	overrides: ControlOverride[],
	locationId: string
): TemperatureControlDefinition[] {
	const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
	const overridesByControlId = new Map(
		overrides
			.filter((override) => override.enabled && override.locationId === locationId)
			.map((override) => [override.controlId, override])
	);

	return assets.flatMap((asset) => {
		if (
			!asset.active ||
			asset.locationId !== locationId ||
			(asset.type !== 'refrigerator' && asset.type !== 'freezer')
		)
			return [];
		if (!asset.temperatureProfileId) return [];

		const profile = profilesById.get(asset.temperatureProfileId);
		if (!profile || profile.acceptance.operator !== 'lte') return [];

		const controlId =
			asset.type === 'freezer' ? 'freezer-temperature' : 'refrigeration-temperature';
		const override = overridesByControlId.get(controlId);
		if (!override) return [];
		const frequency = normalizeFrequency(override.controlFrequency);
		if (!frequency) return [];

		return [
			{
				id: `${controlId}:${asset.id}`,
				assetId: asset.id,
				assetLabel: asset.label,
				assetType: asset.type,
				profileId: profile.id,
				profileLabel: profile.label,
				profileStatus: profile.status,
				limit: profile.acceptance.value,
				unit: 'celsius' as const,
				dueTime: override.controlFrequency?.localTime ?? '09:00',
				frequency
			}
		];
	});
}

function parseLocalDate(localDate: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
	if (!match) throw new Error(`Ugyldig lokal dato: ${localDate}`);
	return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

function formatLocalDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addDays(localDate: string, amount: number): string {
	const date = parseLocalDate(localDate);
	date.setUTCDate(date.getUTCDate() + amount);
	return formatLocalDate(date);
}

function weekdayFor(localDate: string): Weekday {
	const day = parseLocalDate(localDate).getUTCDay();
	return weekdays[(day + 6) % 7];
}

function isScheduledOn(
	control: TemperatureControlDefinition,
	weekday: Weekday,
	isOperatingDay: boolean
): boolean {
	if (!isOperatingDay) return false;
	if (control.frequency.kind === 'daily') return true;
	if (control.frequency.kind === 'weekly') return control.frequency.weekday === weekday;
	return control.frequency.weekdays.includes(weekday);
}

export function buildTemperatureWeekSchedule(
	controls: TemperatureControlDefinition[],
	operatingWeekdays: Weekday[],
	referenceLocalDate: string
): TemperatureWeekSchedule {
	const referenceWeekdayIndex = weekdays.indexOf(weekdayFor(referenceLocalDate));
	const startsOn = addDays(referenceLocalDate, -referenceWeekdayIndex);
	const operatingDays = new Set(operatingWeekdays);
	const days = weekdays.map((weekday, index): TemperatureScheduleDay => {
		const localDate = addDays(startsOn, index);
		const isOperatingDay = operatingDays.has(weekday);
		return {
			localDate,
			weekday,
			isOperatingDay,
			controls: controls
				.filter((control) => isScheduledOn(control, weekday, isOperatingDay))
				.map((control) => ({
					...control,
					localDate,
					occurrenceKey: `${control.id}:${localDate}`
				}))
		};
	});

	return { startsOn, endsOn: addDays(startsOn, 6), days };
}

export function buildScheduleMaterializationOccurrences(
	schedule: TemperatureWeekSchedule
): ScheduleMaterializationOccurrence[] {
	return schedule.days.flatMap((day) =>
		day.controls.map((control) => ({
			controlId: control.id,
			occurrenceKey: control.occurrenceKey,
			localDate: control.localDate,
			dueTime: control.dueTime
		}))
	);
}

export function assessMeasurement(
	control: TemperatureControlDefinition,
	value: number
): MeasurementAssessment {
	if (value <= control.limit) return { ok: true, requiresDeviation: false };

	return {
		ok: false,
		requiresDeviation: true,
		message: `Målingen er over startprofilens grænse på ${formatTemperature(control.limit)}.`
	};
}

export function formatTemperature(value: number): string {
	return `${value.toLocaleString('da-DK', { maximumFractionDigits: 1 })} °C`;
}
