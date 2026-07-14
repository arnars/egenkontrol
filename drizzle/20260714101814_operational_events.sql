CREATE TABLE "operational_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text NOT NULL,
	"scheduled_control_id" uuid,
	"control_definition_id" text,
	"control_definition_revision" integer,
	"event_type" text NOT NULL,
	"event_kind" text NOT NULL,
	"request_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_scheduled_control_id_scheduled_controls_id_fk" FOREIGN KEY ("scheduled_control_id") REFERENCES "public"."scheduled_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_recorded_by_actors_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "operational_events_company_request_uidx" ON "operational_events" USING btree ("company_id","request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operational_events_schedule_kind_uidx" ON "operational_events" USING btree ("scheduled_control_id","event_kind") WHERE "operational_events"."scheduled_control_id" is not null;--> statement-breakpoint
CREATE INDEX "operational_events_history_idx" ON "operational_events" USING btree ("location_id","observed_at");--> statement-breakpoint
CREATE INDEX "operational_events_schedule_idx" ON "operational_events" USING btree ("scheduled_control_id");
--> statement-breakpoint

ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "company members can read operational events"
ON public.operational_events FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());
--> statement-breakpoint
GRANT SELECT ON TABLE public.operational_events TO authenticated;
--> statement-breakpoint
CREATE TRIGGER "operational_events_append_only"
	BEFORE UPDATE OR DELETE ON public.operational_events
	FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
--> statement-breakpoint

INSERT INTO public.control_definitions (
	id, revision, company_id, title, input_kind, status, configuration,
	source_catalog_version, change_reason, created_by
)
SELECT definition.id, 1, 'nabo-brejning', definition.title, definition.input_kind,
	'draft', definition.configuration, '2026-07-14.1',
	'Ugentlig procesdokumentation; frekvens og grænser afventer virksomhedens faglige godkendelse',
	actor.id
FROM public.actors AS actor
CROSS JOIN (
	VALUES
		('heating-core-temperature', 'Opvarmning', 'measurement', '{"minimumTemperature":75,"unit":"celsius","documentationFrequency":{"kind":"weekly","targetCount":1}}'::jsonb),
		('cooling-time-temperature', 'Nedkøling', 'measurement', '{"fromTemperature":56,"toTemperature":10,"maximumDurationMinutes":240,"unit":"celsius","documentationFrequency":{"kind":"weekly","targetCount":1}}'::jsonb),
		('hot-holding-temperature', 'Varmholdelse', 'measurement', '{"minimumTemperature":56,"unit":"celsius","documentationFrequency":{"kind":"weekly","targetCount":1}}'::jsonb),
		('receiving-check', 'Kontrol ved varemodtagelse', 'event', '{"eventType":"delivery","documentationFrequency":{"kind":"deviations_only"}}'::jsonb)
) AS definition(id, title, input_kind, configuration)
WHERE actor.company_id = 'nabo-brejning' AND actor.retired_at IS NULL
ORDER BY actor.created_at
LIMIT 4
ON CONFLICT (id, revision) DO NOTHING;
--> statement-breakpoint

CREATE FUNCTION public.materialize_weekly_process_controls(
	p_location_id text,
	p_week_starts_on date
)
RETURNS TABLE (
	scheduled_control_id uuid,
	definition_id text,
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
	v_definition_id text;
	v_occurrence_key text;
	v_inserted_id uuid;
	v_today date;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor FROM public.actors
	WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;

	SELECT * INTO v_location FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;
	IF NOT FOUND THEN RAISE EXCEPTION 'Location is not available to the authenticated actor'; END IF;

	v_today := (now() AT TIME ZONE v_location.time_zone)::date;
	IF extract(isodow FROM p_week_starts_on) <> 1
		OR p_week_starts_on < v_today - 14
		OR p_week_starts_on > v_today + 14 THEN
		RAISE EXCEPTION 'Week start must be a nearby Monday';
	END IF;

	FOREACH v_definition_id IN ARRAY ARRAY[
		'heating-core-temperature', 'cooling-time-temperature', 'hot-holding-temperature'
	]
	LOOP
		SELECT * INTO v_definition FROM public.control_definitions
		WHERE id = v_definition_id AND company_id = v_actor.company_id
			AND status IN ('draft', 'active')
		ORDER BY revision DESC LIMIT 1;
		IF NOT FOUND THEN RAISE EXCEPTION 'Process control definition is not configured'; END IF;

		v_occurrence_key := v_definition_id || ':week:' || p_week_starts_on::text;
		v_inserted_id := NULL;
		INSERT INTO public.scheduled_controls (
			company_id, location_id, control_definition_id, control_definition_revision,
			occurrence_key, local_date, window_starts_at, window_ends_at, time_zone, status
		) VALUES (
			v_actor.company_id, v_location.id, v_definition.id, v_definition.revision,
			v_occurrence_key, p_week_starts_on,
			p_week_starts_on::timestamp AT TIME ZONE v_location.time_zone,
			(p_week_starts_on + 7)::timestamp AT TIME ZONE v_location.time_zone,
			v_location.time_zone,
			CASE WHEN p_week_starts_on > v_today THEN 'upcoming'::public.scheduled_control_status ELSE 'due'::public.scheduled_control_status END
		)
		ON CONFLICT DO NOTHING RETURNING id INTO v_inserted_id;

		IF v_inserted_id IS NOT NULL THEN
			INSERT INTO public.audit_events (
				company_id, location_id, actor_id, action, entity_type, entity_id,
				correlation_id, metadata
			) VALUES (
				v_actor.company_id, v_location.id, v_actor.id, 'created', 'scheduled_control',
				v_inserted_id::text, v_correlation_id,
				jsonb_build_object('occurrenceKey', v_occurrence_key, 'frequency', 'weekly')
			);
		END IF;
	END LOOP;

	RETURN QUERY
	SELECT scheduled.id, scheduled.control_definition_id, scheduled.occurrence_key, scheduled.status
	FROM public.scheduled_controls AS scheduled
	WHERE scheduled.company_id = v_actor.company_id
		AND scheduled.location_id = v_location.id
		AND scheduled.occurrence_key LIKE '%:week:' || p_week_starts_on::text
		AND scheduled.control_definition_id = ANY(ARRAY[
			'heating-core-temperature', 'cooling-time-temperature', 'hot-holding-temperature'
		]);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.materialize_weekly_process_controls(text, date) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.materialize_weekly_process_controls(text, date) TO authenticated;
--> statement-breakpoint

CREATE FUNCTION public.attach_documented_deviation(
	p_completed_id uuid,
	p_description text,
	p_corrective_action text,
	p_actor_id uuid,
	p_company_id text,
	p_location_id text,
	p_correlation_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
	v_deviation_id uuid;
	v_action_id uuid;
BEGIN
	INSERT INTO public.deviations (
		company_id, location_id, completed_control_id, description, opened_by
	) VALUES (
		p_company_id, p_location_id, p_completed_id, btrim(p_description), p_actor_id
	) RETURNING id INTO v_deviation_id;

	INSERT INTO public.deviation_events (deviation_id, kind, note, actor_id)
	VALUES (v_deviation_id, 'opened', btrim(p_description), p_actor_id);

	INSERT INTO public.corrective_actions (
		deviation_id, description, status, performed_at, performed_by, created_by
	) VALUES (
		v_deviation_id, btrim(p_corrective_action), 'completed', now(), p_actor_id, p_actor_id
	) RETURNING id INTO v_action_id;

	INSERT INTO public.deviation_events (deviation_id, kind, note, actor_id)
	VALUES (v_deviation_id, 'assessment_recorded', btrim(p_corrective_action), p_actor_id);

	INSERT INTO public.audit_events (
		company_id, location_id, actor_id, action, entity_type, entity_id,
		correlation_id, metadata
	) VALUES (
		p_company_id, p_location_id, p_actor_id, 'created', 'corrective_action',
		v_action_id::text, p_correlation_id,
		jsonb_build_object('deviationId', v_deviation_id, 'completedControlId', p_completed_id)
	);

	RETURN v_deviation_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.attach_documented_deviation(uuid, text, text, uuid, text, text, uuid) FROM PUBLIC;
--> statement-breakpoint

CREATE FUNCTION public.record_weekly_process_completion(
	p_scheduled_control_id uuid,
	p_location_id text,
	p_product text,
	p_value numeric,
	p_observed_at timestamptz,
	p_deviation_description text,
	p_corrective_action text,
	p_request_id uuid
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
	v_definition public.control_definitions%ROWTYPE;
	v_completed public.completed_controls%ROWTYPE;
	v_limit numeric;
	v_is_deviation boolean;
	v_field_id text;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor FROM public.actors WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;
	SELECT * INTO v_location FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;
	IF NOT FOUND THEN RAISE EXCEPTION 'Location is not available to the authenticated actor'; END IF;

	SELECT * INTO v_completed FROM public.completed_controls
	WHERE company_id = v_actor.company_id AND idempotency_key = p_request_id::text;
	IF FOUND THEN RETURN jsonb_build_object('id', v_completed.id, 'alreadyExisted', true); END IF;

	SELECT * INTO v_schedule FROM public.scheduled_controls
	WHERE id = p_scheduled_control_id AND company_id = v_actor.company_id
		AND location_id = v_location.id FOR UPDATE;
	IF NOT FOUND THEN RAISE EXCEPTION 'Scheduled control is not available'; END IF;
	IF v_schedule.control_definition_id NOT IN ('heating-core-temperature', 'hot-holding-temperature')
		OR v_schedule.status NOT IN ('upcoming', 'due', 'missed') THEN
		RAISE EXCEPTION 'Scheduled process control cannot be completed';
	END IF;
	IF EXISTS (SELECT 1 FROM public.scheduled_control_omissions WHERE scheduled_control_id = v_schedule.id)
		OR EXISTS (SELECT 1 FROM public.completed_controls WHERE scheduled_control_id = v_schedule.id AND correction_of_id IS NULL) THEN
		RAISE EXCEPTION 'Scheduled process control already has an outcome';
	END IF;

	SELECT * INTO v_definition FROM public.control_definitions
	WHERE id = v_schedule.control_definition_id
		AND revision = v_schedule.control_definition_revision
		AND company_id = v_actor.company_id;
	IF NOT FOUND THEN RAISE EXCEPTION 'Process control definition is not available'; END IF;

	IF length(btrim(p_product)) NOT BETWEEN 1 AND 120 OR p_value < -100 OR p_value > 200 THEN
		RAISE EXCEPTION 'Invalid process measurement';
	END IF;
	v_limit := (v_definition.configuration ->> 'minimumTemperature')::numeric;
	v_is_deviation := p_value < v_limit;
	IF v_is_deviation AND (
		nullif(btrim(p_deviation_description), '') IS NULL
		OR nullif(btrim(p_corrective_action), '') IS NULL
	) THEN RAISE EXCEPTION 'Deviation and corrective action are required'; END IF;

	INSERT INTO public.completed_controls (
		company_id, location_id, scheduled_control_id, control_definition_id,
		control_definition_revision, idempotency_key, observed_at, submitted_by, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_schedule.id, v_definition.id,
		v_definition.revision, p_request_id::text, p_observed_at, v_actor.id,
		jsonb_build_object('configuredControlId', v_definition.id, 'product', btrim(p_product))
	) RETURNING * INTO v_completed;

	v_field_id := CASE WHEN v_definition.id = 'heating-core-temperature'
		THEN 'measuredCoreTemperature' ELSE 'measuredTemperature' END;
	INSERT INTO public.measurements (completed_control_id, field_id, value, unit, measured_at)
	VALUES (v_completed.id, v_field_id, p_value, 'celsius', p_observed_at);

	IF v_is_deviation THEN
		PERFORM public.attach_documented_deviation(
			v_completed.id, p_deviation_description, p_corrective_action, v_actor.id,
			v_actor.company_id, v_location.id, v_correlation_id
		);
	END IF;

	UPDATE public.scheduled_controls SET status = 'completed' WHERE id = v_schedule.id;
	INSERT INTO public.audit_events (
		company_id, location_id, actor_id, action, entity_type, entity_id,
		correlation_id, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_actor.id, 'submitted', 'completed_control',
		v_completed.id::text, v_correlation_id,
		jsonb_build_object('scheduledControlId', v_schedule.id, 'deviation', v_is_deviation)
	);

	RETURN jsonb_build_object('id', v_completed.id, 'submittedAt', v_completed.submitted_at, 'alreadyExisted', false);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_weekly_process_completion(uuid, text, text, numeric, timestamptz, text, text, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_weekly_process_completion(uuid, text, text, numeric, timestamptz, text, text, uuid) TO authenticated;
--> statement-breakpoint

CREATE FUNCTION public.start_weekly_cooling_control(
	p_scheduled_control_id uuid,
	p_location_id text,
	p_product text,
	p_batch_date date,
	p_start_temperature numeric,
	p_started_at timestamptz,
	p_request_id uuid
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
	v_event public.operational_events%ROWTYPE;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor FROM public.actors WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;
	SELECT * INTO v_location FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;
	IF NOT FOUND THEN RAISE EXCEPTION 'Location is not available to the authenticated actor'; END IF;

	SELECT * INTO v_event FROM public.operational_events
	WHERE company_id = v_actor.company_id AND request_id = p_request_id;
	IF FOUND THEN RETURN jsonb_build_object('id', v_event.id, 'alreadyExisted', true); END IF;

	SELECT * INTO v_schedule FROM public.scheduled_controls
	WHERE id = p_scheduled_control_id AND company_id = v_actor.company_id
		AND location_id = v_location.id FOR UPDATE;
	IF NOT FOUND OR v_schedule.control_definition_id <> 'cooling-time-temperature'
		OR v_schedule.status NOT IN ('upcoming', 'due', 'missed') THEN
		RAISE EXCEPTION 'Scheduled cooling control cannot be started';
	END IF;
	IF EXISTS (SELECT 1 FROM public.scheduled_control_omissions WHERE scheduled_control_id = v_schedule.id)
		OR EXISTS (SELECT 1 FROM public.completed_controls WHERE scheduled_control_id = v_schedule.id AND correction_of_id IS NULL) THEN
		RAISE EXCEPTION 'Scheduled cooling control already has an outcome';
	END IF;
	IF length(btrim(p_product)) NOT BETWEEN 1 AND 120 OR p_start_temperature < -100
		OR p_start_temperature > 200 THEN RAISE EXCEPTION 'Invalid cooling start'; END IF;

	INSERT INTO public.operational_events (
		company_id, location_id, scheduled_control_id, control_definition_id,
		control_definition_revision, event_type, event_kind, request_id,
		observed_at, recorded_by, payload
	) VALUES (
		v_actor.company_id, v_location.id, v_schedule.id, v_schedule.control_definition_id,
		v_schedule.control_definition_revision, 'cooling', 'cooling_started', p_request_id,
		p_started_at, v_actor.id,
		jsonb_build_object('product', btrim(p_product), 'batchDate', p_batch_date, 'startTemperature', p_start_temperature)
	) RETURNING * INTO v_event;

	INSERT INTO public.audit_events (
		company_id, location_id, actor_id, action, entity_type, entity_id,
		correlation_id, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_actor.id, 'created', 'operational_event',
		v_event.id::text, v_correlation_id,
		jsonb_build_object('eventKind', 'cooling_started', 'scheduledControlId', v_schedule.id)
	);
	RETURN jsonb_build_object('id', v_event.id, 'recordedAt', v_event.recorded_at, 'alreadyExisted', false);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.start_weekly_cooling_control(uuid, text, text, date, numeric, timestamptz, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.start_weekly_cooling_control(uuid, text, text, date, numeric, timestamptz, uuid) TO authenticated;
--> statement-breakpoint

CREATE FUNCTION public.complete_weekly_cooling_control(
	p_scheduled_control_id uuid,
	p_location_id text,
	p_end_temperature numeric,
	p_completed_at timestamptz,
	p_deviation_description text,
	p_corrective_action text,
	p_request_id uuid
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
	v_definition public.control_definitions%ROWTYPE;
	v_start public.operational_events%ROWTYPE;
	v_event public.operational_events%ROWTYPE;
	v_completed public.completed_controls%ROWTYPE;
	v_start_temperature numeric;
	v_maximum_minutes integer;
	v_to_temperature numeric;
	v_duration_minutes integer;
	v_is_deviation boolean;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor FROM public.actors WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;
	SELECT * INTO v_location FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;
	IF NOT FOUND THEN RAISE EXCEPTION 'Location is not available to the authenticated actor'; END IF;

	SELECT * INTO v_completed FROM public.completed_controls
	WHERE company_id = v_actor.company_id AND idempotency_key = p_request_id::text;
	IF FOUND THEN RETURN jsonb_build_object('id', v_completed.id, 'alreadyExisted', true); END IF;

	SELECT * INTO v_schedule FROM public.scheduled_controls
	WHERE id = p_scheduled_control_id AND company_id = v_actor.company_id
		AND location_id = v_location.id FOR UPDATE;
	IF NOT FOUND OR v_schedule.control_definition_id <> 'cooling-time-temperature'
		OR v_schedule.status NOT IN ('upcoming', 'due', 'missed') THEN
		RAISE EXCEPTION 'Scheduled cooling control cannot be completed';
	END IF;
	IF EXISTS (SELECT 1 FROM public.scheduled_control_omissions WHERE scheduled_control_id = v_schedule.id)
		OR EXISTS (SELECT 1 FROM public.completed_controls WHERE scheduled_control_id = v_schedule.id AND correction_of_id IS NULL) THEN
		RAISE EXCEPTION 'Scheduled cooling control already has an outcome';
	END IF;

	SELECT * INTO v_start FROM public.operational_events
	WHERE scheduled_control_id = v_schedule.id AND event_kind = 'cooling_started';
	IF NOT FOUND THEN RAISE EXCEPTION 'Cooling control has not been started'; END IF;
	IF p_completed_at <= v_start.observed_at OR p_end_temperature < -100 OR p_end_temperature > 200 THEN
		RAISE EXCEPTION 'Invalid cooling completion';
	END IF;

	SELECT * INTO v_definition FROM public.control_definitions
	WHERE id = v_schedule.control_definition_id AND revision = v_schedule.control_definition_revision
		AND company_id = v_actor.company_id;
	v_start_temperature := (v_start.payload ->> 'startTemperature')::numeric;
	v_to_temperature := (v_definition.configuration ->> 'toTemperature')::numeric;
	v_maximum_minutes := (v_definition.configuration ->> 'maximumDurationMinutes')::integer;
	v_duration_minutes := floor(extract(epoch FROM (p_completed_at - v_start.observed_at)) / 60)::integer;
	v_is_deviation := p_end_temperature > v_to_temperature OR v_duration_minutes > v_maximum_minutes;
	IF v_is_deviation AND (
		nullif(btrim(p_deviation_description), '') IS NULL
		OR nullif(btrim(p_corrective_action), '') IS NULL
	) THEN RAISE EXCEPTION 'Deviation and corrective action are required'; END IF;

	INSERT INTO public.completed_controls (
		company_id, location_id, scheduled_control_id, control_definition_id,
		control_definition_revision, idempotency_key, observed_at, submitted_by, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_schedule.id, v_definition.id,
		v_definition.revision, p_request_id::text, p_completed_at, v_actor.id,
		jsonb_build_object(
			'configuredControlId', v_definition.id,
			'product', v_start.payload ->> 'product',
			'batchDate', v_start.payload ->> 'batchDate',
			'durationMinutes', v_duration_minutes
		)
	) RETURNING * INTO v_completed;

	INSERT INTO public.measurements (completed_control_id, field_id, value, unit, measured_at)
	VALUES
		(v_completed.id, 'startTemperature', v_start_temperature, 'celsius', v_start.observed_at),
		(v_completed.id, 'endTemperature', p_end_temperature, 'celsius', p_completed_at);

	INSERT INTO public.operational_events (
		company_id, location_id, scheduled_control_id, control_definition_id,
		control_definition_revision, event_type, event_kind, request_id,
		observed_at, recorded_by, payload
	) VALUES (
		v_actor.company_id, v_location.id, v_schedule.id, v_definition.id,
		v_definition.revision, 'cooling', 'cooling_completed', p_request_id,
		p_completed_at, v_actor.id,
		jsonb_build_object('endTemperature', p_end_temperature, 'durationMinutes', v_duration_minutes)
	) RETURNING * INTO v_event;

	IF v_is_deviation THEN
		PERFORM public.attach_documented_deviation(
			v_completed.id, p_deviation_description, p_corrective_action, v_actor.id,
			v_actor.company_id, v_location.id, v_correlation_id
		);
	END IF;

	UPDATE public.scheduled_controls SET status = 'completed' WHERE id = v_schedule.id;
	INSERT INTO public.audit_events (
		company_id, location_id, actor_id, action, entity_type, entity_id,
		correlation_id, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_actor.id, 'submitted', 'completed_control',
		v_completed.id::text, v_correlation_id,
		jsonb_build_object('scheduledControlId', v_schedule.id, 'coolingStartEventId', v_start.id, 'deviation', v_is_deviation)
	);
	RETURN jsonb_build_object('id', v_completed.id, 'submittedAt', v_completed.submitted_at, 'alreadyExisted', false);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.complete_weekly_cooling_control(uuid, text, numeric, timestamptz, text, text, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.complete_weekly_cooling_control(uuid, text, numeric, timestamptz, text, text, uuid) TO authenticated;
--> statement-breakpoint

CREATE FUNCTION public.record_weekly_process_not_relevant(
	p_scheduled_control_id uuid,
	p_location_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_actor public.actors%ROWTYPE;
	v_schedule public.scheduled_controls%ROWTYPE;
BEGIN
	SELECT * INTO v_actor FROM public.actors WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;
	SELECT * INTO v_schedule FROM public.scheduled_controls
	WHERE id = p_scheduled_control_id AND company_id = v_actor.company_id
		AND location_id = p_location_id FOR UPDATE;
	IF NOT FOUND OR v_schedule.control_definition_id NOT IN (
		'heating-core-temperature', 'cooling-time-temperature', 'hot-holding-temperature'
	) THEN RAISE EXCEPTION 'Scheduled process control is not available'; END IF;
	IF EXISTS (
		SELECT 1 FROM public.operational_events
		WHERE scheduled_control_id = v_schedule.id AND event_kind = 'cooling_started'
	) THEN RAISE EXCEPTION 'An active cooling control cannot be marked not relevant'; END IF;
	RETURN public.record_temperature_omission(
		v_schedule.id, p_location_id, 'not-relevant-this-week', 'Ikke relevant i denne uge', NULL
	);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_weekly_process_not_relevant(uuid, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_weekly_process_not_relevant(uuid, text) TO authenticated;
--> statement-breakpoint

CREATE FUNCTION public.record_operational_incident(
	p_location_id text,
	p_event_kind text,
	p_payload jsonb,
	p_observed_at timestamptz,
	p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_actor public.actors%ROWTYPE;
	v_location public.locations%ROWTYPE;
	v_event public.operational_events%ROWTYPE;
	v_definition public.control_definitions%ROWTYPE;
	v_event_type text;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor FROM public.actors WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;
	SELECT * INTO v_location FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;
	IF NOT FOUND THEN RAISE EXCEPTION 'Location is not available to the authenticated actor'; END IF;

	SELECT * INTO v_event FROM public.operational_events
	WHERE company_id = v_actor.company_id AND request_id = p_request_id;
	IF FOUND THEN RETURN jsonb_build_object('id', v_event.id, 'alreadyExisted', true); END IF;
	IF jsonb_typeof(p_payload) <> 'object' OR pg_column_size(p_payload) > 20000 THEN
		RAISE EXCEPTION 'Invalid operational event payload';
	END IF;

	IF p_event_kind = 'receiving_deviation' THEN
		v_event_type := 'receiving';
		IF length(btrim(p_payload ->> 'supplier')) NOT BETWEEN 1 AND 120
			OR length(btrim(p_payload ->> 'deliveryReference')) NOT BETWEEN 1 AND 120
			OR length(btrim(p_payload ->> 'issueLabel')) NOT BETWEEN 1 AND 120
			OR length(btrim(p_payload ->> 'actionLabel')) NOT BETWEEN 1 AND 200
			OR length(btrim(p_payload ->> 'assessment')) NOT BETWEEN 1 AND 1000 THEN
			RAISE EXCEPTION 'Invalid receiving deviation';
		END IF;
		SELECT * INTO v_definition FROM public.control_definitions
		WHERE id = 'receiving-check' AND company_id = v_actor.company_id
		ORDER BY revision DESC LIMIT 1;
	ELSIF p_event_kind = 'pest_incident' THEN
		v_event_type := 'pest';
		IF length(btrim(p_payload ->> 'areaLabel')) NOT BETWEEN 1 AND 120
			OR length(btrim(p_payload ->> 'incidentLabel')) NOT BETWEEN 1 AND 120
			OR length(btrim(p_payload ->> 'observation')) NOT BETWEEN 1 AND 1000
			OR (p_payload ->> 'productImpact') NOT IN ('yes', 'no', 'unknown')
			OR jsonb_typeof(p_payload -> 'actions') <> 'array' THEN
			RAISE EXCEPTION 'Invalid pest incident';
		END IF;
	ELSE
		RAISE EXCEPTION 'Unsupported operational event kind';
	END IF;

	INSERT INTO public.operational_events (
		company_id, location_id, control_definition_id, control_definition_revision,
		event_type, event_kind, request_id, observed_at, recorded_by, payload
	) VALUES (
		v_actor.company_id, v_location.id, v_definition.id, v_definition.revision,
		v_event_type, p_event_kind, p_request_id, p_observed_at, v_actor.id, p_payload
	) RETURNING * INTO v_event;

	INSERT INTO public.audit_events (
		company_id, location_id, actor_id, action, entity_type, entity_id,
		correlation_id, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_actor.id, 'submitted', 'operational_event',
		v_event.id::text, v_correlation_id, jsonb_build_object('eventKind', p_event_kind)
	);
	RETURN jsonb_build_object('id', v_event.id, 'recordedAt', v_event.recorded_at, 'alreadyExisted', false);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_operational_incident(text, text, jsonb, timestamptz, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_operational_incident(text, text, jsonb, timestamptz, uuid) TO authenticated;
