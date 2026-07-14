import plan from '../../../config/adskillelse.demo.json';
import type { StaticPracticePlan } from '$lib/domain/working-practice';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	plan: plan as StaticPracticePlan
});
