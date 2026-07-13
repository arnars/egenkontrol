CREATE OR REPLACE FUNCTION public.record_temperature_completion_with_action(
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
$$;

REVOKE ALL ON FUNCTION public.record_temperature_completion_with_action(text, text, numeric, boolean, text, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_temperature_completion_with_action(text, text, numeric, boolean, text, text, timestamptz, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_temperature_completion(text, text, numeric, boolean, text, timestamptz, uuid) FROM authenticated;
