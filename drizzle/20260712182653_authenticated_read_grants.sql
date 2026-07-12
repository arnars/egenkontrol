GRANT SELECT ON TABLE
	public.companies,
	public.locations,
	public.actors,
	public.control_definitions,
	public.scheduled_controls,
	public.completed_controls,
	public.measurements,
	public.deviations,
	public.deviation_events,
	public.corrective_actions,
	public.audit_events
TO authenticated;
