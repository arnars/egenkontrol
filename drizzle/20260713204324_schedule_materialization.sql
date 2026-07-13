CREATE UNIQUE INDEX "completed_controls_scheduled_original_uidx" ON "completed_controls" USING btree ("scheduled_control_id") WHERE "completed_controls"."scheduled_control_id" is not null and "completed_controls"."correction_of_id" is null;--> statement-breakpoint

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
			CASE WHEN v_local_date > v_today THEN 'upcoming' ELSE 'due' END
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
GRANT EXECUTE ON FUNCTION public.materialize_temperature_schedule(text, jsonb) TO authenticated;--> statement-breakpoint

DROP FUNCTION public.record_temperature_completion_with_action(text, text, numeric, boolean, text, text, timestamptz, uuid);--> statement-breakpoint
DROP FUNCTION public.record_temperature_completion(text, text, numeric, boolean, text, timestamptz, uuid);--> statement-breakpoint

CREATE FUNCTION public.record_temperature_completion(
	p_scheduled_control_id uuid,
	p_control_id text,
	p_location_id text,
	p_value numeric,
	p_deviation boolean,
	p_deviation_description text,
	p_observed_at timestamptz,
	p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_actor public.actors%ROWTYPE;
	v_location public.locations%ROWTYPE;
	v_definition public.control_definitions%ROWTYPE;
	v_scheduled public.scheduled_controls%ROWTYPE;
	v_definition_id text;
	v_asset_id text;
	v_limit numeric;
	v_completed_id uuid;
	v_submitted_at timestamptz;
	v_deviation_id uuid;
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

	SELECT * INTO v_scheduled
	FROM public.scheduled_controls
	WHERE id = p_scheduled_control_id
		AND company_id = v_actor.company_id
		AND location_id = v_location.id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Scheduled control is not available to the authenticated actor';
	END IF;

	v_definition_id := split_part(p_control_id, ':', 1);
	v_asset_id := split_part(p_control_id, ':', 2);

	IF v_definition_id = '' OR v_asset_id = '' OR split_part(p_control_id, ':', 3) <> '' THEN
		RAISE EXCEPTION 'Invalid configured control id';
	END IF;

	IF v_scheduled.control_definition_id <> v_definition_id
		OR v_scheduled.occurrence_key <> p_control_id || ':' || v_scheduled.local_date::text THEN
		RAISE EXCEPTION 'Scheduled control does not match the configured control';
	END IF;

	IF v_scheduled.local_date <> (p_observed_at AT TIME ZONE v_location.time_zone)::date THEN
		RAISE EXCEPTION 'Temperature control must be recorded on its scheduled local date';
	END IF;

	SELECT id, submitted_at INTO v_completed_id, v_submitted_at
	FROM public.completed_controls
	WHERE company_id = v_actor.company_id AND idempotency_key = p_idempotency_key::text;

	IF FOUND THEN
		RETURN jsonb_build_object(
			'id', v_completed_id,
			'submittedAt', v_submitted_at,
			'scheduledControlId', v_scheduled.id,
			'alreadyExisted', true
		);
	END IF;

	IF v_scheduled.status NOT IN ('upcoming', 'due') THEN
		RAISE EXCEPTION 'Scheduled control cannot be completed from its current status';
	END IF;

	IF EXISTS (
		SELECT 1 FROM public.completed_controls
		WHERE scheduled_control_id = v_scheduled.id AND correction_of_id IS NULL
	) THEN
		RAISE EXCEPTION 'Scheduled control already has an original completion';
	END IF;

	SELECT * INTO v_definition
	FROM public.control_definitions
	WHERE id = v_scheduled.control_definition_id
		AND revision = v_scheduled.control_definition_revision
		AND company_id = v_actor.company_id
		AND status IN ('draft', 'active');

	IF NOT FOUND OR NOT (v_definition.configuration -> 'assets' ? v_asset_id) THEN
		RAISE EXCEPTION 'Scheduled control definition is not available';
	END IF;

	v_limit := (v_definition.configuration -> 'assets' -> v_asset_id ->> 'limit')::numeric;

	IF p_value < -100 OR p_value > 200 THEN
		RAISE EXCEPTION 'Temperature is outside the accepted input range';
	END IF;

	IF p_value > v_limit AND NOT p_deviation THEN
		RAISE EXCEPTION 'The measurement requires a documented deviation';
	END IF;

	IF p_deviation AND nullif(btrim(p_deviation_description), '') IS NULL THEN
		RAISE EXCEPTION 'A deviation description is required';
	END IF;

	INSERT INTO public.completed_controls (
		company_id,
		location_id,
		scheduled_control_id,
		control_definition_id,
		control_definition_revision,
		idempotency_key,
		observed_at,
		submitted_by,
		metadata
	) VALUES (
		v_actor.company_id,
		v_location.id,
		v_scheduled.id,
		v_definition.id,
		v_definition.revision,
		p_idempotency_key::text,
		p_observed_at,
		v_actor.id,
		jsonb_build_object('configuredControlId', p_control_id, 'assetId', v_asset_id)
	)
	RETURNING id, submitted_at INTO v_completed_id, v_submitted_at;

	INSERT INTO public.measurements (
		completed_control_id,
		field_id,
		value,
		unit,
		measured_at
	) VALUES (
		v_completed_id,
		'measuredTemperature',
		p_value,
		'celsius',
		p_observed_at
	);

	IF p_deviation THEN
		INSERT INTO public.deviations (
			company_id,
			location_id,
			completed_control_id,
			description,
			opened_by
		) VALUES (
			v_actor.company_id,
			v_location.id,
			v_completed_id,
			btrim(p_deviation_description),
			v_actor.id
		)
		RETURNING id INTO v_deviation_id;

		INSERT INTO public.deviation_events (deviation_id, kind, note, actor_id)
		VALUES (v_deviation_id, 'opened', btrim(p_deviation_description), v_actor.id);
	END IF;

	UPDATE public.scheduled_controls
	SET status = 'completed'
	WHERE id = v_scheduled.id;

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
		'submitted',
		'completed_control',
		v_completed_id::text,
		v_correlation_id,
		jsonb_build_object(
			'controlDefinitionId', v_definition.id,
			'controlDefinitionRevision', v_definition.revision,
			'scheduledControlId', v_scheduled.id,
			'deviationId', v_deviation_id
		)
	);

	RETURN jsonb_build_object(
		'id', v_completed_id,
		'submittedAt', v_submitted_at,
		'scheduledControlId', v_scheduled.id,
		'deviationId', v_deviation_id,
		'correlationId', v_correlation_id,
		'alreadyExisted', false
	);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_temperature_completion(uuid, text, text, numeric, boolean, text, timestamptz, uuid) FROM PUBLIC;--> statement-breakpoint

CREATE FUNCTION public.record_temperature_completion_with_action(
	p_scheduled_control_id uuid,
	p_control_id text,
	p_location_id text,
	p_value numeric,
	p_deviation boolean,
	p_deviation_description text,
	p_corrective_action_description text,
	p_observed_at timestamptz,
	p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_result jsonb;
	v_completed public.completed_controls%ROWTYPE;
	v_deviation_id uuid;
	v_corrective_action_id uuid;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	IF p_deviation AND nullif(btrim(p_corrective_action_description), '') IS NULL THEN
		RAISE EXCEPTION 'A corrective action description is required';
	END IF;

	v_result := public.record_temperature_completion(
		p_scheduled_control_id,
		p_control_id,
		p_location_id,
		p_value,
		p_deviation,
		p_deviation_description,
		p_observed_at,
		p_idempotency_key
	);

	IF NOT p_deviation THEN
		RETURN v_result;
	END IF;

	SELECT * INTO v_completed
	FROM public.completed_controls
	WHERE id = (v_result ->> 'id')::uuid
		AND submitted_by = auth.uid();

	IF NOT FOUND THEN
		RAISE EXCEPTION 'The completed control does not belong to the authenticated actor';
	END IF;

	SELECT id INTO v_deviation_id
	FROM public.deviations
	WHERE completed_control_id = v_completed.id
	ORDER BY opened_at
	LIMIT 1;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'The deviation was not created';
	END IF;

	SELECT id INTO v_corrective_action_id
	FROM public.corrective_actions
	WHERE deviation_id = v_deviation_id
	ORDER BY created_at
	LIMIT 1;

	IF NOT FOUND THEN
		INSERT INTO public.corrective_actions (
			deviation_id,
			description,
			status,
			performed_at,
			performed_by,
			created_by
		) VALUES (
			v_deviation_id,
			btrim(p_corrective_action_description),
			'completed',
			now(),
			auth.uid(),
			auth.uid()
		)
		RETURNING id INTO v_corrective_action_id;

		INSERT INTO public.deviation_events (deviation_id, kind, note, actor_id)
		VALUES (
			v_deviation_id,
			'assessment_recorded',
			btrim(p_corrective_action_description),
			auth.uid()
		);

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
			v_completed.company_id,
			v_completed.location_id,
			auth.uid(),
			'created',
			'corrective_action',
			v_corrective_action_id::text,
			v_correlation_id,
			jsonb_build_object(
				'deviationId', v_deviation_id,
				'completedControlId', v_completed.id
			)
		);
	END IF;

	RETURN v_result || jsonb_build_object(
		'deviationId', v_deviation_id,
		'correctiveActionId', v_corrective_action_id
	);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_temperature_completion_with_action(uuid, text, text, numeric, boolean, text, text, timestamptz, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_temperature_completion_with_action(uuid, text, text, numeric, boolean, text, text, timestamptz, uuid) TO authenticated;
