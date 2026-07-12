export type AssetType = 'refrigerator' | 'freezer';

export type ConfiguredAsset = {
	id: string;
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

export type ScheduledTemperatureControl = {
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
};

export type MeasurementAssessment =
	{ ok: true; requiresDeviation: false } | { ok: false; requiresDeviation: true; message: string };

type ControlOverride = {
	controlId: string;
	enabled: boolean;
	controlFrequency?: { kind: string; localTime?: string };
};

export function buildTodayControls(
	assets: ConfiguredAsset[],
	profiles: TemperatureProfile[],
	overrides: ControlOverride[]
): ScheduledTemperatureControl[] {
	const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
	const overridesByControlId = new Map(
		overrides
			.filter((override) => override.enabled)
			.map((override) => [override.controlId, override])
	);

	return assets.flatMap((asset) => {
		if (!asset.active || (asset.type !== 'refrigerator' && asset.type !== 'freezer')) return [];
		if (!asset.temperatureProfileId) return [];

		const profile = profilesById.get(asset.temperatureProfileId);
		if (!profile || profile.acceptance.operator !== 'lte') return [];

		const controlId =
			asset.type === 'freezer' ? 'freezer-temperature' : 'refrigeration-temperature';
		const override = overridesByControlId.get(controlId);
		if (!override) return [];

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
				dueTime: override.controlFrequency?.localTime ?? '09:00'
			}
		];
	});
}

export function assessMeasurement(
	control: ScheduledTemperatureControl,
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
