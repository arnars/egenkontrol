import { describe, expect, it } from 'vitest';
import {
	assessMeasurement,
	buildTemperatureControls,
	buildTemperatureWeekSchedule,
	type ConfiguredAsset,
	type TemperatureProfile
} from './today-controls';

const profiles: TemperatureProfile[] = [
	{
		id: 'cold',
		label: 'Køl',
		status: 'requires_review',
		acceptance: { operator: 'lte', value: 5, unit: 'celsius' }
	},
	{
		id: 'frozen',
		label: 'Frost',
		status: 'requires_review',
		acceptance: { operator: 'lte', value: -18, unit: 'celsius' }
	}
];

const overrides = [
	{
		controlId: 'refrigeration-temperature',
		locationId: 'kitchen',
		enabled: true,
		controlFrequency: { kind: 'daily', localTime: '09:00' }
	},
	{
		controlId: 'freezer-temperature',
		locationId: 'kitchen',
		enabled: true,
		controlFrequency: { kind: 'daily', localTime: '09:00' }
	}
];

describe('buildTemperatureControls', () => {
	it('creates one scheduled control for every active configured cold asset', () => {
		const assets: ConfiguredAsset[] = [
			{
				id: 'cold-1',
				locationId: 'kitchen',
				label: 'Køl 1',
				type: 'refrigerator',
				active: true,
				temperatureProfileId: 'cold'
			},
			{
				id: 'cold-2',
				locationId: 'kitchen',
				label: 'Køl 2',
				type: 'refrigerator',
				active: true,
				temperatureProfileId: 'cold'
			},
			{
				id: 'frozen-1',
				locationId: 'kitchen',
				label: 'Frost 1',
				type: 'freezer',
				active: true,
				temperatureProfileId: 'frozen'
			},
			{
				id: 'retired',
				locationId: 'kitchen',
				label: 'Gammel',
				type: 'freezer',
				active: false,
				temperatureProfileId: 'frozen'
			}
		];

		const result = buildTemperatureControls(assets, profiles, overrides, 'kitchen');

		expect(result).toHaveLength(3);
		expect(result.map((control) => control.assetId)).toEqual(['cold-1', 'cold-2', 'frozen-1']);
		expect(result.map((control) => control.limit)).toEqual([5, 5, -18]);
	});
});

describe('buildTemperatureWeekSchedule', () => {
	const controls = buildTemperatureControls(
		[
			{
				id: 'cold-1',
				locationId: 'kitchen',
				label: 'Køl 1',
				type: 'refrigerator',
				active: true,
				temperatureProfileId: 'cold'
			}
		],
		profiles,
		overrides,
		'kitchen'
	);

	it('generates daily controls only on configured operating weekdays', () => {
		const result = buildTemperatureWeekSchedule(
			controls,
			['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
			'2026-07-13'
		);

		expect(result.startsOn).toBe('2026-07-13');
		expect(result.endsOn).toBe('2026-07-19');
		expect(result.days.map((day) => day.controls.length)).toEqual([0, 1, 1, 1, 1, 1, 0]);
		expect(result.days[1].controls[0].occurrenceKey).toBe(
			'refrigeration-temperature:cold-1:2026-07-14'
		);
	});

	it('uses Monday as the start of the week for a Sunday reference date', () => {
		const result = buildTemperatureWeekSchedule(controls, ['sunday'], '2026-07-19');

		expect(result.startsOn).toBe('2026-07-13');
		expect(result.days[6].isOperatingDay).toBe(true);
		expect(result.days[6].controls).toHaveLength(1);
	});

	it('supports selected weekdays but still excludes a configured closing day', () => {
		const selectedControls = buildTemperatureControls(
			[
				{
					id: 'cold-1',
					locationId: 'kitchen',
					label: 'Køl 1',
					type: 'refrigerator',
					active: true,
					temperatureProfileId: 'cold'
				}
			],
			profiles,
			[
				{
					controlId: 'refrigeration-temperature',
					locationId: 'kitchen',
					enabled: true,
					controlFrequency: {
						kind: 'selected_weekdays',
						weekdays: ['monday', 'wednesday', 'saturday'],
						localTime: '10:00'
					}
				}
			],
			'kitchen'
		);
		const result = buildTemperatureWeekSchedule(
			selectedControls,
			['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
			'2026-07-13'
		);

		expect(result.days.map((day) => day.controls.length)).toEqual([0, 0, 1, 0, 0, 1, 0]);
		expect(result.days[2].controls[0].dueTime).toBe('10:00');
	});
});

describe('assessMeasurement', () => {
	it('accepts a value at the configured maximum', () => {
		const [control] = buildTemperatureControls(
			[
				{
					id: 'cold-1',
					locationId: 'kitchen',
					label: 'Køl 1',
					type: 'refrigerator',
					active: true,
					temperatureProfileId: 'cold'
				}
			],
			profiles,
			overrides,
			'kitchen'
		);

		expect(assessMeasurement(control, 5)).toEqual({ ok: true, requiresDeviation: false });
	});

	it('requires an explicit deviation above the configured maximum', () => {
		const [control] = buildTemperatureControls(
			[
				{
					id: 'cold-1',
					locationId: 'kitchen',
					label: 'Køl 1',
					type: 'refrigerator',
					active: true,
					temperatureProfileId: 'cold'
				}
			],
			profiles,
			overrides,
			'kitchen'
		);

		expect(assessMeasurement(control, 5.1)).toMatchObject({
			ok: false,
			requiresDeviation: true
		});
	});
});
