CREATE TYPE "public"."audit_action" AS ENUM('created', 'submitted', 'corrected', 'status_changed', 'approved', 'retired', 'exported');--> statement-breakpoint
CREATE TYPE "public"."completed_control_status" AS ENUM('submitted', 'corrected');--> statement-breakpoint
CREATE TYPE "public"."corrective_action_status" AS ENUM('planned', 'completed', 'verified', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."definition_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."deviation_event_kind" AS ENUM('opened', 'assessment_recorded', 'action_required', 'marked_resolved', 'closed', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."scheduled_control_status" AS ENUM('upcoming', 'due', 'completed', 'missed', 'cancelled');--> statement-breakpoint
CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text,
	"actor_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correlation_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completed_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text NOT NULL,
	"scheduled_control_id" uuid,
	"control_definition_id" text NOT NULL,
	"control_definition_revision" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "completed_control_status" DEFAULT 'submitted' NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_by" uuid NOT NULL,
	"correction_of_id" uuid,
	"correction_reason" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_definitions" (
	"id" text NOT NULL,
	"revision" integer NOT NULL,
	"company_id" text NOT NULL,
	"title" text NOT NULL,
	"input_kind" text NOT NULL,
	"status" "definition_status" DEFAULT 'draft' NOT NULL,
	"configuration" jsonb NOT NULL,
	"source_catalog_version" text NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"change_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corrective_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deviation_id" uuid NOT NULL,
	"description" text NOT NULL,
	"status" "corrective_action_status" NOT NULL,
	"performed_at" timestamp with time zone,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deviation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deviation_id" uuid NOT NULL,
	"kind" "deviation_event_kind" NOT NULL,
	"note" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deviations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text NOT NULL,
	"completed_control_id" uuid NOT NULL,
	"description" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"time_zone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"completed_control_id" uuid NOT NULL,
	"field_id" text NOT NULL,
	"value" numeric(10, 3) NOT NULL,
	"unit" text NOT NULL,
	"measured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"location_id" text NOT NULL,
	"control_definition_id" text NOT NULL,
	"control_definition_revision" integer NOT NULL,
	"occurrence_key" text NOT NULL,
	"local_date" date NOT NULL,
	"window_starts_at" timestamp with time zone,
	"window_ends_at" timestamp with time zone,
	"time_zone" text NOT NULL,
	"status" "scheduled_control_status" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actors" ADD CONSTRAINT "actors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_controls" ADD CONSTRAINT "completed_controls_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_controls" ADD CONSTRAINT "completed_controls_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_controls" ADD CONSTRAINT "completed_controls_scheduled_control_id_scheduled_controls_id_fk" FOREIGN KEY ("scheduled_control_id") REFERENCES "public"."scheduled_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_controls" ADD CONSTRAINT "completed_controls_submitted_by_actors_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_definitions" ADD CONSTRAINT "control_definitions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_definitions" ADD CONSTRAINT "control_definitions_created_by_actors_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_deviation_id_deviations_id_fk" FOREIGN KEY ("deviation_id") REFERENCES "public"."deviations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_performed_by_actors_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_actors_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviation_events" ADD CONSTRAINT "deviation_events_deviation_id_deviations_id_fk" FOREIGN KEY ("deviation_id") REFERENCES "public"."deviations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviation_events" ADD CONSTRAINT "deviation_events_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_completed_control_id_completed_controls_id_fk" FOREIGN KEY ("completed_control_id") REFERENCES "public"."completed_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_opened_by_actors_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_completed_control_id_completed_controls_id_fk" FOREIGN KEY ("completed_control_id") REFERENCES "public"."completed_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_controls" ADD CONSTRAINT "scheduled_controls_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_controls" ADD CONSTRAINT "scheduled_controls_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actors_company_idx" ON "actors" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "audit_events_company_time_idx" ON "audit_events" USING btree ("company_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "completed_controls_idempotency_uidx" ON "completed_controls" USING btree ("company_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "completed_controls_history_idx" ON "completed_controls" USING btree ("location_id","observed_at");--> statement-breakpoint
CREATE INDEX "completed_controls_scheduled_idx" ON "completed_controls" USING btree ("scheduled_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "control_definitions_id_revision_uidx" ON "control_definitions" USING btree ("id","revision");--> statement-breakpoint
CREATE INDEX "control_definitions_company_status_idx" ON "control_definitions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "corrective_actions_deviation_idx" ON "corrective_actions" USING btree ("deviation_id");--> statement-breakpoint
CREATE INDEX "deviation_events_deviation_time_idx" ON "deviation_events" USING btree ("deviation_id","occurred_at");--> statement-breakpoint
CREATE INDEX "deviations_company_opened_idx" ON "deviations" USING btree ("company_id","opened_at");--> statement-breakpoint
CREATE INDEX "deviations_completed_control_idx" ON "deviations" USING btree ("completed_control_id");--> statement-breakpoint
CREATE INDEX "locations_company_idx" ON "locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "measurements_completed_control_idx" ON "measurements" USING btree ("completed_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_controls_occurrence_uidx" ON "scheduled_controls" USING btree ("company_id","occurrence_key");--> statement-breakpoint
CREATE INDEX "scheduled_controls_location_date_status_idx" ON "scheduled_controls" USING btree ("location_id","local_date","status");--> statement-breakpoint

-- Drizzle cannot currently express all revision and self-reference constraints used here.
-- These constraints ensure historical records keep pointing at the exact definition revision.
ALTER TABLE "scheduled_controls"
	ADD CONSTRAINT "scheduled_controls_definition_revision_fk"
	FOREIGN KEY ("control_definition_id", "control_definition_revision")
	REFERENCES "public"."control_definitions"("id", "revision")
	ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_controls"
	ADD CONSTRAINT "completed_controls_definition_revision_fk"
	FOREIGN KEY ("control_definition_id", "control_definition_revision")
	REFERENCES "public"."control_definitions"("id", "revision")
	ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_controls"
	ADD CONSTRAINT "completed_controls_correction_of_id_fk"
	FOREIGN KEY ("correction_of_id")
	REFERENCES "public"."completed_controls"("id")
	ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Submitted evidence is append-only. Corrections are new completed_controls rows linked by
-- correction_of_id; deviation lifecycle changes are appended to deviation_events.
CREATE OR REPLACE FUNCTION "public"."reject_evidence_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Table % is append-only; create a correction or event instead', TG_TABLE_NAME;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "completed_controls_append_only"
	BEFORE UPDATE OR DELETE ON "completed_controls"
	FOR EACH ROW EXECUTE FUNCTION "public"."reject_evidence_mutation"();--> statement-breakpoint
CREATE TRIGGER "measurements_append_only"
	BEFORE UPDATE OR DELETE ON "measurements"
	FOR EACH ROW EXECUTE FUNCTION "public"."reject_evidence_mutation"();--> statement-breakpoint
CREATE TRIGGER "deviations_append_only"
	BEFORE UPDATE OR DELETE ON "deviations"
	FOR EACH ROW EXECUTE FUNCTION "public"."reject_evidence_mutation"();--> statement-breakpoint
CREATE TRIGGER "deviation_events_append_only"
	BEFORE UPDATE OR DELETE ON "deviation_events"
	FOR EACH ROW EXECUTE FUNCTION "public"."reject_evidence_mutation"();--> statement-breakpoint
CREATE TRIGGER "corrective_actions_append_only"
	BEFORE UPDATE OR DELETE ON "corrective_actions"
	FOR EACH ROW EXECUTE FUNCTION "public"."reject_evidence_mutation"();--> statement-breakpoint
CREATE TRIGGER "audit_events_append_only"
	BEFORE UPDATE OR DELETE ON "audit_events"
	FOR EACH ROW EXECUTE FUNCTION "public"."reject_evidence_mutation"();
