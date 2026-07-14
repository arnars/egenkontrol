import pestPlan from '../../../config/skadedyr.demo.json';
import type { PestPlan } from '$lib/domain/working-practice';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	plan: pestPlan as PestPlan
});
