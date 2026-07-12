import { getDatabase } from '$lib/server/db/client';
import {
	auditEvents,
	completedControls,
	deviationEvents,
	deviations,
	measurements
} from '$lib/server/db/schema';
import type { PreparedTemperatureCompletion } from './temperature-completion';

export async function recordTemperatureCompletion(command: PreparedTemperatureCompletion) {
	const db = getDatabase();
	const correlationId = crypto.randomUUID();

	return db.transaction(async (tx) => {
		const [completed] = await tx
			.insert(completedControls)
			.values({
				companyId: command.companyId,
				locationId: command.locationId,
				controlDefinitionId: command.controlDefinitionId,
				controlDefinitionRevision: command.controlDefinitionRevision,
				idempotencyKey: command.idempotencyKey,
				observedAt: command.observedAt,
				submittedBy: command.actorId,
				metadata: { configuredControlId: command.controlId }
			})
			.returning({ id: completedControls.id, submittedAt: completedControls.submittedAt });

		await tx.insert(measurements).values({
			completedControlId: completed.id,
			fieldId: 'measuredTemperature',
			value: command.value,
			unit: command.unit,
			measuredAt: command.observedAt
		});

		let deviationId: string | undefined;
		if (command.deviation) {
			const [createdDeviation] = await tx
				.insert(deviations)
				.values({
					companyId: command.companyId,
					locationId: command.locationId,
					completedControlId: completed.id,
					description: command.deviationDescription!,
					openedBy: command.actorId
				})
				.returning({ id: deviations.id });

			deviationId = createdDeviation.id;
			await tx.insert(deviationEvents).values({
				deviationId,
				kind: 'opened',
				note: command.deviationDescription!,
				actorId: command.actorId
			});
		}

		await tx.insert(auditEvents).values({
			companyId: command.companyId,
			locationId: command.locationId,
			actorId: command.actorId,
			action: 'submitted',
			entityType: 'completed_control',
			entityId: completed.id,
			correlationId,
			metadata: {
				controlDefinitionId: command.controlDefinitionId,
				controlDefinitionRevision: command.controlDefinitionRevision,
				deviationId
			}
		});

		return { ...completed, deviationId, correlationId };
	});
}
