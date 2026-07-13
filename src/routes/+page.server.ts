import { fail } from '@sveltejs/kit';
import catalog from '../../config/egenkontrol.defaults.json';
import business from '../../config/virksomhed.json';
import {
	buildTemperatureControls,
	buildTemperatureWeekSchedule,
	type Weekday
} from '$lib/domain/today-controls';
import {
	CompletionValidationError,
	prepareTemperatureCompletion
} from '$lib/server/controls/temperature-completion';
import type { Actions, PageServerLoad } from './$types';

const location = business.locations[0];
const controlDefinitions = buildTemperatureControls(
	business.assets,
	catalog.productTemperatureProfiles,
	business.controlOverrides,
	location?.id ?? ''
);

type StoredCompletion = {
	id: string;
	observed_at: string;
	metadata: { configuredControlId?: string } | null;
	measurements: Array<{ value: number }>;
	deviations: Array<{
		id: string;
		corrective_actions: Array<{ description: string; status: string }>;
	}>;
};

function localDate(value: string | Date) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: location?.timeZone ?? 'Europe/Copenhagen',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(value));
}

function currentSchedule(now = new Date()) {
	const today = localDate(now);
	const schedule = buildTemperatureWeekSchedule(
		controlDefinitions,
		(location?.operatingWeekdays ?? []) as Weekday[],
		today
	);
	const todaySchedule = schedule.days.find((day) => day.localDate === today);

	return { today, schedule, todaySchedule };
}

export const load: PageServerLoad = async ({ locals }) => {
	const { today, schedule, todaySchedule } = currentSchedule();
	const { data, error } = await locals.supabase
		.from('completed_controls')
		.select(
			'id, observed_at, metadata, measurements(value), deviations(id, corrective_actions(description, status))'
		)
		.eq('location_id', location?.id ?? '')
		.order('observed_at', { ascending: false })
		.limit(100);

	if (error) console.error('Kunne ikke hente dagens kontroller', error.code);

	const weeklyCompletions = Object.fromEntries(
		((data ?? []) as StoredCompletion[]).flatMap((completion) => {
			const controlId = completion.metadata?.configuredControlId;
			const value = completion.measurements[0]?.value;
			if (!controlId || value === undefined) return [];
			const completionLocalDate = localDate(completion.observed_at);

			return [
				[
					`${controlId}:${completionLocalDate}`,
					{
						id: completion.id,
						value: Number(value),
						deviation: completion.deviations.length > 0,
						correctiveAction: completion.deviations[0]?.corrective_actions[0]?.description ?? null,
						completedAt: completion.observed_at
					}
				] as const
			];
		})
	);
	const completions = Object.fromEntries(
		(todaySchedule?.controls ?? []).flatMap((control) => {
			const completion = weeklyCompletions[control.occurrenceKey];
			return completion ? [[control.id, completion]] : [];
		})
	);

	return {
		companyName: business.company.name,
		locationName: location?.name ?? business.company.name,
		configurationStatus: business.status,
		today,
		todaySchedule,
		schedule,
		controls: todaySchedule?.controls ?? [],
		completions,
		weeklyCompletions,
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
};

export const actions: Actions = {
	complete: async ({ request, locals }) => {
		const { claims } = await locals.getVerifiedAuth();
		if (!claims) return fail(401, { error: 'Din session er udløbet. Log ind igen.' });

		const formData = await request.formData();
		const { todaySchedule } = currentSchedule();
		const control = todaySchedule?.controls.find((item) => item.id === formData.get('controlId'));
		if (!control) return fail(400, { error: 'Kontrollen findes ikke længere.' });

		try {
			const rawValue = String(formData.get('value') ?? '')
				.replace(',', '.')
				.trim();
			const command = prepareTemperatureCompletion({
				command: {
					controlId: formData.get('controlId'),
					value: rawValue,
					deviation: formData.get('deviation') === 'on',
					deviationDescription: formData.get('deviationDescription') || undefined,
					correctiveActionDescription: formData.get('correctiveActionDescription') || undefined,
					observedAt: new Date(),
					idempotencyKey: formData.get('idempotencyKey'),
					actorId: claims.sub
				},
				control,
				companyId: business.company.id,
				locationId: location?.id ?? '',
				controlDefinitionRevision: 1
			});

			const { error } = await locals.supabase.rpc('record_temperature_completion_with_action', {
				p_control_id: command.controlId,
				p_location_id: command.locationId,
				p_value: command.value,
				p_deviation: command.deviation,
				p_deviation_description: command.deviationDescription ?? null,
				p_corrective_action_description: command.correctiveActionDescription ?? null,
				p_observed_at: command.observedAt.toISOString(),
				p_idempotency_key: command.idempotencyKey
			});

			if (error) {
				console.error('Kunne ikke gemme temperaturkontrol', error.code);
				return fail(500, { error: 'Kontrollen kunne ikke gemmes. Dine felter er bevaret.' });
			}

			return { success: true };
		} catch (error) {
			if (error instanceof CompletionValidationError) return fail(400, { error: error.message });
			return fail(400, { error: 'Kontrollér målingen og prøv igen.' });
		}
	}
};
