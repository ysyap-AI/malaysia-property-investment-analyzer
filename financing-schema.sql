-- Financing module — database update
-- Run once in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.

ALTER TABLE public.financing
  ADD COLUMN IF NOT EXISTS loan_to_value_percent            numeric,
  ADD COLUMN IF NOT EXISTS loan_amount                      numeric,
  ADD COLUMN IF NOT EXISTS down_payment                     numeric,
  ADD COLUMN IF NOT EXISTS annual_interest_rate_percent     numeric,
  ADD COLUMN IF NOT EXISTS loan_tenure_years                integer,
  ADD COLUMN IF NOT EXISTS calculated_monthly_instalment    numeric,
  ADD COLUMN IF NOT EXISTS user_provided_monthly_instalment numeric,
  ADD COLUMN IF NOT EXISTS use_user_provided_instalment     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loan_type                        text,
  ADD COLUMN IF NOT EXISTS financing_notes                  text,
  ADD COLUMN IF NOT EXISTS bank_quote_verified              boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.financing ADD CONSTRAINT financing_ltv_range
    CHECK (loan_to_value_percent IS NULL OR (loan_to_value_percent >= 0 AND loan_to_value_percent <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.financing ADD CONSTRAINT financing_rate_non_negative
    CHECK (annual_interest_rate_percent IS NULL OR annual_interest_rate_percent >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.financing ADD CONSTRAINT financing_tenure_positive
    CHECK (loan_tenure_years IS NULL OR loan_tenure_years > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.financing ADD CONSTRAINT financing_amounts_non_negative
    CHECK ((loan_amount IS NULL OR loan_amount >= 0) AND (down_payment IS NULL OR down_payment >= 0)
      AND (user_provided_monthly_instalment IS NULL OR user_provided_monthly_instalment >= 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS financing_property_id_key ON public.financing (property_id);

-- Ownership rules are unchanged: existing Row Level Security policies restrict
-- these rows to the owner of the parent property.
