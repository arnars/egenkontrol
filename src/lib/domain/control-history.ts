export const historyTypeOptions = [
	{ value: 'all', label: 'Alle hændelser' },
	{ value: 'control', label: 'Kontroller' },
	{ value: 'receiving', label: 'Varemodtagelse' },
	{ value: 'pest', label: 'Skadedyr' }
] as const;

export type HistoryType = (typeof historyTypeOptions)[number]['value'];

export function parseHistoryType(value: string | null): HistoryType {
	return historyTypeOptions.some((option) => option.value === value)
		? (value as HistoryType)
		: 'all';
}

export function unavailableHistoryMessage(type: HistoryType) {
	if (type === 'receiving') {
		return 'Hændelser fra varemodtagelse bliver vist her, når registreringerne kobles til persistenslaget.';
	}
	if (type === 'pest') {
		return 'Skadedyrshændelser bliver vist her, når registreringerne kobles til persistenslaget.';
	}
	return '';
}
