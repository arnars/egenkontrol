import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import business from '../../../config/virksomhed.json';
import pestPlan from '../../../config/skadedyr.demo.json';
import type { Actions } from './$types';

const location = business.locations[0];
const pestSchema = z.object({
	areaId: z.string().min(1),
	incidentType: z.string().min(1),
	observation: z.string().trim().min(1).max(1000),
	productImpact: z.enum(['yes', 'no', 'unknown']),
	selectedActions: z.array(z.string()).max(20),
	requestId: z.string().uuid()
});

export const actions: Actions = {
	record: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });

		const formData = await request.formData();
		const parsed = pestSchema.safeParse({
			areaId: formData.get('areaId'),
			incidentType: formData.get('incidentType'),
			observation: formData.get('observation'),
			productImpact: formData.get('productImpact'),
			selectedActions: formData.getAll('selectedActions'),
			requestId: formData.get('requestId')
		});
		if (!parsed.success)
			return fail(400, { error: 'Kontrollér område, observation og vurdering.' });
		const area = pestPlan.areas.find((item) => item.id === parsed.data.areaId);
		const incident = pestPlan.incidentTypes.find((item) => item.id === parsed.data.incidentType);
		if (!area || !incident)
			return fail(400, { error: 'Vælg et gyldigt område og en hændelsestype.' });
		if (parsed.data.selectedActions.some((action) => !area.incidentActions.includes(action))) {
			return fail(400, { error: 'En valgt handling hører ikke til området.' });
		}

		const { error } = await locals.supabase.rpc('record_operational_incident', {
			p_location_id: location?.id ?? '',
			p_event_kind: 'pest_incident',
			p_payload: {
				areaId: area.id,
				areaLabel: area.label,
				incidentType: incident.id,
				incidentLabel: incident.label,
				observation: parsed.data.observation,
				productImpact: parsed.data.productImpact,
				actions: parsed.data.selectedActions
			},
			p_observed_at: new Date().toISOString(),
			p_request_id: parsed.data.requestId
		});
		if (error) {
			console.error('Kunne ikke gemme skadedyrshændelse', error.code);
			return fail(500, { error: 'Hændelsen kunne ikke gemmes. Dine felter er bevaret.' });
		}
		return { success: true };
	}
};
