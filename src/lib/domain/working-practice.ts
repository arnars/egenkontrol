export type SourceLink = {
	label: string;
	url: string;
};

export type StaticPracticePlan = {
	schemaVersion: number;
	id: string;
	title: string;
	status: 'draft' | 'approved';
	statusLabel: string;
	introduction: string;
	sections: Array<{
		id: string;
		title: string;
		description?: string;
		items: string[];
	}>;
	sources: SourceLink[];
};

export type CleaningPlan = {
	schemaVersion: number;
	id: string;
	title: string;
	status: 'draft' | 'approved';
	statusLabel: string;
	introduction: string;
	principles: string[];
	tasks: Array<{
		area: string;
		scope: string;
		method: string;
		frequency: string;
		check: string;
	}>;
	sources: SourceLink[];
};

export type PestPlan = {
	schemaVersion: number;
	id: string;
	title: string;
	status: 'draft' | 'approved';
	statusLabel: string;
	introduction: string;
	incidentTypes: Array<{ id: string; label: string }>;
	areas: Array<{
		id: string;
		label: string;
		status: 'example_requires_confirmation' | 'approved';
		prevention: string[];
		incidentActions: string[];
	}>;
	ratNotice: string;
	sources: SourceLink[];
};

export type ReceivingPlan = {
	schemaVersion: number;
	id: string;
	title: string;
	status: 'draft' | 'approved';
	statusLabel: string;
	introduction: string;
	checks: string[];
	issueTypes: Array<{ id: string; label: string }>;
	actions: Array<{ id: string; label: string }>;
	sources: SourceLink[];
};
