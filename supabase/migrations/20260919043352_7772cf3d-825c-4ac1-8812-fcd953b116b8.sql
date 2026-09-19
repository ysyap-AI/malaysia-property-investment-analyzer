-- Helper: keeps updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, contact_email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PROPERTIES
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  state TEXT,
  property_type TEXT,
  tenure TEXT,
  built_up_sqft NUMERIC,
  bedrooms INTEGER,
  bathrooms INTEGER,
  asking_price NUMERIC,
  listing_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX properties_user_id_idx ON public.properties(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_select_own" ON public.properties FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "properties_insert_own" ON public.properties FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "properties_update_own" ON public.properties FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "properties_delete_own" ON public.properties FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER properties_set_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ownership helper for child records
CREATE OR REPLACE FUNCTION public.owns_property(_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = _property_id AND p.user_id = auth.uid()
  );
$$;

-- ACQUISITION COSTS
CREATE TABLE public.acquisition_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  legal_fees NUMERIC,
  stamp_duty NUMERIC,
  valuation_fee NUMERIC,
  agent_fee NUMERIC,
  renovation_cost NUMERIC,
  furnishing_cost NUMERIC,
  other_costs NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_costs TO authenticated;
GRANT ALL ON public.acquisition_costs TO service_role;
ALTER TABLE public.acquisition_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acquisition_costs_select_own" ON public.acquisition_costs FOR SELECT TO authenticated USING (public.owns_property(property_id));
CREATE POLICY "acquisition_costs_insert_own" ON public.acquisition_costs FOR INSERT TO authenticated WITH CHECK (public.owns_property(property_id));
CREATE POLICY "acquisition_costs_update_own" ON public.acquisition_costs FOR UPDATE TO authenticated USING (public.owns_property(property_id)) WITH CHECK (public.owns_property(property_id));
CREATE POLICY "acquisition_costs_delete_own" ON public.acquisition_costs FOR DELETE TO authenticated USING (public.owns_property(property_id));
CREATE TRIGGER acquisition_costs_set_updated_at BEFORE UPDATE ON public.acquisition_costs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPERATING EXPENSES
CREATE TABLE public.operating_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  management_fee_monthly NUMERIC,
  maintenance_monthly NUMERIC,
  sinking_fund_monthly NUMERIC,
  quit_rent_annual NUMERIC,
  assessment_annual NUMERIC,
  insurance_annual NUMERIC,
  utilities_monthly NUMERIC,
  other_monthly NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operating_expenses TO authenticated;
GRANT ALL ON public.operating_expenses TO service_role;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operating_expenses_select_own" ON public.operating_expenses FOR SELECT TO authenticated USING (public.owns_property(property_id));
CREATE POLICY "operating_expenses_insert_own" ON public.operating_expenses FOR INSERT TO authenticated WITH CHECK (public.owns_property(property_id));
CREATE POLICY "operating_expenses_update_own" ON public.operating_expenses FOR UPDATE TO authenticated USING (public.owns_property(property_id)) WITH CHECK (public.owns_property(property_id));
CREATE POLICY "operating_expenses_delete_own" ON public.operating_expenses FOR DELETE TO authenticated USING (public.owns_property(property_id));
CREATE TRIGGER operating_expenses_set_updated_at BEFORE UPDATE ON public.operating_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FINANCING
CREATE TABLE public.financing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  purchase_price NUMERIC,
  deposit_percent NUMERIC,
  deposit_amount NUMERIC,
  loan_amount NUMERIC,
  interest_rate_percent NUMERIC,
  loan_tenure_years INTEGER,
  loan_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financing TO authenticated;
GRANT ALL ON public.financing TO service_role;
ALTER TABLE public.financing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financing_select_own" ON public.financing FOR SELECT TO authenticated USING (public.owns_property(property_id));
CREATE POLICY "financing_insert_own" ON public.financing FOR INSERT TO authenticated WITH CHECK (public.owns_property(property_id));
CREATE POLICY "financing_update_own" ON public.financing FOR UPDATE TO authenticated USING (public.owns_property(property_id)) WITH CHECK (public.owns_property(property_id));
CREATE POLICY "financing_delete_own" ON public.financing FOR DELETE TO authenticated USING (public.owns_property(property_id));
CREATE TRIGGER financing_set_updated_at BEFORE UPDATE ON public.financing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INVESTMENT CRITERIA (per user)
CREATE TABLE public.investment_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  min_gross_yield_percent NUMERIC,
  min_net_yield_percent NUMERIC,
  min_cash_on_cash_percent NUMERIC,
  max_break_even_occupancy_percent NUMERIC,
  weight_yield NUMERIC,
  weight_cash_flow NUMERIC,
  weight_risk NUMERIC,
  weight_data_confidence NUMERIC,
  config_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_criteria TO authenticated;
GRANT ALL ON public.investment_criteria TO service_role;
ALTER TABLE public.investment_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investment_criteria_select_own" ON public.investment_criteria FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "investment_criteria_insert_own" ON public.investment_criteria FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investment_criteria_update_own" ON public.investment_criteria FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investment_criteria_delete_own" ON public.investment_criteria FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER investment_criteria_set_updated_at BEFORE UPDATE ON public.investment_criteria FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCENARIO CONFIGURATION (per user)
CREATE TABLE public.scenario_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  rent_adjustment_percent NUMERIC,
  vacancy_rate_percent NUMERIC,
  expense_adjustment_percent NUMERIC,
  interest_rate_adjustment_percent NUMERIC,
  config_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scenario_name)
);
CREATE INDEX scenario_configs_user_id_idx ON public.scenario_configs(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenario_configs TO authenticated;
GRANT ALL ON public.scenario_configs TO service_role;
ALTER TABLE public.scenario_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenario_configs_select_own" ON public.scenario_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scenario_configs_insert_own" ON public.scenario_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scenario_configs_update_own" ON public.scenario_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scenario_configs_delete_own" ON public.scenario_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER scenario_configs_set_updated_at BEFORE UPDATE ON public.scenario_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();