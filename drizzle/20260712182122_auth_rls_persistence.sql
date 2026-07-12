CREATE OR REPLACE FUNCTION public.current_actor_company_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT company_id FROM public.actors WHERE id = auth.uid() AND retired_at IS NULL
$$;

REVOKE ALL ON FUNCTION public.current_actor_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_actor_company_id() TO authenticated;

CREATE POLICY "company members can read their company"
ON public.companies FOR SELECT TO authenticated
USING (id = public.current_actor_company_id());

CREATE POLICY "company members can read their locations"
ON public.locations FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

CREATE POLICY "company members can read company actors"
ON public.actors FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

CREATE POLICY "company members can read control definitions"
ON public.control_definitions FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

CREATE POLICY "company members can read scheduled controls"
ON public.scheduled_controls FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

CREATE POLICY "company members can read completed controls"
ON public.completed_controls FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

CREATE POLICY "company members can read measurements"
ON public.measurements FOR SELECT TO authenticated
USING (
	EXISTS (
		SELECT 1 FROM public.completed_controls
		WHERE completed_controls.id = measurements.completed_control_id
			AND completed_controls.company_id = public.current_actor_company_id()
	)
);

CREATE POLICY "company members can read deviations"
ON public.deviations FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

CREATE POLICY "company members can read deviation events"
ON public.deviation_events FOR SELECT TO authenticated
USING (
	EXISTS (
		SELECT 1 FROM public.deviations
		WHERE deviations.id = deviation_events.deviation_id
			AND deviations.company_id = public.current_actor_company_id()
	)
);

CREATE POLICY "company members can read corrective actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
	EXISTS (
		SELECT 1 FROM public.deviations
		WHERE deviations.id = corrective_actions.deviation_id
			AND deviations.company_id = public.current_actor_company_id()
	)
);

CREATE POLICY "company members can read audit events"
ON public.audit_events FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());

INSERT INTO public.control_definitions (
	id,
	revision,
	company_id,
	title,
	input_kind,
	status,
	configuration,
	source_catalog_version,
	change_reason,
	created_by
)
SELECT
	'refrigeration-temperature',
	1,
	'nabo-brejning',
	'Temperatur på køl',
	'measurement',
	'draft',
	'{"unit":"celsius","assets":{"refrigerator-1":{"limit":5},"refrigerator-2":{"limit":5},"refrigerated-counter-1":{"limit":5}}}'::jsonb,
	'2026-07-12.1',
	'Første konfigurationsudkast; grænserne afventer virksomhedens faglige godkendelse',
	id
FROM public.actors
WHERE company_id = 'nabo-brejning' AND retired_at IS NULL
ORDER BY created_at
LIMIT 1
ON CONFLICT (id, revision) DO NOTHING;

INSERT INTO public.control_definitions (
	id,
	revision,
	company_id,
	title,
	input_kind,
	status,
	configuration,
	source_catalog_version,
	change_reason,
	created_by
)
SELECT
	'freezer-temperature',
	1,
	'nabo-brejning',
	'Temperatur på frost',
	'measurement',
	'draft',
	'{"unit":"celsius","assets":{"freezer-1":{"limit":-18},"freezer-2":{"limit":-18}}}'::jsonb,
	'2026-07-12.1',
	'Første konfigurationsudkast; grænserne afventer virksomhedens faglige godkendelse',
	id
FROM public.actors
WHERE company_id = 'nabo-brejning' AND retired_at IS NULL
ORDER BY created_at
LIMIT 1
ON CONFLICT (id, revision) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_temperature_completion(
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

	v_definition_id := split_part(p_control_id, ':', 1);
	v_asset_id := split_part(p_control_id, ':', 2);

	IF v_definition_id = '' OR v_asset_id = '' OR split_part(p_control_id, ':', 3) <> '' THEN
		RAISE EXCEPTION 'Invalid configured control id';
	END IF;

	SELECT * INTO v_definition
	FROM public.control_definitions
	WHERE id = v_definition_id
		AND company_id = v_actor.company_id
		AND status IN ('draft', 'active')
	ORDER BY revision DESC
	LIMIT 1;

	IF NOT FOUND OR NOT (v_definition.configuration -> 'assets' ? v_asset_id) THEN
		RAISE EXCEPTION 'Control is not configured for this company';
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

	SELECT id, submitted_at INTO v_completed_id, v_submitted_at
	FROM public.completed_controls
	WHERE company_id = v_actor.company_id AND idempotency_key = p_idempotency_key::text;

	IF FOUND THEN
		RETURN jsonb_build_object(
			'id', v_completed_id,
			'submittedAt', v_submitted_at,
			'alreadyExisted', true
		);
	END IF;

	INSERT INTO public.completed_controls (
		company_id,
		location_id,
		control_definition_id,
		control_definition_revision,
		idempotency_key,
		observed_at,
		submitted_by,
		metadata
	) VALUES (
		v_actor.company_id,
		v_location.id,
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
			'deviationId', v_deviation_id
		)
	);

	RETURN jsonb_build_object(
		'id', v_completed_id,
		'submittedAt', v_submitted_at,
		'deviationId', v_deviation_id,
		'correlationId', v_correlation_id,
		'alreadyExisted', false
	);
END;
$$;

REVOKE ALL ON FUNCTION public.record_temperature_completion(text, text, numeric, boolean, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_temperature_completion(text, text, numeric, boolean, text, timestamptz, uuid) TO authenticated;
