CREATE TABLE "evidence_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"request_id" uuid NOT NULL,
	"correction_reason" text NOT NULL,
	"payload" jsonb NOT NULL,
	"corrected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"corrected_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_corrections" ADD CONSTRAINT "evidence_corrections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_corrections" ADD CONSTRAINT "evidence_corrections_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_corrections" ADD CONSTRAINT "evidence_corrections_corrected_by_actors_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_corrections_company_request_uidx" ON "evidence_corrections" USING btree ("company_id","request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_corrections_source_revision_uidx" ON "evidence_corrections" USING btree ("company_id","source_type","source_id","revision");--> statement-breakpoint
CREATE INDEX "evidence_corrections_source_idx" ON "evidence_corrections" USING btree ("source_type","source_id","revision");--> statement-breakpoint
CREATE INDEX "evidence_corrections_history_idx" ON "evidence_corrections" USING btree ("location_id","corrected_at");
--> statement-breakpoint

ALTER TABLE public.evidence_corrections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "company members can read evidence corrections"
ON public.evidence_corrections FOR SELECT TO authenticated
USING (company_id = public.current_actor_company_id());
--> statement-breakpoint
GRANT SELECT ON TABLE public.evidence_corrections TO authenticated;
--> statement-breakpoint
CREATE TRIGGER "evidence_corrections_append_only"
	BEFORE UPDATE OR DELETE ON public.evidence_corrections
	FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
--> statement-breakpoint

CREATE FUNCTION public.record_evidence_correction(
	p_location_id text,
	p_source_type text,
	p_source_id uuid,
	p_payload jsonb,
	p_correction_reason text,
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
	v_existing public.evidence_corrections%ROWTYPE;
	v_correction public.evidence_corrections%ROWTYPE;
	v_revision integer;
	v_correlation_id uuid := gen_random_uuid();
BEGIN
	SELECT * INTO v_actor FROM public.actors
	WHERE id = auth.uid() AND retired_at IS NULL;
	IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user is not an active actor'; END IF;

	SELECT * INTO v_location FROM public.locations
	WHERE id = p_location_id AND company_id = v_actor.company_id AND active;
	IF NOT FOUND THEN RAISE EXCEPTION 'Location is not available to the authenticated actor'; END IF;

	SELECT * INTO v_existing FROM public.evidence_corrections
	WHERE company_id = v_actor.company_id AND request_id = p_request_id;
	IF FOUND THEN
		RETURN jsonb_build_object('id', v_existing.id, 'revision', v_existing.revision, 'alreadyExisted', true);
	END IF;

	IF p_source_type NOT IN ('completed_control', 'scheduled_control_omission', 'operational_event') THEN
		RAISE EXCEPTION 'Unsupported evidence source type';
	END IF;
	IF length(btrim(p_correction_reason)) NOT BETWEEN 3 AND 500 THEN
		RAISE EXCEPTION 'Correction reason must contain between 3 and 500 characters';
	END IF;
	IF jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::text) > 20000 THEN
		RAISE EXCEPTION 'Correction payload must be a reasonably sized object';
	END IF;

	CASE p_source_type
		WHEN 'completed_control' THEN
			PERFORM 1 FROM public.completed_controls
			WHERE id = p_source_id AND company_id = v_actor.company_id
				AND location_id = v_location.id FOR UPDATE;
		WHEN 'scheduled_control_omission' THEN
			PERFORM 1 FROM public.scheduled_control_omissions
			WHERE id = p_source_id AND company_id = v_actor.company_id
				AND location_id = v_location.id FOR UPDATE;
		WHEN 'operational_event' THEN
			PERFORM 1 FROM public.operational_events
			WHERE id = p_source_id AND company_id = v_actor.company_id
				AND location_id = v_location.id AND event_type IN ('receiving', 'pest') FOR UPDATE;
	END CASE;
	IF NOT FOUND THEN RAISE EXCEPTION 'Evidence source is not available to the authenticated actor'; END IF;

	SELECT coalesce(max(revision), 0) + 1 INTO v_revision
	FROM public.evidence_corrections
	WHERE company_id = v_actor.company_id
		AND source_type = p_source_type AND source_id = p_source_id;

	INSERT INTO public.evidence_corrections (
		company_id, location_id, source_type, source_id, revision, request_id,
		correction_reason, payload, corrected_by
	) VALUES (
		v_actor.company_id, v_location.id, p_source_type, p_source_id, v_revision,
		p_request_id, btrim(p_correction_reason), p_payload, v_actor.id
	) RETURNING * INTO v_correction;

	INSERT INTO public.audit_events (
		company_id, location_id, actor_id, action, entity_type, entity_id,
		correlation_id, metadata
	) VALUES (
		v_actor.company_id, v_location.id, v_actor.id, 'corrected', p_source_type,
		p_source_id::text, v_correlation_id,
		jsonb_build_object('correctionId', v_correction.id, 'revision', v_revision)
	);

	RETURN jsonb_build_object(
		'id', v_correction.id,
		'revision', v_correction.revision,
		'correctedAt', v_correction.corrected_at,
		'alreadyExisted', false
	);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_evidence_correction(text, text, uuid, jsonb, text, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_evidence_correction(text, text, uuid, jsonb, text, uuid) TO authenticated;
