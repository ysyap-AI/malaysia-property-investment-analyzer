-- Operating Expenses module — database update
-- Run once in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once. All values are stored on an ANNUAL basis.

ALTER TABLE public.operating_expenses
  ADD COLUMN IF NOT EXISTS annual_maintenance_fee               numeric,
  ADD COLUMN IF NOT EXISTS annual_sinking_fund                  numeric,
  ADD COLUMN IF NOT EXISTS annual_assessment_tax                numeric,
  ADD COLUMN IF NOT EXISTS annual_quit_or_parcel_rent           numeric,
  ADD COLUMN IF NOT EXISTS annual_landlord_insurance            numeric,
  ADD COLUMN IF NOT EXISTS annual_property_management_fee       numeric,
  ADD COLUMN IF NOT EXISTS annual_leasing_agent_fee             numeric,
  ADD COLUMN IF NOT EXISTS annual_tenancy_documentation         numeric,
  ADD COLUMN IF NOT EXISTS annual_repair_reserve                numeric,
  ADD COLUMN IF NOT EXISTS annual_furniture_replacement_reserve numeric,
  ADD COLUMN IF NOT EXISTS annual_cleaning_cost                 numeric,
  ADD COLUMN IF NOT EXISTS annual_vacancy_utilities             numeric,
  ADD COLUMN IF NOT EXISTS annual_bad_debt_allowance            numeric,
  ADD COLUMN IF NOT EXISTS annual_other_operating_expenses      numeric;

-- Amounts may be unknown (NULL = Missing / Not Verified) but never negative.
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY[
    'annual_maintenance_fee','annual_sinking_fund','annual_assessment_tax',
    'annual_quit_or_parcel_rent','annual_landlord_insurance','annual_property_management_fee',
    'annual_leasing_agent_fee','annual_tenancy_documentation','annual_repair_reserve',
    'annual_furniture_replacement_reserve','annual_cleaning_cost','annual_vacancy_utilities',
    'annual_bad_debt_allowance','annual_other_operating_expenses'
  ] LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.operating_expenses ADD CONSTRAINT opex_%1$s_non_negative CHECK (%1$s IS NULL OR %1$s >= 0)',
        c);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- One operating expense record per property.
CREATE UNIQUE INDEX IF NOT EXISTS operating_expenses_property_id_key
  ON public.operating_expenses (property_id);

-- Ownership rules are unchanged: existing Row Level Security policies already
-- restrict these rows to the owner of the parent property.
