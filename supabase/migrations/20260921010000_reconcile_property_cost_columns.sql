-- Capture the schema already used by Properties, Acquisition Costs and
-- Operating Expenses. Existing values, ownership, RLS and relationships survive.
-- Do not infer purchase prices or reinterpret legacy monthly/aggregate costs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
             AND table_name='properties' AND column_name='name') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
               AND table_name='properties' AND column_name='project_name') THEN
      RAISE EXCEPTION 'Both name and project_name exist; reconcile explicitly before migration';
    END IF;
    ALTER TABLE public.properties RENAME COLUMN name TO project_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
             AND table_name='properties' AND column_name='address') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
               AND table_name='properties' AND column_name='full_address') THEN
      RAISE EXCEPTION 'Both address and full_address exist; reconcile explicitly before migration';
    END IF;
    ALTER TABLE public.properties RENAME COLUMN address TO full_address;
  END IF;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Malaysia',
  ADD COLUMN IF NOT EXISTS title_type TEXT,
  ADD COLUMN IF NOT EXISTS lease_expiry_year INTEGER,
  ADD COLUMN IF NOT EXISTS completion_year INTEGER,
  ADD COLUMN IF NOT EXISTS developer TEXT,
  ADD COLUMN IF NOT EXISTS car_parks INTEGER,
  ADD COLUMN IF NOT EXISTS floor_level TEXT,
  ADD COLUMN IF NOT EXISTS total_floors INTEGER,
  ADD COLUMN IF NOT EXISTS furnishing_status TEXT,
  ADD COLUMN IF NOT EXISTS unit_condition TEXT,
  ADD COLUMN IF NOT EXISTS target_purchase_price NUMERIC,
  ADD COLUMN IF NOT EXISTS bank_valuation NUMERIC,
  ADD COLUMN IF NOT EXISTS expected_monthly_rent NUMERIC,
  ADD COLUMN IF NOT EXISTS rent_verification_status TEXT DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS property_status TEXT DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'not_started';

ALTER TABLE public.acquisition_costs
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
  ADD COLUMN IF NOT EXISTS spa_legal_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS transfer_stamp_duty NUMERIC,
  ADD COLUMN IF NOT EXISTS loan_legal_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS loan_stamp_duty NUMERIC,
  ADD COLUMN IF NOT EXISTS utility_deposits NUMERIC,
  ADD COLUMN IF NOT EXISTS maintenance_deposit NUMERIC,
  ADD COLUMN IF NOT EXISTS acquisition_agent_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS initial_holding_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS contingency_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS other_cost NUMERIC;

ALTER TABLE public.operating_expenses
  ADD COLUMN IF NOT EXISTS annual_maintenance_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_sinking_fund NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_assessment_tax NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_quit_or_parcel_rent NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_landlord_insurance NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_property_management_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_leasing_agent_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_tenancy_documentation NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_repair_reserve NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_furniture_replacement_reserve NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_cleaning_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_vacancy_utilities NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_bad_debt_allowance NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_other_operating_expenses NUMERIC;

-- Reproduce the CHECK constraints already present in the deployed schema too.
-- Existing invalid data causes a migration error rather than being rewritten.
DO $$
DECLARE spec RECORD; constraint_name TEXT;
BEGIN
  FOR spec IN
    SELECT 'acquisition_costs' AS tbl, unnest(ARRAY[
      'purchase_price','spa_legal_fee','transfer_stamp_duty','loan_legal_fee',
      'loan_stamp_duty','valuation_fee','renovation_cost','furnishing_cost',
      'utility_deposits','maintenance_deposit','acquisition_agent_fee',
      'initial_holding_cost','contingency_cost','other_cost']) AS col
    UNION ALL
    SELECT 'operating_expenses', unnest(ARRAY[
      'annual_maintenance_fee','annual_sinking_fund','annual_assessment_tax',
      'annual_quit_or_parcel_rent','annual_landlord_insurance',
      'annual_property_management_fee','annual_leasing_agent_fee',
      'annual_tenancy_documentation','annual_repair_reserve',
      'annual_furniture_replacement_reserve','annual_cleaning_cost',
      'annual_vacancy_utilities','annual_bad_debt_allowance','annual_other_operating_expenses'])
  LOOP
    constraint_name := spec.tbl || '_' || spec.col || '_check';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=format('public.%I',spec.tbl)::regclass
                   AND conname=constraint_name) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I >= 0)',
        spec.tbl,constraint_name,spec.col,spec.col);
    END IF;
  END LOOP;
  FOR spec IN SELECT * FROM (VALUES
    ('tenure', 'tenure IS NULL OR tenure IN (''freehold'',''leasehold'')'),
    ('rent_verification_status', 'rent_verification_status IN (''verified'',''user-entered'',''estimated'',''listing-data'',''missing'')'),
    ('property_status', 'property_status IN (''prospect'',''analysing'',''watchlist'',''shortlisted'',''purchased'',''rejected'')'),
    ('analysis_status', 'analysis_status IN (''not_started'',''in_progress'',''completed'',''archived'')')
  ) AS v(col,expression) LOOP
    constraint_name := 'properties_' || spec.col || '_check';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.properties'::regclass
                   AND conname=constraint_name) THEN
      EXECUTE format('ALTER TABLE public.properties ADD CONSTRAINT %I CHECK (%s)',
        constraint_name,spec.expression);
    END IF;
  END LOOP;
END $$;

-- Financial columns deliberately have no zero defaults. Legacy columns remain
-- untouched because their allocation to the new categories is not established.
NOTIFY pgrst, 'reload schema';
