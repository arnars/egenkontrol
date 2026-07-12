import catalog from '../../config/egenkontrol.defaults.json';
import business from '../../config/virksomhed.json';
import { buildTodayControls } from '$lib/domain/today-controls';

export function load() {
	const controls = buildTodayControls(
		business.assets,
		catalog.productTemperatureProfiles,
		business.controlOverrides
	);

	return {
		companyName: business.company.name,
		locationName: business.locations[0]?.name ?? business.company.name,
		configurationStatus: business.status,
		controls,
		eventControls: [
			{ id: 'receiving-check', title: 'Varemodtagelse', description: 'Start ved levering' },
			{ id: 'heating-core-temperature', title: 'Opvarmning', description: 'Start for en batch' },
			{ id: 'cooling-time-temperature', title: 'Nedkøling', description: 'Start for en batch' },
			{
				id: 'hot-holding-temperature',
				title: 'Varmholdelse',
				description: 'Start ved varmholdning'
			}
		]
	};
}
