-- M4: one database-owned revision covers the property and all financial children.
-- Apply only to an explicitly approved environment, together with the M4 client.
BEGIN;
ALTER TABLE public.properties ADD COLUMN revision bigint NOT NULL DEFAULT 1
  CHECK (revision BETWEEN 1 AND 9007199254740991);

CREATE FUNCTION public.m4_property_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.revision := 1;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Property identity is immutable' USING ERRCODE = '23514';
    END IF;
    NEW.revision := OLD.revision + 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER m4_property_revision BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.m4_property_revision();

CREATE FUNCTION public.m4_financial_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE parent_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Financial identity is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN parent_id := OLD.property_id;
  ELSE parent_id := NEW.property_id;
  END IF;
  -- Also covers privileged maintenance writes. During cascade the parent is gone.
  UPDATE public.properties SET revision = revision WHERE id = parent_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER m4_acquisition_revision BEFORE INSERT OR UPDATE OR DELETE ON public.acquisition_costs
  FOR EACH ROW EXECUTE FUNCTION public.m4_financial_revision();
CREATE TRIGGER m4_financing_revision BEFORE INSERT OR UPDATE OR DELETE ON public.financing
  FOR EACH ROW EXECUTE FUNCTION public.m4_financial_revision();
CREATE TRIGGER m4_expenses_revision BEFORE INSERT OR UPDATE OR DELETE ON public.operating_expenses
  FOR EACH ROW EXECUTE FUNCTION public.m4_financial_revision();

-- One statement snapshot: an absent child and its revision are captured together.
-- SECURITY INVOKER retains the existing SELECT RLS policies on all four tables.
CREATE FUNCTION public.m4_property_snapshot(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object('property', to_jsonb(p), 'acquisition_costs', to_jsonb(a),
    'financing', to_jsonb(f), 'operating_expenses', to_jsonb(e))
  FROM public.properties p
  LEFT JOIN public.acquisition_costs a ON a.property_id = p.id
  LEFT JOIN public.financing f ON f.property_id = p.id
  LEFT JOIN public.operating_expenses e ON e.property_id = p.id
  WHERE p.id = p_id AND p.user_id = auth.uid()
$$;

-- Narrow, ownership-checked CAS endpoint. Identifiers come only from fixed allowlists.
-- Definer access is needed because direct API writes are revoked below; RLS remains
-- enabled, and every write requires auth.uid() ownership before touching children.
CREATE FUNCTION public.m4_write_property(
  p_id uuid, p_revision bigint, p_table text, p_values jsonb, p_delete boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  parent public.properties;
  allowed text[];
  cols text;
  vals text;
  assignments text;
  result jsonb;
  existing_id uuid;
BEGIN
  SELECT * INTO parent FROM public.properties
    WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  -- Missing and other-owner records disclose the same result.
  IF NOT FOUND OR p_revision IS NULL OR parent.revision <> p_revision THEN
    RAISE EXCEPTION 'Property changed or unavailable' USING ERRCODE = 'PT409';
  END IF;
  IF p_delete IS TRUE THEN
    IF p_table IS DISTINCT FROM 'properties' OR p_values IS DISTINCT FROM '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid deletion' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.properties WHERE id = p_id AND revision = p_revision;
    RETURN to_jsonb(parent);
  END IF;
  CASE p_table
    WHEN 'properties' THEN allowed := ARRAY[
      'project_name','full_address','postcode','city','district','state','country','property_type',
      'title_type','tenure','lease_expiry_year','completion_year','developer','built_up_sqft',
      'bedrooms','bathrooms','car_parks','floor_level','total_floors','furnishing_status',
      'unit_condition','asking_price','target_purchase_price','bank_valuation',
      'expected_monthly_rent','rent_verification_status','property_status','analysis_status','listing_url','notes'];
    WHEN 'acquisition_costs' THEN allowed := ARRAY[
      'purchase_price','spa_legal_fee','transfer_stamp_duty','loan_legal_fee','loan_stamp_duty',
      'valuation_fee','renovation_cost','furnishing_cost','utility_deposits','maintenance_deposit',
      'acquisition_agent_fee','initial_holding_cost','contingency_cost','other_cost'];
    WHEN 'financing' THEN allowed := ARRAY[
      'loan_to_value_percent','loan_amount','annual_interest_rate_percent','loan_tenure_years',
      'user_provided_monthly_instalment','use_user_provided_instalment','loan_type',
      'financing_notes','bank_quote_verified','down_payment','calculated_monthly_instalment'];
    WHEN 'operating_expenses' THEN allowed := ARRAY[
      'annual_maintenance_fee','annual_sinking_fund','annual_assessment_tax','annual_quit_or_parcel_rent',
      'annual_landlord_insurance','annual_property_management_fee','annual_leasing_agent_fee',
      'annual_tenancy_documentation','annual_repair_reserve','annual_furniture_replacement_reserve',
      'annual_cleaning_cost','annual_vacancy_utilities','annual_bad_debt_allowance','annual_other_operating_expenses'];
    ELSE RAISE EXCEPTION 'Invalid table' USING ERRCODE = '22023';
  END CASE;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR p_values = '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid values' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_values) k WHERE NOT k = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid field' USING ERRCODE = '22023';
  END IF;
  SELECT string_agg(format('%I', k), ',' ORDER BY k),
    string_agg(format('v.%I', k), ',' ORDER BY k),
    string_agg(format('%I = v.%I', k, k), ',' ORDER BY k)
    INTO cols, vals, assignments FROM jsonb_object_keys(p_values) k;
  IF p_table = 'properties' THEN
    EXECUTE format('UPDATE public.properties t SET %s FROM jsonb_populate_record(NULL::public.properties, $1) v WHERE t.id = $2 RETURNING to_jsonb(t)', assignments)
      INTO result USING p_values, p_id;
  ELSE
    -- Parent lock serializes first creation, all edits and deletion. No upsert retry.
    EXECUTE format('SELECT id FROM public.%I WHERE property_id = $1', p_table)
      INTO existing_id USING p_id;
    IF existing_id IS NULL THEN
      EXECUTE format('INSERT INTO public.%I (property_id,%s) SELECT $2,%s FROM jsonb_populate_record(NULL::public.%I, $1) v RETURNING to_jsonb(%I)', p_table, cols, vals, p_table, p_table)
        INTO result USING p_values, p_id;
    ELSE
      EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I, $1) v WHERE t.id = $2 RETURNING to_jsonb(t)', p_table, assignments, p_table)
        INTO result USING p_values, existing_id;
    END IF;
  END IF;
  SELECT revision INTO parent.revision FROM public.properties WHERE id = p_id;
  RETURN jsonb_build_object('record', result, 'revision', parent.revision);
END $$;

REVOKE ALL ON FUNCTION public.m4_property_revision(), public.m4_financial_revision(),
  public.m4_property_snapshot(uuid), public.m4_write_property(uuid,bigint,text,jsonb,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m4_property_snapshot(uuid),
  public.m4_write_property(uuid,bigint,text,jsonb,boolean) TO authenticated;
-- Prevent an older client/direct REST write from bypassing revision checks.
REVOKE UPDATE, DELETE ON public.properties FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.acquisition_costs, public.financing, public.operating_expenses
  FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
