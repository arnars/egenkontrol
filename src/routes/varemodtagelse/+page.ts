import receivingPlan from '../../../config/varemodtagelse.demo.json';
import type { ReceivingPlan } from '$lib/domain/working-practice';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	plan: receivingPlan as ReceivingPlan
});
