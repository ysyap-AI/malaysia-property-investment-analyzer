-- M5: additive section evidence, qualified only on the disposable local database.
BEGIN;
CREATE FUNCTION public.m5_valid_evidence(metadata jsonb, section text) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = pg_catalog AS $$
DECLARE allowed text[]; field text; entry jsonb; item text; value jsonb; inputs jsonb; context jsonb;
  today text := to_char(current_timestamp AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD');
BEGIN
  IF metadata IS NULL OR metadata = 'null'::jsonb THEN RETURN true; END IF;
  CASE section
    WHEN 'properties' THEN allowed := ARRAY['expected_monthly_rent','asking_price','target_purchase_price','bank_valuation','full_address'];
    WHEN 'acquisition_costs' THEN allowed := ARRAY['purchase_price','spa_legal_fee','transfer_stamp_duty','loan_legal_fee','loan_stamp_duty','valuation_fee','renovation_cost','furnishing_cost','utility_deposits','maintenance_deposit','acquisition_agent_fee','initial_holding_cost','contingency_cost','other_cost'];
    WHEN 'financing' THEN allowed := ARRAY['loan_amount','annual_interest_rate_percent','loan_tenure_years','loan_to_value_percent','user_provided_monthly_instalment'];
    WHEN 'operating_expenses' THEN allowed := ARRAY['annual_maintenance_fee','annual_sinking_fund','annual_assessment_tax','annual_quit_or_parcel_rent','annual_landlord_insurance','annual_property_management_fee','annual_leasing_agent_fee','annual_tenancy_documentation','annual_repair_reserve','annual_furniture_replacement_reserve','annual_cleaning_cost','annual_vacancy_utilities','annual_bad_debt_allowance','annual_other_operating_expenses'];
    ELSE RETURN false;
  END CASE;
  IF jsonb_typeof(metadata) <> 'object' OR metadata->'version' IS DISTINCT FROM '1'::jsonb OR jsonb_typeof(metadata->'fields') IS DISTINCT FROM 'object'
    OR metadata - ARRAY['version','fields'] <> '{}'::jsonb THEN RETURN false; END IF;
  FOR field, entry IN SELECT * FROM jsonb_each(metadata->'fields') LOOP
    IF NOT field = ANY(allowed) OR jsonb_typeof(entry) <> 'object'
      OR NOT entry ?& ARRAY['origin','valueAtReview','sourceLabel','sourceUrl','notes','observedOn','verifiedOn','estimate']
      OR entry - ARRAY['origin','valueAtReview','sourceLabel','sourceUrl','notes','observedOn','verifiedOn','estimate'] <> '{}'::jsonb
      OR entry->>'origin' NOT IN ('user_assumption','system_estimate','external_observation','verified_actual')
      OR jsonb_typeof(entry->'origin') <> 'string' THEN RETURN false; END IF;
    value := entry->'valueAtReview';
    IF value <> 'null'::jsonb THEN
      IF field = 'full_address' THEN
        IF jsonb_typeof(value) <> 'string' OR length(entry->>'valueAtReview') NOT BETWEEN 1 AND 2000 OR length(btrim(entry->>'valueAtReview')) = 0 THEN RETURN false; END IF;
      ELSE
        IF jsonb_typeof(value) <> 'number' OR (value::text)::numeric < 0 OR (value::text)::numeric > 90071992547409.91 THEN RETURN false; END IF;
        IF field = 'loan_to_value_percent' AND (value::text)::numeric > 100 OR field = 'annual_interest_rate_percent' AND (value::text)::numeric > 30
          OR field = 'loan_tenure_years' AND ((value::text)::numeric NOT BETWEEN 1 AND 50 OR trunc((value::text)::numeric) <> (value::text)::numeric) THEN RETURN false; END IF;
      END IF;
    END IF;
    FOREACH item IN ARRAY ARRAY['sourceLabel','sourceUrl','notes'] LOOP
      IF entry->item <> 'null'::jsonb AND (jsonb_typeof(entry->item) <> 'string' OR btrim(entry->>item) <> entry->>item OR length(entry->>item) > CASE item WHEN 'sourceLabel' THEN 120 WHEN 'sourceUrl' THEN 2048 ELSE 2000 END) THEN RETURN false; END IF;
    END LOOP;
    IF entry->'sourceUrl' <> 'null'::jsonb AND (entry->>'sourceUrl' !~* '^https?://[^/@[:space:]:?#]+(:[0-9]+)?([/?#][^[:space:]]*)?$') THEN RETURN false; END IF;
    FOREACH item IN ARRAY ARRAY['observedOn','verifiedOn'] LOOP
      IF entry->item <> 'null'::jsonb THEN
        IF jsonb_typeof(entry->item) <> 'string' OR entry->>item !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR entry->>item < '0001-01-01' OR entry->>item > today OR to_char((entry->>item)::date,'YYYY-MM-DD') <> entry->>item THEN RETURN false; END IF;
      END IF;
    END LOOP;
    IF entry->>'origin' IN ('external_observation','verified_actual') AND (coalesce(entry->>'sourceLabel','') = '' OR entry->>'observedOn' IS NULL) THEN RETURN false; END IF;
    IF entry->>'origin' = 'verified_actual' AND (value = 'null'::jsonb OR entry->>'verifiedOn' IS NULL OR coalesce(entry->>'notes','') = '' OR entry->>'verifiedOn' < entry->>'observedOn') THEN RETURN false; END IF;
    context := entry->'estimate';
    IF entry->>'origin' <> 'system_estimate' THEN
      IF context <> 'null'::jsonb THEN RETURN false; END IF;
    ELSE
      IF section <> 'acquisition_costs' OR field NOT IN ('spa_legal_fee','transfer_stamp_duty','loan_legal_fee','loan_stamp_duty') OR jsonb_typeof(value) <> 'number'
        OR jsonb_typeof(context) <> 'object' OR NOT context ?& ARRAY['rulesVersion','inputFingerprint','inputs'] OR context - ARRAY['rulesVersion','inputFingerprint','inputs'] <> '{}'::jsonb THEN RETURN false; END IF;
      FOREACH item IN ARRAY ARRAY['rulesVersion','inputFingerprint'] LOOP
        IF jsonb_typeof(context->item) <> 'string' OR length(context->>item) NOT BETWEEN 1 AND (CASE item WHEN 'rulesVersion' THEN 120 ELSE 2048 END) OR btrim(context->>item) <> context->>item THEN RETURN false; END IF;
      END LOOP;
      inputs := context->'inputs';
      IF jsonb_typeof(inputs) <> 'object' OR NOT inputs ?& ARRAY['scopeConfirmed','purchasePrice','marketValue','usePriceAsMarketProxy','financing','loanToValuePercent','loanAmount','financingAvailable']
        OR inputs - ARRAY['scopeConfirmed','purchasePrice','marketValue','usePriceAsMarketProxy','financing','loanToValuePercent','loanAmount','financingAvailable'] <> '{}'::jsonb
        OR jsonb_typeof(inputs->'financing') <> 'string' OR inputs->>'financing' NOT IN ('unknown','cash','conventional','unsupported') THEN RETURN false; END IF;
      FOREACH item IN ARRAY ARRAY['scopeConfirmed','usePriceAsMarketProxy','financingAvailable'] LOOP
        IF jsonb_typeof(inputs->item) <> 'boolean' THEN RETURN false; END IF;
      END LOOP;
      FOREACH item IN ARRAY ARRAY['purchasePrice','marketValue','loanToValuePercent','loanAmount'] LOOP
        IF inputs->item <> 'null'::jsonb AND (jsonb_typeof(inputs->item) <> 'number' OR (inputs->>item)::numeric < 0 OR (inputs->>item)::numeric > 90071992547409.91 OR item = 'loanToValuePercent' AND (inputs->>item)::numeric > 100) THEN RETURN false; END IF;
      END LOOP;
      IF (context->>'inputFingerprint')::jsonb IS DISTINCT FROM jsonb_build_array(context->>'rulesVersion', inputs->'scopeConfirmed', inputs->'purchasePrice', inputs->'marketValue', inputs->'usePriceAsMarketProxy', inputs->'financing', inputs->'loanToValuePercent', inputs->'loanAmount', inputs->'financingAvailable') THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE public.properties ADD COLUMN evidence_metadata jsonb, ADD CONSTRAINT properties_evidence_metadata_check CHECK (public.m5_valid_evidence(evidence_metadata, 'properties'));
ALTER TABLE public.acquisition_costs ADD COLUMN evidence_metadata jsonb, ADD CONSTRAINT acquisition_costs_evidence_metadata_check CHECK (public.m5_valid_evidence(evidence_metadata, 'acquisition_costs'));
ALTER TABLE public.financing ADD COLUMN evidence_metadata jsonb, ADD CONSTRAINT financing_evidence_metadata_check CHECK (public.m5_valid_evidence(evidence_metadata, 'financing'));
ALTER TABLE public.operating_expenses ADD COLUMN evidence_metadata jsonb, ADD CONSTRAINT operating_expenses_evidence_metadata_check CHECK (public.m5_valid_evidence(evidence_metadata, 'operating_expenses'));
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


REVOKE ALL ON FUNCTION public.m5_valid_evidence(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.m5_valid_evidence(jsonb,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
