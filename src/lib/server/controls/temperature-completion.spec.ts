import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ScheduledTemperatureControl } from '$lib/domain/today-controls';
import { CompletionValidationError, prepareTemperatureCompletion } from './temperature-completion';

const control: ScheduledTemperatureControl = {
	id: 'refrigeration-temperature:refrigerator-1',
	assetId: 'refrigerator-1',
	assetLabel: 'Køleskab 1',
	assetType: 'refrigerator',
	profileId: 'chilled-general-draft',
	profileLabel: 'Køl',
	profileStatus: 'requires_review',
	limit: 5,
	unit: 'celsius',
	dueTime: '09:00',
	frequency: { kind: 'daily' },
	localDate: '2026-07-12',
	occurrenceKey: 'refrigeration-temperature:refrigerator-1:2026-07-12'
};

function command(overrides: Record<string, unknown> = {}) {
	return {
		controlId: control.id,
		value: 4.2,
		deviation: false,
		observedAt: new Date('2026-07-12T07:30:00Z'),
		idempotencyKey: randomUUID(),
		actorId: randomUUID(),
		...overrides
	};
}

describe('prepareTemperatureCompletion', () => {
	it('prepares an acceptable measurement with its immutable definition revision', () => {
		const result = prepareTemperatureCompletion({
			command: command(),
			control,
			companyId: 'nabo-brejning',
			locationId: 'brejning',
			controlDefinitionRevision: 1
		});

		expect(result).toMatchObject({
			companyId: 'nabo-brejning',
			locationId: 'brejning',
			controlDefinitionId: 'refrigeration-temperature',
			controlDefinitionRevision: 1,
			value: 4.2,
			requiresDeviation: false
		});
	});

	it('rejects an out-of-limit measurement without a deviation', () => {
		expect(() =>
			prepareTemperatureCompletion({
				command: command({ value: 6 }),
				control,
				companyId: 'nabo-brejning',
				locationId: 'brejning',
				controlDefinitionRevision: 1
			})
		).toThrow(CompletionValidationError);
	});

	it('requires explanatory text for an explicit deviation', () => {
		expect(() =>
			prepareTemperatureCompletion({
				command: command({ value: 6, deviation: true }),
				control,
				companyId: 'nabo-brejning',
				locationId: 'brejning',
				controlDefinitionRevision: 1
			})
		).toThrow('Beskriv afvigelsen');
	});

	it('requires a corrective action for an explicit deviation', () => {
		expect(() =>
			prepareTemperatureCompletion({
				command: command({
					value: 6,
					deviation: true,
					deviationDescription: 'Temperaturen var over startprofilens grænse.'
				}),
				control,
				companyId: 'nabo-brejning',
				locationId: 'brejning',
				controlDefinitionRevision: 1
			})
		).toThrow('Beskriv den korrigerende handling');
	});

	it('prepares a complete deviation and corrective action', () => {
		const result = prepareTemperatureCompletion({
			command: command({
				value: 6,
				deviation: true,
				deviationDescription: 'Temperaturen var over startprofilens grænse.',
				correctiveActionDescription: 'Varerne blev flyttet til en anden køleenhed.'
			}),
			control,
			companyId: 'nabo-brejning',
			locationId: 'brejning',
			controlDefinitionRevision: 1
		});

		expect(result).toMatchObject({
			deviation: true,
			requiresDeviation: true,
			correctiveActionDescription: 'Varerne blev flyttet til en anden køleenhed.'
		});
	});
});
