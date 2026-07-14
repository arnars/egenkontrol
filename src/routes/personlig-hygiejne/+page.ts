import plan from '../../../config/personlig-hygiejne.demo.json';
import type { StaticPracticePlan } from '$lib/domain/working-practice';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	plan: plan as StaticPracticePlan
});
