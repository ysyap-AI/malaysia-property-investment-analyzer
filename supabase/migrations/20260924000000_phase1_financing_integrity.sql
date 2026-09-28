-- Reconcile fields already used by the financing form. No inferred financial data.
ALTER TABLE public.financing
  ADD COLUMN IF NOT EXISTS loan_to_value_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_interest_rate_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS user_provided_monthly_instalment NUMERIC,
  ADD COLUMN IF NOT EXISTS use_user_provided_instalment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_quote_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financing_notes TEXT,
  ADD COLUMN IF NOT EXISTS down_payment NUMERIC,
  ADD COLUMN IF NOT EXISTS calculated_monthly_instalment NUMERIC;

-- Enforce financial input validity at the database boundary, including direct REST
-- writes. A bounded numeric comparison also excludes PostgreSQL NaN and infinities.
-- Preserve NULL as unknown and zero as entered. Invalid existing rows stop migration.
DO $$
DECLARE spec RECORD; constraint_name TEXT; lower_bound NUMERIC; upper_bound NUMERIC;
BEGIN
  FOR spec IN
    SELECT table_name AS tbl, column_name AS col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('properties', 'acquisition_costs', 'operating_expenses', 'financing')
      AND data_type IN ('numeric', 'integer')
  LOOP
    lower_bound := 0;
    upper_bound := 90071992547409.91;
    IF spec.col IN ('loan_to_value_percent','deposit_percent') THEN upper_bound := 100;
    ELSIF spec.col IN ('annual_interest_rate_percent','interest_rate_percent') THEN upper_bound := 30;
    ELSIF spec.col = 'loan_tenure_years' THEN lower_bound := 1; upper_bound := 50;
    ELSIF spec.col IN ('bedrooms','bathrooms','car_parks') THEN upper_bound := 50;
    ELSIF spec.col = 'total_floors' THEN lower_bound := 1; upper_bound := 200;
    ELSIF spec.col = 'built_up_sqft' THEN lower_bound := 1;
    ELSIF spec.col = 'lease_expiry_year' THEN lower_bound := 1900; upper_bound := 3000;
    ELSIF spec.col = 'completion_year' THEN lower_bound := 1900; upper_bound := 2100;
    END IF;
    constraint_name := spec.tbl || '_' || spec.col || '_range';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', spec.tbl)::regclass AND conname = constraint_name) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I BETWEEN %s AND %s)',
        spec.tbl, constraint_name, spec.col, spec.col, lower_bound, upper_bound);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
