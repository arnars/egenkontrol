import { describe, expect, it } from 'vitest';
import {
	assessMeasurement,
	buildTodayControls,
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
		enabled: true,
		controlFrequency: { kind: 'daily', localTime: '09:00' }
	},
	{
		controlId: 'freezer-temperature',
		enabled: true,
		controlFrequency: { kind: 'daily', localTime: '09:00' }
	}
];

describe('buildTodayControls', () => {
	it('creates one scheduled control for every active configured cold asset', () => {
		const assets: ConfiguredAsset[] = [
			{
				id: 'cold-1',
				label: 'Køl 1',
				type: 'refrigerator',
				active: true,
				temperatureProfileId: 'cold'
			},
			{
				id: 'cold-2',
				label: 'Køl 2',
				type: 'refrigerator',
				active: true,
				temperatureProfileId: 'cold'
			},
			{
				id: 'frozen-1',
				label: 'Frost 1',
				type: 'freezer',
				active: true,
				temperatureProfileId: 'frozen'
			},
			{
				id: 'retired',
				label: 'Gammel',
				type: 'freezer',
				active: false,
				temperatureProfileId: 'frozen'
			}
		];

		const result = buildTodayControls(assets, profiles, overrides);

		expect(result).toHaveLength(3);
		expect(result.map((control) => control.assetId)).toEqual(['cold-1', 'cold-2', 'frozen-1']);
		expect(result.map((control) => control.limit)).toEqual([5, 5, -18]);
	});
});

describe('assessMeasurement', () => {
	it('accepts a value at the configured maximum', () => {
		const [control] = buildTodayControls(
			[
				{
					id: 'cold-1',
					label: 'Køl 1',
					type: 'refrigerator',
					active: true,
					temperatureProfileId: 'cold'
				}
			],
			profiles,
			overrides
		);

		expect(assessMeasurement(control, 5)).toEqual({ ok: true, requiresDeviation: false });
	});

	it('requires an explicit deviation above the configured maximum', () => {
		const [control] = buildTodayControls(
			[
				{
					id: 'cold-1',
					label: 'Køl 1',
					type: 'refrigerator',
					active: true,
					temperatureProfileId: 'cold'
				}
			],
			profiles,
			overrides
		);

		expect(assessMeasurement(control, 5.1)).toMatchObject({
			ok: false,
			requiresDeviation: true
		});
	});
});
