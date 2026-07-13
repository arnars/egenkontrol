CREATE OR REPLACE FUNCTION public.materialize_temperature_schedule(
	p_location_id text,
	p_occurrences jsonb
)
RETURNS TABLE (
	scheduled_control_id uuid,
	occurrence_key text,
	scheduled_status public.scheduled_control_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_actor public.actors%ROWTYPE;
	v_location public.locations%ROWTYPE;
	v_definition public.control_definitions%ROWTYPE;
	v_occurrence jsonb;
	v_control_id text;
	v_definition_id text;
	v_asset_id text;
	v_occurrence_key text;
	v_local_date date;
	v_due_time time;
	v_today date;
	v_inserted_id uuid;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor
	FROM public.actors
	WHERE id = auth.uid() AND retired_at IS NULL;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Authenticated user is not an active actor';
	END IF;

	SELECT * INTO v_location
	FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Location is not available to the authenticated actor';
	END IF;

	IF jsonb_typeof(p_occurrences) <> 'array' OR jsonb_array_length(p_occurrences) > 100 THEN
		RAISE EXCEPTION 'Schedule payload must be an array with at most 100 occurrences';
	END IF;

	v_today := (now() AT TIME ZONE v_location.time_zone)::date;

	FOR v_occurrence IN SELECT value FROM jsonb_array_elements(p_occurrences)
	LOOP
		v_control_id := nullif(v_occurrence ->> 'controlId', '');
		v_occurrence_key := nullif(v_occurrence ->> 'occurrenceKey', '');

		IF v_control_id IS NULL OR v_occurrence_key IS NULL THEN
			RAISE EXCEPTION 'A schedule occurrence is missing its control id or occurrence key';
		END IF;

		v_definition_id := split_part(v_control_id, ':', 1);
		v_asset_id := split_part(v_control_id, ':', 2);

		IF v_definition_id = '' OR v_asset_id = '' OR split_part(v_control_id, ':', 3) <> '' THEN
			RAISE EXCEPTION 'Invalid configured control id';
		END IF;

		BEGIN
			v_local_date := (v_occurrence ->> 'localDate')::date;
		EXCEPTION WHEN OTHERS THEN
			RAISE EXCEPTION 'Invalid local date in schedule occurrence';
		END;

		IF coalesce(v_occurrence ->> 'dueTime', '') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' THEN
			RAISE EXCEPTION 'Invalid due time in schedule occurrence';
		END IF;

		v_due_time := (v_occurrence ->> 'dueTime')::time;

		IF v_occurrence_key <> v_control_id || ':' || v_local_date::text THEN
			RAISE EXCEPTION 'Occurrence key does not match control and local date';
		END IF;

		IF v_local_date < v_today - 7 OR v_local_date > v_today + 14 THEN
			RAISE EXCEPTION 'Schedule occurrence is outside the allowed rolling window';
		END IF;

		SELECT * INTO v_definition
		FROM public.control_definitions AS definition
		WHERE definition.id = v_definition_id
			AND definition.company_id = v_actor.company_id
			AND definition.status IN ('draft', 'active')
		ORDER BY definition.revision DESC
		LIMIT 1;

		IF NOT FOUND OR NOT (v_definition.configuration -> 'assets' ? v_asset_id) THEN
			RAISE EXCEPTION 'Control is not configured for this company';
		END IF;

		v_inserted_id := NULL;

		INSERT INTO public.scheduled_controls (
			company_id,
			location_id,
			control_definition_id,
			control_definition_revision,
			occurrence_key,
			local_date,
			window_starts_at,
			window_ends_at,
			time_zone,
			status
		) VALUES (
			v_actor.company_id,
			v_location.id,
			v_definition.id,
			v_definition.revision,
			v_occurrence_key,
			v_local_date,
			v_local_date::timestamp AT TIME ZONE v_location.time_zone,
			(v_local_date + v_due_time) AT TIME ZONE v_location.time_zone,
			v_location.time_zone,
			CASE
				WHEN v_local_date > v_today THEN 'upcoming'::public.scheduled_control_status
				ELSE 'due'::public.scheduled_control_status
			END
		)
		ON CONFLICT DO NOTHING
		RETURNING id INTO v_inserted_id;

		IF v_inserted_id IS NOT NULL THEN
			INSERT INTO public.audit_events (
				company_id,
				location_id,
				actor_id,
				action,
				entity_type,
				entity_id,
				correlation_id,
				metadata
			) VALUES (
				v_actor.company_id,
				v_location.id,
				v_actor.id,
				'created',
				'scheduled_control',
				v_inserted_id::text,
				v_correlation_id,
				jsonb_build_object('occurrenceKey', v_occurrence_key)
			);
		END IF;
	END LOOP;

	RETURN QUERY
	SELECT scheduled.id, scheduled.occurrence_key, scheduled.status
	FROM public.scheduled_controls AS scheduled
	WHERE scheduled.company_id = v_actor.company_id
		AND scheduled.location_id = v_location.id
		AND scheduled.occurrence_key IN (
			SELECT value ->> 'occurrenceKey' FROM jsonb_array_elements(p_occurrences)
		);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.materialize_temperature_schedule(text, jsonb) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.materialize_temperature_schedule(text, jsonb) TO authenticated;
