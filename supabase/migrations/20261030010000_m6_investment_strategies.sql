-- M6: one nullable strategy plan, no changes to financial or M5 evidence policies.
BEGIN;
CREATE FUNCTION public.m6_exact_keys(v jsonb, keys text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT coalesce(jsonb_typeof(v) = 'object' AND v ?& keys AND v - keys = '{}'::jsonb, false)
$$;
CREATE FUNCTION public.m6_valid_strategy(a jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = pg_catalog AS $$
DECLARE c jsonb; p jsonb; t jsonb; e jsonb; k text; id text; item text; v jsonb;
  base text[] := ARRAY['horizonMonths','restrictionsAcknowledged','targets','evidence'];
  sale text[] := ARRAY['resalePrice','exitCosts','zerosAcknowledged','disposalTax','depositRefund','refundableDepositBasis','settlementAtHorizonConfirmed'];
  keys text[];
  today text := to_char(current_timestamp AT TIME ZONE 'Asia/Kuala_Lumpur','YYYY-MM-DD');
BEGIN
  IF a IS NULL OR a = 'null'::jsonb THEN RETURN true; END IF;
  IF NOT public.m6_exact_keys(a, ARRAY['version','modelVersion','preferredStrategy','common','keep','flip','hybrid']) OR a->'version' IS DISTINCT FROM '1'::jsonb OR a->>'modelVersion' IS DISTINCT FROM 'm6-v1' THEN RETURN false; END IF;
  IF a->'preferredStrategy' <> 'null'::jsonb AND a->>'preferredStrategy' NOT IN ('keep','flip','hybrid') THEN RETURN false; END IF;
  c := a->'common';
  IF NOT public.m6_exact_keys(c,ARRAY['financingMode','fixedAmortisingConfirmed','quotedPaymentConfirmed','initialCostsOutsideHorizon','flatAssumptionsConfirmed','acceptedOn']) OR c->>'financingMode' NOT IN ('unknown','cash','conventional','unsupported') OR jsonb_typeof(c->'financingMode') <> 'string' THEN RETURN false; END IF;
  FOREACH item IN ARRAY ARRAY['fixedAmortisingConfirmed','quotedPaymentConfirmed','initialCostsOutsideHorizon','flatAssumptionsConfirmed'] LOOP
    IF jsonb_typeof(c->item) <> 'boolean' THEN RETURN false; END IF;
  END LOOP;
  IF c->'acceptedOn' <> 'null'::jsonb AND (jsonb_typeof(c->'acceptedOn') <> 'string' OR c->>'acceptedOn' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR c->>'acceptedOn' < '0001-01-01' OR c->>'acceptedOn' > today OR to_char((c->>'acceptedOn')::date,'YYYY-MM-DD') <> c->>'acceptedOn') THEN RETURN false; END IF;
  FOREACH id IN ARRAY ARRAY['keep','flip','hybrid'] LOOP
    p := a->id; keys := base;
    IF id = 'keep' THEN keys := keys || ARRAY['occupiedMonths']; ELSE keys := keys || sale; END IF;
    IF id = 'hybrid' THEN keys := keys || ARRAY['occupiedMonths','nonRentalMonths','rentThroughSaleConfirmed']; END IF;
    IF NOT public.m6_exact_keys(p,keys) OR jsonb_typeof(p->'restrictionsAcknowledged') <> 'boolean' THEN RETURN false; END IF;
    v := p->'horizonMonths';
    IF v <> 'null'::jsonb AND (jsonb_typeof(v) <> 'number' OR (v::text)::numeric NOT BETWEEN 1 AND 120 OR trunc((v::text)::numeric) <> (v::text)::numeric) THEN RETURN false; END IF;
    IF id <> 'flip' THEN
      v := p->'occupiedMonths';
      IF v <> 'null'::jsonb AND (jsonb_typeof(v) <> 'number' OR (v::text)::numeric NOT BETWEEN 0 AND 12) THEN RETURN false; END IF;
    END IF;
    IF id = 'hybrid' THEN
      v := p->'nonRentalMonths';
      IF jsonb_typeof(p->'rentThroughSaleConfirmed') <> 'boolean' OR v <> 'null'::jsonb AND (jsonb_typeof(v) <> 'number' OR (v::text)::numeric NOT BETWEEN 0 AND 120 OR trunc((v::text)::numeric) <> (v::text)::numeric OR p->'horizonMonths' <> 'null'::jsonb AND (v::text)::numeric > (p->>'horizonMonths')::numeric) THEN RETURN false; END IF;
    END IF;
    t := p->'targets';
    IF NOT public.m6_exact_keys(t, ARRAY['minimumMonthlyCashFlow','minimumCashOnCash','minimumProfit','minimumEquityRoi','maximumCashFunded']) THEN RETURN false; END IF;
    FOR k,v IN SELECT * FROM jsonb_each(t) LOOP
      IF v <> 'null'::jsonb AND (jsonb_typeof(v) <> 'number' OR abs((v::text)::numeric) > 1000000000000 OR k = 'maximumCashFunded' AND (v::text)::numeric < 0) THEN RETURN false; END IF;
    END LOOP;
    e := p->'evidence';
    IF jsonb_typeof(e) <> 'object' OR e - ARRAY['horizon','occupancy','leadIn','resalePrice','exitCosts','disposalTax','depositRefund','agentFee','legalFees','serviceTax','redemptionFees','consentOther'] <> '{}'::jsonb THEN RETURN false; END IF;
    FOR k,v IN SELECT * FROM jsonb_each(e) LOOP
      IF jsonb_typeof(v->'valueAtReview') IS DISTINCT FROM 'number' OR v->>'origin' = 'system_estimate' OR NOT public.m5_valid_evidence(jsonb_build_object('version',1,'fields',jsonb_build_object('purchase_price',v)), 'acquisition_costs') THEN RETURN false; END IF;
    END LOOP;
    IF id <> 'keep' THEN
      IF jsonb_typeof(p->'zerosAcknowledged') <> 'boolean' OR jsonb_typeof(p->'settlementAtHorizonConfirmed') <> 'boolean' OR jsonb_typeof(p->'refundableDepositBasis') <> 'string' OR length(p->>'refundableDepositBasis') > 2000 OR btrim(p->>'refundableDepositBasis') <> p->>'refundableDepositBasis' THEN RETURN false; END IF;
      IF NOT public.m6_exact_keys(p->'exitCosts', ARRAY['agentFee','legalFees','serviceTax','redemptionFees','consentOther']) THEN RETURN false; END IF;
      FOR k,v IN SELECT * FROM jsonb_each((p->'exitCosts') || jsonb_build_object('resalePrice',p->'resalePrice','depositRefund',p->'depositRefund')) LOOP
        IF v <> 'null'::jsonb AND (jsonb_typeof(v) <> 'number' OR (v::text)::numeric NOT BETWEEN 0 AND 1000000000000) THEN RETURN false; END IF;
      END LOOP;
      t := p->'disposalTax';
      IF NOT public.m6_exact_keys(t,ARRAY['status','amount','basis']) OR jsonb_typeof(t->'status') <> 'string' OR t->>'status' NOT IN ('unknown','user_estimate','adviser_estimate') OR jsonb_typeof(t->'basis') <> 'string' OR length(t->>'basis') > 2000 OR btrim(t->>'basis') <> t->>'basis' THEN RETURN false; END IF;
      IF t->>'status' = 'unknown' THEN
        IF t->'amount' <> 'null'::jsonb THEN RETURN false; END IF;
      ELSE
        IF jsonb_typeof(t->'amount') IS DISTINCT FROM 'number' OR (t->>'amount')::numeric NOT BETWEEN 0 AND 1000000000000 OR length(t->>'basis') = 0 THEN RETURN false; END IF;
      END IF;
    END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE public.properties ADD COLUMN investment_strategy_assumptions jsonb,
  ADD CONSTRAINT properties_investment_strategy_assumptions_check CHECK (public.m6_valid_strategy(investment_strategy_assumptions));

CREATE OR REPLACE FUNCTION public.m4_write_property(
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
  allowed := array_append(allowed, 'evidence_metadata');
  IF p_table = 'properties' THEN allowed := array_append(allowed, 'investment_strategy_assumptions'); END IF;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR p_values = '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid values' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_values) k WHERE NOT k = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid field' USING ERRCODE = '22023';
  END IF;
  IF p_values ? 'evidence_metadata' AND NOT public.m5_valid_evidence(p_values->'evidence_metadata', p_table) THEN
    RAISE EXCEPTION 'Invalid evidence metadata' USING ERRCODE = '23514';
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
    IF existing_id IS NULL AND p_values - 'evidence_metadata' = '{}'::jsonb THEN
      RAISE EXCEPTION 'Save financial inputs before evidence' USING ERRCODE = '22023';
    END IF;
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



REVOKE ALL ON FUNCTION public.m6_exact_keys(jsonb,text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.m6_valid_strategy(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.m6_exact_keys(jsonb,text[]), public.m6_valid_strategy(jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
