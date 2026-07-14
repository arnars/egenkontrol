import cleaningPlan from '../../../config/rengoering.demo.json';
import type { CleaningPlan } from '$lib/domain/working-practice';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	plan: cleaningPlan as CleaningPlan
});
