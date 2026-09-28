CREATE TEMP TABLE phase1_checks (name TEXT, passed BOOLEAN);
CREATE TEMP TABLE phase1_fixture AS SELECT gen_random_uuid() AS uid, gen_random_uuid() AS pid;
INSERT INTO auth.users(id, raw_user_meta_data) SELECT uid, '{}'::jsonb FROM phase1_fixture;
INSERT INTO public.properties(id,user_id,project_name) SELECT pid,uid,'Phase 1 synthetic fixture' FROM phase1_fixture;
INSERT INTO public.acquisition_costs(property_id) SELECT pid FROM phase1_fixture;
INSERT INTO public.operating_expenses(property_id) SELECT pid FROM phase1_fixture;
INSERT INTO public.financing(property_id) SELECT pid FROM phase1_fixture;

DO $$
DECLARE spec RECORD; bad TEXT; accepted BOOLEAN;
BEGIN
  FOR spec IN SELECT table_name AS tbl,column_name AS col,data_type
    FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('properties','acquisition_costs','operating_expenses','financing')
    AND data_type IN ('numeric','integer')
  LOOP
    FOREACH bad IN ARRAY CASE WHEN spec.data_type='numeric'
      THEN ARRAY['-1','NaN','Infinity','-Infinity','90071992547410']
      ELSE ARRAY['-1'] END
    LOOP
      accepted := false;
      BEGIN
        EXECUTE format('UPDATE public.%I SET %I=%L',spec.tbl,spec.col,bad);
        accepted := true;
      EXCEPTION WHEN check_violation THEN NULL;
      END;
      INSERT INTO phase1_checks VALUES (spec.tbl || '.' || spec.col || ' rejects ' || bad, NOT accepted);
    END LOOP;
    EXECUTE format('UPDATE public.%I SET %I=NULL',spec.tbl,spec.col);
    INSERT INTO phase1_checks VALUES (spec.tbl || '.' || spec.col || ' permits unknown',true);
  END LOOP;
  FOR spec IN SELECT * FROM (VALUES
    ('loan_to_value_percent',101),('annual_interest_rate_percent',31),
    ('loan_tenure_years',0),('loan_tenure_years',51)
  ) AS v(col,bad_value) LOOP
    accepted := false;
    BEGIN
      EXECUTE format('UPDATE public.financing SET %I=%s',spec.col,spec.bad_value);
      accepted := true;
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO phase1_checks VALUES ('financing boundary ' || spec.col || '=' || spec.bad_value,NOT accepted);
  END LOOP;
END $$;

UPDATE public.financing SET loan_to_value_percent=0,annual_interest_rate_percent=0,
  user_provided_monthly_instalment=0,use_user_provided_instalment=true,
  bank_quote_verified=false,financing_notes='Fixture',down_payment=0,calculated_monthly_instalment=0;
INSERT INTO phase1_checks SELECT 'current financing fields preserve confirmed zero',
  loan_to_value_percent=0 AND annual_interest_rate_percent=0 AND user_provided_monthly_instalment=0
  AND use_user_provided_instalment AND down_payment=0 AND calculated_monthly_instalment=0
  FROM public.financing;
SELECT jsonb_build_object('passed',count(*) FILTER(WHERE passed),
  'failed',count(*) FILTER(WHERE NOT passed OR passed IS NULL),
  'checks',jsonb_agg(to_jsonb(phase1_checks))) FROM phase1_checks;
