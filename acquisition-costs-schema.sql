-- Acquisition Costs module — database update
-- Run once in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.

ALTER TABLE public.acquisition_costs
  ADD COLUMN IF NOT EXISTS purchase_price         numeric,
  ADD COLUMN IF NOT EXISTS spa_legal_fee          numeric,
  ADD COLUMN IF NOT EXISTS transfer_stamp_duty    numeric,
  ADD COLUMN IF NOT EXISTS loan_legal_fee         numeric,
  ADD COLUMN IF NOT EXISTS loan_stamp_duty        numeric,
  ADD COLUMN IF NOT EXISTS valuation_fee          numeric,
  ADD COLUMN IF NOT EXISTS renovation_cost        numeric,
  ADD COLUMN IF NOT EXISTS furnishing_cost        numeric,
  ADD COLUMN IF NOT EXISTS utility_deposits       numeric,
  ADD COLUMN IF NOT EXISTS maintenance_deposit    numeric,
  ADD COLUMN IF NOT EXISTS acquisition_agent_fee  numeric,
  ADD COLUMN IF NOT EXISTS initial_holding_cost   numeric,
  ADD COLUMN IF NOT EXISTS contingency_cost       numeric,
  ADD COLUMN IF NOT EXISTS other_cost             numeric;

-- Amounts may be unknown (NULL = Missing / Not Verified) but never negative.
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY[
    'purchase_price','spa_legal_fee','transfer_stamp_duty','loan_legal_fee','loan_stamp_duty',
    'valuation_fee','renovation_cost','furnishing_cost','utility_deposits','maintenance_deposit',
    'acquisition_agent_fee','initial_holding_cost','contingency_cost','other_cost'
  ] LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.acquisition_costs ADD CONSTRAINT acq_%1$s_non_negative CHECK (%1$s IS NULL OR %1$s >= 0)',
        c);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- One acquisition cost record per property.
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_costs_property_id_key
  ON public.acquisition_costs (property_id);

-- Ownership rules are unchanged: existing Row Level Security policies already
-- restrict these rows to the owner of the parent property.
