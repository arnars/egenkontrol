CREATE TABLE "scheduled_control_omissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text NOT NULL,
	"scheduled_control_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"reason_label" text NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_control_omissions" ADD CONSTRAINT "scheduled_control_omissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_control_omissions" ADD CONSTRAINT "scheduled_control_omissions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_control_omissions" ADD CONSTRAINT "scheduled_control_omissions_scheduled_control_id_scheduled_controls_id_fk" FOREIGN KEY ("scheduled_control_id") REFERENCES "public"."scheduled_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_control_omissions" ADD CONSTRAINT "scheduled_control_omissions_recorded_by_actors_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_control_omissions_schedule_uidx" ON "scheduled_control_omissions" USING btree ("scheduled_control_id");--> statement-breakpoint
CREATE INDEX "scheduled_control_omissions_history_idx" ON "scheduled_control_omissions" USING btree ("location_id","recorded_at");--> statement-breakpoint

ALTER TABLE public.scheduled_control_omissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company members can read scheduled control omissions"
ON public.scheduled_control_omissions FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());--> statement-breakpoint
GRANT SELECT ON TABLE public.scheduled_control_omissions TO authenticated;--> statement-breakpoint

CREATE TRIGGER "scheduled_control_omissions_append_only"
	BEFORE UPDATE OR DELETE ON public.scheduled_control_omissions
	FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_temperature_omission(
	p_scheduled_control_id uuid,
	p_location_id text,
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

	IF p_reason_code !~ '^[a-z][a-z0-9-]{0,63}$'
		OR length(btrim(p_reason_label)) NOT BETWEEN 1 AND 100
		OR length(coalesce(p_note, '')) > 1000 THEN
		RAISE EXCEPTION 'Invalid no-measurement reason';
	END IF;

	SELECT * INTO v_schedule
	FROM public.scheduled_controls
	WHERE id = p_scheduled_control_id
		AND company_id = v_actor.company_id
		AND location_id = v_location.id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Scheduled control is not available to the authenticated actor';
	END IF;

	SELECT * INTO v_omission
	FROM public.scheduled_control_omissions
	WHERE scheduled_control_id = v_schedule.id;

	IF FOUND THEN
		RETURN jsonb_build_object(
			'id', v_omission.id,
			'recordedAt', v_omission.recorded_at,
			'alreadyExisted', true
		);
	END IF;

	IF EXISTS (
		SELECT 1 FROM public.completed_controls
		WHERE scheduled_control_id = v_schedule.id AND correction_of_id IS NULL
	) OR v_schedule.status = 'completed' THEN
		RAISE EXCEPTION 'Scheduled control already has a measurement';
	END IF;

	IF v_schedule.status NOT IN ('upcoming', 'due', 'missed') THEN
		RAISE EXCEPTION 'Scheduled control cannot be omitted from its current status';
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
			'reasonCode', p_reason_code,
			'reasonLabel', btrim(p_reason_label),
			'omissionId', v_omission.id
		)
	);

	RETURN jsonb_build_object(
		'id', v_omission.id,
		'recordedAt', v_omission.recorded_at,
		'correlationId', v_correlation_id,
		'alreadyExisted', false
	);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_temperature_omission(uuid, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_temperature_omission(uuid, text, text, text, text) TO authenticated;
