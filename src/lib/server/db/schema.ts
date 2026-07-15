import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

export const definitionStatus = pgEnum('definition_status', ['draft', 'active', 'retired']);
export const scheduledControlStatus = pgEnum('scheduled_control_status', [
	'upcoming',
	'due',
	'completed',
	'missed',
	'cancelled'
]);
export const completedControlStatus = pgEnum('completed_control_status', [
	'submitted',
	'corrected'
]);
export const deviationEventKind = pgEnum('deviation_event_kind', [
	'opened',
	'assessment_recorded',
	'action_required',
	'marked_resolved',
	'closed',
	'reopened'
]);
export const correctiveActionStatus = pgEnum('corrective_action_status', [
	'planned',
	'completed',
	'verified',
	'cancelled'
]);
export const auditAction = pgEnum('audit_action', [
	'created',
	'submitted',
	'corrected',
	'status_changed',
	'approved',
	'retired',
	'exported'
]);

export const companies = pgTable('companies', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const locations = pgTable(
	'locations',
	{
		id: text('id').primaryKey(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		name: text('name').notNull(),
		timeZone: text('time_zone').notNull(),
		active: boolean('active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('locations_company_idx').on(table.companyId)]
);

export const actors = pgTable(
	'actors',
	{
		id: uuid('id').primaryKey(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		displayName: text('display_name').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		retiredAt: timestamp('retired_at', { withTimezone: true })
	},
	(table) => [index('actors_company_idx').on(table.companyId)]
);

export const controlDefinitions = pgTable(
	'control_definitions',
	{
		id: text('id').notNull(),
		revision: integer('revision').notNull(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		title: text('title').notNull(),
		inputKind: text('input_kind').notNull(),
		status: definitionStatus('status').notNull().default('draft'),
		configuration: jsonb('configuration').notNull(),
		sourceCatalogVersion: text('source_catalog_version').notNull(),
		validFrom: timestamp('valid_from', { withTimezone: true }),
		validTo: timestamp('valid_to', { withTimezone: true }),
		changeReason: text('change_reason').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => actors.id)
	},
	(table) => [
		uniqueIndex('control_definitions_id_revision_uidx').on(table.id, table.revision),
		index('control_definitions_company_status_idx').on(table.companyId, table.status)
	]
);

export const scheduledControls = pgTable(
	'scheduled_controls',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		controlDefinitionId: text('control_definition_id').notNull(),
		controlDefinitionRevision: integer('control_definition_revision').notNull(),
		occurrenceKey: text('occurrence_key').notNull(),
		localDate: date('local_date').notNull(),
		windowStartsAt: timestamp('window_starts_at', { withTimezone: true }),
		windowEndsAt: timestamp('window_ends_at', { withTimezone: true }),
		timeZone: text('time_zone').notNull(),
		status: scheduledControlStatus('status').notNull().default('upcoming'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('scheduled_controls_occurrence_uidx').on(table.companyId, table.occurrenceKey),
		index('scheduled_controls_location_date_status_idx').on(
			table.locationId,
			table.localDate,
			table.status
		)
	]
);

export const completedControls = pgTable(
	'completed_controls',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		scheduledControlId: uuid('scheduled_control_id').references(() => scheduledControls.id),
		controlDefinitionId: text('control_definition_id').notNull(),
		controlDefinitionRevision: integer('control_definition_revision').notNull(),
		idempotencyKey: text('idempotency_key').notNull(),
		status: completedControlStatus('status').notNull().default('submitted'),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
		submittedBy: uuid('submitted_by')
			.notNull()
			.references(() => actors.id),
		correctionOfId: uuid('correction_of_id'),
		correctionReason: text('correction_reason'),
		notes: text('notes'),
		metadata: jsonb('metadata')
			.notNull()
			.default(sql`'{}'::jsonb`)
	},
	(table) => [
		uniqueIndex('completed_controls_idempotency_uidx').on(table.companyId, table.idempotencyKey),
		uniqueIndex('completed_controls_scheduled_original_uidx')
			.on(table.scheduledControlId)
			.where(sql`${table.scheduledControlId} is not null and ${table.correctionOfId} is null`),
		index('completed_controls_history_idx').on(table.locationId, table.observedAt),
		index('completed_controls_scheduled_idx').on(table.scheduledControlId)
	]
);

export const scheduledControlOmissions = pgTable(
	'scheduled_control_omissions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		scheduledControlId: uuid('scheduled_control_id')
			.notNull()
			.references(() => scheduledControls.id),
		reasonCode: text('reason_code').notNull(),
		reasonLabel: text('reason_label').notNull(),
		note: text('note'),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
		recordedBy: uuid('recorded_by')
			.notNull()
			.references(() => actors.id)
	},
	(table) => [
		uniqueIndex('scheduled_control_omissions_schedule_uidx').on(table.scheduledControlId),
		index('scheduled_control_omissions_history_idx').on(table.locationId, table.recordedAt)
	]
);

export const operationalEvents = pgTable(
	'operational_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		scheduledControlId: uuid('scheduled_control_id').references(() => scheduledControls.id),
		controlDefinitionId: text('control_definition_id'),
		controlDefinitionRevision: integer('control_definition_revision'),
		eventType: text('event_type').notNull(),
		eventKind: text('event_kind').notNull(),
		requestId: uuid('request_id').notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
		recordedBy: uuid('recorded_by')
			.notNull()
			.references(() => actors.id),
		payload: jsonb('payload')
			.notNull()
			.default(sql`'{}'::jsonb`)
	},
	(table) => [
		uniqueIndex('operational_events_company_request_uidx').on(table.companyId, table.requestId),
		uniqueIndex('operational_events_schedule_kind_uidx')
			.on(table.scheduledControlId, table.eventKind)
			.where(sql`${table.scheduledControlId} is not null`),
		index('operational_events_history_idx').on(table.locationId, table.observedAt),
		index('operational_events_schedule_idx').on(table.scheduledControlId)
	]
);

export const evidenceCorrections = pgTable(
	'evidence_corrections',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		sourceType: text('source_type').notNull(),
		sourceId: uuid('source_id').notNull(),
		revision: integer('revision').notNull(),
		requestId: uuid('request_id').notNull(),
		correctionReason: text('correction_reason').notNull(),
		payload: jsonb('payload').notNull(),
		correctedAt: timestamp('corrected_at', { withTimezone: true }).notNull().defaultNow(),
		correctedBy: uuid('corrected_by')
			.notNull()
			.references(() => actors.id)
	},
	(table) => [
		uniqueIndex('evidence_corrections_company_request_uidx').on(table.companyId, table.requestId),
		uniqueIndex('evidence_corrections_source_revision_uidx').on(
			table.companyId,
			table.sourceType,
			table.sourceId,
			table.revision
		),
		index('evidence_corrections_source_idx').on(table.sourceType, table.sourceId, table.revision),
		index('evidence_corrections_history_idx').on(table.locationId, table.correctedAt)
	]
);

export const measurements = pgTable(
	'measurements',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		completedControlId: uuid('completed_control_id')
			.notNull()
			.references(() => completedControls.id),
		fieldId: text('field_id').notNull(),
		value: numeric('value', { precision: 10, scale: 3, mode: 'number' }).notNull(),
		unit: text('unit').notNull(),
		measuredAt: timestamp('measured_at', { withTimezone: true }).notNull()
	},
	(table) => [index('measurements_completed_control_idx').on(table.completedControlId)]
);

export const deviations = pgTable(
	'deviations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		completedControlId: uuid('completed_control_id')
			.notNull()
			.references(() => completedControls.id),
		description: text('description').notNull(),
		openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
		openedBy: uuid('opened_by')
			.notNull()
			.references(() => actors.id)
	},
	(table) => [
		index('deviations_company_opened_idx').on(table.companyId, table.openedAt),
		index('deviations_completed_control_idx').on(table.completedControlId)
	]
);

export const deviationEvents = pgTable(
	'deviation_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviationId: uuid('deviation_id')
			.notNull()
			.references(() => deviations.id),
		kind: deviationEventKind('kind').notNull(),
		note: text('note').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		actorId: uuid('actor_id')
			.notNull()
			.references(() => actors.id)
	},
	(table) => [index('deviation_events_deviation_time_idx').on(table.deviationId, table.occurredAt)]
);

export const correctiveActions = pgTable(
	'corrective_actions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviationId: uuid('deviation_id')
			.notNull()
			.references(() => deviations.id),
		description: text('description').notNull(),
		status: correctiveActionStatus('status').notNull(),
		performedAt: timestamp('performed_at', { withTimezone: true }),
		performedBy: uuid('performed_by').references(() => actors.id),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => actors.id)
	},
	(table) => [index('corrective_actions_deviation_idx').on(table.deviationId)]
);

export const auditEvents = pgTable(
	'audit_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id),
		locationId: text('location_id').references(() => locations.id),
		actorId: uuid('actor_id')
			.notNull()
			.references(() => actors.id),
		action: auditAction('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		correlationId: uuid('correlation_id').notNull(),
		metadata: jsonb('metadata')
			.notNull()
			.default(sql`'{}'::jsonb`)
	},
	(table) => [
		index('audit_events_company_time_idx').on(table.companyId, table.occurredAt),
		index('audit_events_entity_idx').on(table.entityType, table.entityId)
	]
);
