import { z } from 'zod';

export type NoMeasurementReason = {
	code: string;
	label: string;
	requiresNote: boolean;
};

const omissionSchema = z.object({
	scheduledControlId: z.string().uuid(),
	controlId: z.string().min(1),
	reasonCode: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
	note: z.string().trim().max(1_000).optional()
});

const omissionReasonSchema = z.object({
	reasonCode: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
	note: z.string().trim().max(1_000).optional()
});

export class OmissionValidationError extends Error {}

export function prepareOmissionReason(input: { command: unknown; reasons: NoMeasurementReason[] }) {
	const command = omissionReasonSchema.parse(input.command);
	const reason = input.reasons.find((item) => item.code === command.reasonCode);
	if (!reason) throw new OmissionValidationError('Vælg en gyldig grund til ingen måling.');

	if (reason.requiresNote && !command.note) {
		throw new OmissionValidationError('Skriv en kort forklaring til den valgte grund.');
	}

	return {
		...command,
		reasonLabel: reason.label
	};
}

export function prepareTemperatureOmission(input: {
	command: unknown;
	expectedControlId: string;
	reasons: NoMeasurementReason[];
}) {
	const command = omissionSchema.parse(input.command);

	if (command.controlId !== input.expectedControlId) {
		throw new OmissionValidationError('Kontrol-id matcher ikke den valgte kontrol.');
	}

	const reason = prepareOmissionReason({ command, reasons: input.reasons });

	return {
		...command,
		reasonLabel: reason.reasonLabel
	};
}
