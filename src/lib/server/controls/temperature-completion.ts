import { z } from 'zod';
import { assessMeasurement, type ScheduledTemperatureControl } from '$lib/domain/today-controls';

const temperatureCompletionSchema = z.object({
	scheduledControlId: z.string().uuid(),
	controlId: z.string().min(1),
	value: z.coerce.number().finite().gte(-100).lte(200),
	deviation: z.boolean(),
	deviationDescription: z.string().trim().max(2_000).optional(),
	correctiveActionDescription: z.string().trim().max(2_000).optional(),
	observedAt: z.coerce.date(),
	idempotencyKey: z.string().uuid(),
	actorId: z.string().uuid()
});

export type TemperatureCompletionCommand = z.infer<typeof temperatureCompletionSchema>;

export type PreparedTemperatureCompletion = TemperatureCompletionCommand & {
	companyId: string;
	locationId: string;
	controlDefinitionId: string;
	controlDefinitionRevision: number;
	unit: 'celsius';
	requiresDeviation: boolean;
};

export class CompletionValidationError extends Error {}

export function prepareTemperatureCompletion(input: {
	command: unknown;
	control: ScheduledTemperatureControl;
	companyId: string;
	locationId: string;
	controlDefinitionRevision: number;
}): PreparedTemperatureCompletion {
	const command = temperatureCompletionSchema.parse(input.command);

	if (command.controlId !== input.control.id) {
		throw new CompletionValidationError('Kontrol-id matcher ikke den valgte kontroldefinition.');
	}

	const assessment = assessMeasurement(input.control, command.value);
	if (assessment.requiresDeviation && !command.deviation) {
		throw new CompletionValidationError(
			`${assessment.message} Registreringen kræver en dokumenteret afvigelse.`
		);
	}

	if (command.deviation && !command.deviationDescription) {
		throw new CompletionValidationError('Beskriv afvigelsen, før kontrollen kan gemmes.');
	}

	if (command.deviation && !command.correctiveActionDescription) {
		throw new CompletionValidationError(
			'Beskriv den korrigerende handling, før kontrollen kan gemmes.'
		);
	}

	return {
		...command,
		companyId: input.companyId,
		locationId: input.locationId,
		controlDefinitionId: input.control.id.split(':')[0],
		controlDefinitionRevision: input.controlDefinitionRevision,
		unit: 'celsius',
		requiresDeviation: assessment.requiresDeviation
	};
}
