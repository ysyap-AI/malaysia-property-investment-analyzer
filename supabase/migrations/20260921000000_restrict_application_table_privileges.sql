-- Ordinary API roles only need row-level CRUD. TRUNCATE and REFERENCES bypass
-- RLS, and application users must not be allowed to create table triggers.
-- Scope this to the seven audited tables; preserve CRUD and service-role access.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.profiles,
  public.properties,
  public.acquisition_costs,
  public.operating_expenses,
  public.financing,
  public.investment_criteria,
  public.scenario_configs
FROM PUBLIC, anon, authenticated;
