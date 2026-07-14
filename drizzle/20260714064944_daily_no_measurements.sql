CREATE OR REPLACE FUNCTION public.record_temperature_day_omissions(
	p_scheduled_control_ids uuid[],
	p_location_id text,
	p_local_date date,
	p_reason_code text,
	p_reason_label text,
	p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_actor public.actors%ROWTYPE;
	v_location public.locations%ROWTYPE;
	v_schedule public.scheduled_controls%ROWTYPE;
	v_omission public.scheduled_control_omissions%ROWTYPE;
	v_expected_count integer;
	v_matched_count integer;
	v_created_count integer := 0;
	v_existing_count integer := 0;
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

	v_expected_count := cardinality(p_scheduled_control_ids);
	IF v_expected_count NOT BETWEEN 1 AND 100
		OR EXISTS (SELECT 1 FROM unnest(p_scheduled_control_ids) AS item(id) WHERE id IS NULL)
		OR (SELECT count(DISTINCT id) FROM unnest(p_scheduled_control_ids) AS item(id)) <> v_expected_count THEN
		RAISE EXCEPTION 'One to one hundred unique scheduled controls are required';
	END IF;

	IF p_local_date <> (now() AT TIME ZONE v_location.time_zone)::date THEN
		RAISE EXCEPTION 'Only the current local date can be closed without measurements';
	END IF;

	IF p_reason_code !~ '^[a-z][a-z0-9-]{0,63}$'
		OR length(btrim(p_reason_label)) NOT BETWEEN 1 AND 100
		OR length(coalesce(p_note, '')) > 1000 THEN
		RAISE EXCEPTION 'Invalid no-measurement reason';
	END IF;

	SELECT count(*) INTO v_matched_count
	FROM public.scheduled_controls
	WHERE id = ANY(p_scheduled_control_ids)
		AND company_id = v_actor.company_id
		AND location_id = v_location.id
		AND local_date = p_local_date;

	IF v_matched_count <> v_expected_count THEN
		RAISE EXCEPTION 'One or more scheduled controls are not available for this location and date';
	END IF;

	-- A deterministic lock order prevents two overlapping batch requests from deadlocking.
	PERFORM id
	FROM public.scheduled_controls
	WHERE id = ANY(p_scheduled_control_ids)
	ORDER BY id
	FOR UPDATE;

	FOR v_schedule IN
		SELECT *
		FROM public.scheduled_controls
		WHERE id = ANY(p_scheduled_control_ids)
		ORDER BY id
	LOOP
		SELECT * INTO v_omission
		FROM public.scheduled_control_omissions
		WHERE scheduled_control_id = v_schedule.id;

		IF FOUND THEN
			IF v_omission.reason_code <> p_reason_code
				OR v_omission.reason_label <> btrim(p_reason_label)
				OR coalesce(v_omission.note, '') <> coalesce(nullif(btrim(p_note), ''), '') THEN
				RAISE EXCEPTION 'Scheduled control already has a different no-measurement outcome';
			END IF;
			v_existing_count := v_existing_count + 1;
			CONTINUE;
		END IF;

		IF EXISTS (
			SELECT 1 FROM public.completed_controls
			WHERE scheduled_control_id = v_schedule.id AND correction_of_id IS NULL
		) OR v_schedule.status = 'completed' THEN
			RAISE EXCEPTION 'A scheduled control already has a measurement';
		END IF;

		IF v_schedule.status NOT IN ('upcoming', 'due', 'missed') THEN
			RAISE EXCEPTION 'A scheduled control cannot be omitted from its current status';
		END IF;

		INSERT INTO public.scheduled_control_omissions (
			company_id,
			location_id,
			scheduled_control_id,
			reason_code,
			reason_label,
			note,
			recorded_by
		) VALUES (
			v_actor.company_id,
			v_location.id,
			v_schedule.id,
			p_reason_code,
			btrim(p_reason_label),
			nullif(btrim(p_note), ''),
			v_actor.id
		)
		RETURNING * INTO v_omission;

		UPDATE public.scheduled_controls
		SET status = 'cancelled'
		WHERE id = v_schedule.id;

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
			'status_changed',
			'scheduled_control',
			v_schedule.id::text,
			v_correlation_id,
			jsonb_build_object(
				'fromStatus', v_schedule.status,
				'toStatus', 'cancelled',
				'outcome', 'no_measurement',
				'batchOutcome', 'no_measurements_today',
				'localDate', p_local_date,
				'reasonCode', p_reason_code,
				'reasonLabel', btrim(p_reason_label),
				'omissionId', v_omission.id
			)
		);

		v_created_count := v_created_count + 1;
	END LOOP;

	RETURN jsonb_build_object(
		'createdCount', v_created_count,
		'existingCount', v_existing_count,
		'localDate', p_local_date,
		'correlationId', v_correlation_id
	);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_temperature_day_omissions(uuid[], text, date, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_temperature_day_omissions(uuid[], text, date, text, text, text) TO authenticated;
