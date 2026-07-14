export type RiskAnalysisParagraphBlock = {
	type: 'paragraphs';
	paragraphs: string[];
};

export type RiskAnalysisTableBlock = {
	type: 'table';
	columns: string[];
	rows: string[][];
};

export type RiskAnalysisBlock = RiskAnalysisParagraphBlock | RiskAnalysisTableBlock;

export type RiskAnalysisSection = {
	id: string;
	number: string;
	title: string;
	blocks: RiskAnalysisBlock[];
	subsections?: RiskAnalysisSection[];
};

export type RiskAnalysisDocument = {
	schemaVersion: number;
	id: string;
	title: string;
	subject: string;
	status: 'demonstration' | 'draft' | 'approved';
	statusLabel: string;
	revision: number;
	introduction: string;
	sections: RiskAnalysisSection[];
};
