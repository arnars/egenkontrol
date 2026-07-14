import riskAnalysis from '../../../config/risikoanalyse.demo.json';
import type { RiskAnalysisDocument } from '$lib/domain/risk-analysis';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	document: riskAnalysis as RiskAnalysisDocument
});
