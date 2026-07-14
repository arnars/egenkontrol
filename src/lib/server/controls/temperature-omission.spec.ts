import { describe, expect, it } from 'vitest';
import { OmissionValidationError, prepareTemperatureOmission } from './temperature-omission';

const reasons = [
	{ code: 'closed', label: 'Lukket', requiresNote: false },
	{ code: 'other', label: 'Anden årsag', requiresNote: true }
];

const command = {
	scheduledControlId: '10000000-0000-4000-8000-000000000001',
	controlId: 'refrigeration-temperature:refrigerator-1',
	reasonCode: 'closed'
};

describe('prepareTemperatureOmission', () => {
	it('snapshots the configured reason label', () => {
		expect(
			prepareTemperatureOmission({
				command,
				expectedControlId: command.controlId,
				reasons
			})
		).toMatchObject({ reasonCode: 'closed', reasonLabel: 'Lukket' });
	});

	it('rejects a reason that is not in company configuration', () => {
		expect(() =>
			prepareTemperatureOmission({
				command: { ...command, reasonCode: 'invented' },
				expectedControlId: command.controlId,
				reasons
			})
		).toThrow(OmissionValidationError);
	});

	it('requires a note when configured for the selected reason', () => {
		expect(() =>
			prepareTemperatureOmission({
				command: { ...command, reasonCode: 'other' },
				expectedControlId: command.controlId,
				reasons
			})
		).toThrow('Skriv en kort forklaring');
	});
});
