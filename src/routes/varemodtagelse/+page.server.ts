import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import business from '../../../config/virksomhed.json';
import receivingPlan from '../../../config/varemodtagelse.demo.json';
import type { Actions } from './$types';

const location = business.locations[0];
const receivingSchema = z.object({
	supplier: z.string().trim().min(1).max(120),
	deliveryReference: z.string().trim().min(1).max(120),
	issueType: z.string().min(1),
	temperature: z.string().trim().max(20).optional(),
	actionId: z.string().min(1),
	note: z.string().trim().min(1).max(1000),
	requestId: z.string().uuid()
});

export const actions: Actions = {
	record: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });

		const parsed = receivingSchema.safeParse(
			Object.fromEntries((await request.formData()).entries())
		);
		if (!parsed.success)
			return fail(400, { error: 'Kontrollér leverandør, leverance og vurdering.' });
		const issue = receivingPlan.issueTypes.find((item) => item.id === parsed.data.issueType);
		const action = receivingPlan.actions.find((item) => item.id === parsed.data.actionId);
		if (!issue || !action) return fail(400, { error: 'Vælg en gyldig fejl og handling.' });

		let measuredTemperature: number | undefined;
		if (parsed.data.issueType === 'temperature') {
			measuredTemperature = Number(parsed.data.temperature?.replace(',', '.'));
			if (
				!Number.isFinite(measuredTemperature) ||
				measuredTemperature < -100 ||
				measuredTemperature > 200
			) {
				return fail(400, { error: 'Indtast en gyldig temperatur.' });
			}
		}

		const { error } = await locals.supabase.rpc('record_operational_incident', {
			p_location_id: location?.id ?? '',
			p_event_kind: 'receiving_deviation',
			p_payload: {
				supplier: parsed.data.supplier,
				deliveryReference: parsed.data.deliveryReference,
				issueType: issue.id,
				issueLabel: issue.label,
				actionId: action.id,
				actionLabel: action.label,
				assessment: parsed.data.note,
				...(measuredTemperature === undefined ? {} : { measuredTemperature })
			},
			p_observed_at: new Date().toISOString(),
			p_request_id: parsed.data.requestId
		});
		if (error) {
			console.error('Kunne ikke gemme varemodtagelseshændelse', error.code);
			return fail(500, { error: 'Hændelsen kunne ikke gemmes. Dine felter er bevaret.' });
		}
		return { success: true };
	}
};
