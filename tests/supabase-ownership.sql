-- Run the ENTIRE file in one database request/transaction as the project owner.
-- With psql: psql "$DATABASE_URL" -X --single-transaction -v ON_ERROR_STOP=1 -f tests/supabase-ownership.sql
-- Requires the application's real migrations. Does not create or alter policies.
-- Creates two temporary auth.users and their trigger-generated profiles.
-- Tests run as anon/authenticated, NOT as the database owner.
-- A deliberate subtransaction rollback removes ALL fixture users and rows,
-- including when a test fails. The final result explicitly checks cleanup.
-- This tests database authorization, not password login or browser behavior.

CREATE TEMP TABLE ownership_audit_results (
  requirement TEXT NOT NULL,
  test_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  detail TEXT
) ON COMMIT DROP;
GRANT INSERT ON ownership_audit_results TO anon, authenticated;

CREATE OR REPLACE FUNCTION pg_temp.audit_query(
  requirement TEXT, label TEXT, statement TEXT, expected_count BIGINT,
  mode TEXT DEFAULT 'count'
) RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  actual BIGINT;
  succeeded BOOLEAN;
  detail TEXT;
BEGIN
  BEGIN
    EXECUTE statement INTO actual;
    succeeded := mode <> 'denied' AND actual = expected_count;
    detail := format('rows=%s; expected=%s', actual, expected_count);
  EXCEPTION WHEN OTHERS THEN
    succeeded := SQLSTATE = '42501' AND mode IN ('denied', 'hidden');
    detail := 'SQLSTATE=' || SQLSTATE;
  END;
  INSERT INTO pg_temp.ownership_audit_results
  VALUES (requirement, label, coalesce(succeeded, false), detail);
END;
$$;

DO $audit$
DECLARE
  a UUID := gen_random_uuid();
  b UUID := gen_random_uuid();
  pa UUID := gen_random_uuid();
  pb UUID := gen_random_uuid();
  ea UUID := gen_random_uuid();
  eb UUID := gen_random_uuid();
  actor UUID;
  victim UUID;
  own_property UUID;
  other_property UUID;
  other_empty UUID;
  descriptor RECORD;
  fixture RECORD;
  own_filter TEXT;
  other_filter TEXT;
  insert_columns TEXT;
  insert_values TEXT;
  field_value TEXT;
  result_rows JSONB;
  residual_count BIGINT;
  property_name_column TEXT;
  privilege_name TEXT;
  role_name TEXT;
BEGIN
  -- The deployed schema renamed name to project_name after the initial migration.
  SELECT attname INTO property_name_column FROM pg_attribute
  WHERE attrelid='public.properties'::regclass AND NOT attisdropped
    AND attname IN ('project_name','name')
  ORDER BY CASE attname WHEN 'project_name' THEN 0 ELSE 1 END LIMIT 1;
  -- Everything in this block, including profiles produced by the auth trigger,
  -- is rolled back before the outer block returns its result rows.
  BEGIN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES
      (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'security-audit-a-' || a || '@example.invalid', now(),
       '{"provider":"email","providers":["email"]}', '{"full_name":"Temporary Audit User A"}', now(), now()),
      (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'security-audit-b-' || b || '@example.invalid', now(),
       '{"provider":"email","providers":["email"]}', '{"full_name":"Temporary Audit User B"}', now(), now());

    PERFORM pg_temp.audit_query('authentication', 'signup trigger creates both profiles',
      format('SELECT count(*) FROM public.profiles WHERE id IN (%L,%L)', a, b), 2);

    -- Positive controls: each real database role must be able to insert its own
    -- property and user configuration before any negative result can count.
    FOR fixture IN SELECT * FROM (VALUES (a,pa,ea), (b,pb,eb)) AS v(uid,pid,empty_id)
    LOOP
      PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',fixture.uid,'role','authenticated')::TEXT, true);
      PERFORM set_config('request.jwt.claim.sub', fixture.uid::TEXT, true);
      SET LOCAL ROLE authenticated;
      PERFORM pg_temp.audit_query('positive control', 'authenticated role and subject ' || fixture.uid,
        format('SELECT count(*) WHERE current_user=''authenticated'' AND auth.uid()=%L::uuid',fixture.uid),1);
      PERFORM pg_temp.audit_query('positive control', 'insert own properties ' || fixture.uid,
        format('WITH r AS (INSERT INTO public.properties (id,user_id,%I) VALUES (%L,%L,''SECURITY AUDIT ONLY''),(%L,%L,''SECURITY AUDIT EMPTY PARENT'') RETURNING id) SELECT count(*) FROM r',
          property_name_column,fixture.pid,fixture.uid,fixture.empty_id,fixture.uid), 2);
      PERFORM pg_temp.audit_query('positive control', 'insert own criteria ' || fixture.uid,
        format('WITH r AS (INSERT INTO public.investment_criteria (user_id,config_version) VALUES (%L,''audit'') RETURNING id) SELECT count(*) FROM r',fixture.uid), 1);
      PERFORM pg_temp.audit_query('positive control', 'insert own scenario ' || fixture.uid,
        format('WITH r AS (INSERT INTO public.scenario_configs (user_id,scenario_name) VALUES (%L,''audit'') RETURNING id) SELECT count(*) FROM r',fixture.uid), 1);
      FOR descriptor IN SELECT unnest(ARRAY['acquisition_costs','operating_expenses','financing']) AS tbl
      LOOP
        PERFORM pg_temp.audit_query('positive control', 'insert own ' || descriptor.tbl || ' ' || fixture.uid,
          format('WITH r AS (INSERT INTO public.%I (property_id) VALUES (%L) RETURNING id) SELECT count(*) FROM r',descriptor.tbl,fixture.pid), 1);
      END LOOP;
      RESET ROLE;
    END LOOP;

    -- Cover all tables, both A -> B and B -> A, including direct queries which
    -- do not use the frontend's owner filtering.
    FOR descriptor IN
      SELECT * FROM (VALUES
        ('profiles','id','full_name','text'),
        ('properties','user_id',property_name_column,'text'),
        ('acquisition_costs','property_id','legal_fees','numeric'),
        ('operating_expenses','property_id','maintenance_monthly','numeric'),
        ('financing','property_id','purchase_price','numeric'),
        ('investment_criteria','user_id','config_version','text'),
        ('scenario_configs','user_id','scenario_name','text')
      ) AS v(tbl,owner_col,field,field_type)
    LOOP
      PERFORM pg_temp.audit_query('6 / database controls', descriptor.tbl || ' has RLS enabled',
        format('SELECT count(*) FROM pg_class WHERE oid=%L::regclass AND relrowsecurity','public.' || descriptor.tbl),1);
      -- Inspect effective privileges without executing destructive table-wide SQL.
      FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
        FOREACH privilege_name IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER'] LOOP
          PERFORM pg_temp.audit_query('table-wide privileges',
            descriptor.tbl || ' denies ' || privilege_name || ' to ' || role_name,
            format('SELECT count(*) WHERE NOT has_table_privilege(%L,%L,%L)',
              role_name,'public.' || descriptor.tbl,privilege_name),1);
        END LOOP;
      END LOOP;
      field_value := CASE WHEN descriptor.field_type = 'numeric' THEN '123' ELSE quote_literal('audit-updated') END;
      FOR fixture IN SELECT * FROM (VALUES (a,b,pa,pb,eb), (b,a,pb,pa,ea)) AS v(uid,other_uid,pid,other_pid,other_empty)
      LOOP
        actor := fixture.uid; victim := fixture.other_uid;
        own_property := fixture.pid; other_property := fixture.other_pid; other_empty := fixture.other_empty;
        own_filter := CASE
          WHEN descriptor.owner_col = 'property_id' THEN format('property_id=%L',own_property)
          WHEN descriptor.tbl = 'properties' THEN format('id=%L',own_property)
          ELSE format('%I=%L',descriptor.owner_col,actor) END;
        other_filter := CASE
          WHEN descriptor.owner_col = 'property_id' THEN format('property_id=%L',other_property)
          WHEN descriptor.tbl = 'properties' THEN format('id=%L',other_property)
          ELSE format('%I=%L',descriptor.owner_col,victim) END;

        PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',actor,'role','authenticated')::TEXT,true);
        PERFORM set_config('request.jwt.claim.sub',actor::TEXT,true);
        SET LOCAL ROLE authenticated;
        PERFORM pg_temp.audit_query('positive control', descriptor.tbl || ' own read ' || actor,
          format('SELECT count(*) FROM public.%I WHERE %s',descriptor.tbl,own_filter),1);
        PERFORM pg_temp.audit_query('positive control', descriptor.tbl || ' own update ' || actor,
          format('WITH r AS (UPDATE public.%I SET %I=%s WHERE %s RETURNING id) SELECT count(*) FROM r',descriptor.tbl,descriptor.field,field_value,own_filter),1);
        PERFORM pg_temp.audit_query('2 / cross-user reads', descriptor.tbl || ' hides other rows from ' || actor,
          format('SELECT count(*) FROM public.%I WHERE %s',descriptor.tbl,other_filter),0);
        PERFORM pg_temp.audit_query('3 / cross-user updates', descriptor.tbl || ' rejects other update by ' || actor,
          format('WITH r AS (UPDATE public.%I SET %I=%s WHERE %s RETURNING id) SELECT count(*) FROM r',descriptor.tbl,descriptor.field,field_value,other_filter),0,'hidden');
        PERFORM pg_temp.audit_query('4 / cross-user deletes', descriptor.tbl || ' rejects other delete by ' || actor,
          format('WITH r AS (DELETE FROM public.%I WHERE %s RETURNING id) SELECT count(*) FROM r',descriptor.tbl,other_filter),0,'hidden');
        PERFORM pg_temp.audit_query('ownership changes', descriptor.tbl || ' rejects owner/parent change by ' || actor,
          format('WITH r AS (UPDATE public.%I SET %I=%L WHERE %s RETURNING id) SELECT count(*) FROM r',descriptor.tbl,descriptor.owner_col,
            CASE WHEN descriptor.owner_col='property_id' THEN other_empty ELSE victim END,own_filter),0,'denied');

        insert_columns := format('%I,%I',descriptor.owner_col,descriptor.field);
        insert_values := format('%L,%s',CASE WHEN descriptor.owner_col='property_id' THEN other_empty ELSE victim END,field_value);
        PERFORM pg_temp.audit_query('5 / forged inserts', descriptor.tbl || ' rejects other owner/parent insert by ' || actor,
          format('WITH r AS (INSERT INTO public.%I (%s) VALUES (%s) RETURNING id) SELECT count(*) FROM r',descriptor.tbl,insert_columns,insert_values),0,'denied');
        IF descriptor.tbl <> 'properties' AND descriptor.tbl <> 'scenario_configs' THEN
          PERFORM pg_temp.audit_query('cross-user upserts', descriptor.tbl || ' rejects other upsert by ' || actor,
            format('WITH r AS (INSERT INTO public.%I (%s) VALUES (%L,%s) ON CONFLICT (%I) DO UPDATE SET %I=EXCLUDED.%I RETURNING id) SELECT count(*) FROM r',
              descriptor.tbl,insert_columns,CASE WHEN descriptor.owner_col='property_id' THEN other_property ELSE victim END,
              field_value,descriptor.owner_col,descriptor.field,descriptor.field),0,'denied');
        END IF;

        -- Check as the victim that attempted deletion did not remove its row.
        RESET ROLE;
        PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',victim,'role','authenticated')::TEXT,true);
        PERFORM set_config('request.jwt.claim.sub',victim::TEXT,true);
        SET LOCAL ROLE authenticated;
        PERFORM pg_temp.audit_query('integrity', descriptor.tbl || ' victim row survives attack by ' || actor,
          format('SELECT count(*) FROM public.%I WHERE %s',descriptor.tbl,other_filter),1);
        RESET ROLE;
      END LOOP;

      -- Anonymous requests use the real anon role and no authenticated subject.
      PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
      PERFORM set_config('request.jwt.claim.sub','',true);
      SET LOCAL ROLE anon;
      PERFORM pg_temp.audit_query('positive control', descriptor.tbl || ' anonymous role has no subject',
        'SELECT count(*) WHERE current_user=''anon'' AND auth.uid() IS NULL',1);
      PERFORM pg_temp.audit_query('1 / anonymous access', descriptor.tbl || ' anonymous read denied',
        format('SELECT count(*) FROM public.%I',descriptor.tbl),0,'hidden');
      PERFORM pg_temp.audit_query('anonymous mutation', descriptor.tbl || ' anonymous update denied',
        format('WITH r AS (UPDATE public.%I SET %I=%s WHERE %s RETURNING id) SELECT count(*) FROM r',descriptor.tbl,descriptor.field,field_value,own_filter),0,'hidden');
      PERFORM pg_temp.audit_query('anonymous mutation', descriptor.tbl || ' anonymous delete denied',
        format('WITH r AS (DELETE FROM public.%I WHERE %s RETURNING id) SELECT count(*) FROM r',descriptor.tbl,own_filter),0,'hidden');
      PERFORM pg_temp.audit_query('anonymous mutation', descriptor.tbl || ' anonymous insert denied',
        format('WITH r AS (INSERT INTO public.%I (%s) VALUES (%s) RETURNING id) SELECT count(*) FROM r',descriptor.tbl,insert_columns,insert_values),0,'denied');
      RESET ROLE;
    END LOOP;

    -- Owner deletion must work too. These only target this run's generated IDs.
    FOR fixture IN SELECT * FROM (VALUES (a,pa,ea), (b,pb,eb)) AS v(uid,pid,empty_id)
    LOOP
      PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',fixture.uid,'role','authenticated')::TEXT,true);
      PERFORM set_config('request.jwt.claim.sub',fixture.uid::TEXT,true);
      SET LOCAL ROLE authenticated;
      FOR descriptor IN SELECT * FROM (VALUES
        ('acquisition_costs','property_id'),('operating_expenses','property_id'),('financing','property_id'),
        ('investment_criteria','user_id'),('scenario_configs','user_id'),('profiles','id')
      ) AS v(tbl,owner_col)
      LOOP
        PERFORM pg_temp.audit_query('positive control',descriptor.tbl || ' own delete ' || fixture.uid,
          format('WITH r AS (DELETE FROM public.%I WHERE %I=%L RETURNING id) SELECT count(*) FROM r',descriptor.tbl,descriptor.owner_col,
            CASE WHEN descriptor.owner_col='property_id' THEN fixture.pid ELSE fixture.uid END),1);
      END LOOP;
      PERFORM pg_temp.audit_query('positive control','properties own delete ' || fixture.uid,
        format('WITH r AS (DELETE FROM public.properties WHERE id IN (%L,%L) RETURNING id) SELECT count(*) FROM r',fixture.pid,fixture.empty_id),2);
      RESET ROLE;
    END LOOP;

    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::JSONB) INTO result_rows FROM pg_temp.ownership_audit_results r;
    -- Variables retain their values across exception rollback; fixture rows do not.
    RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Rollback temporary security audit fixtures';
  EXCEPTION
    WHEN SQLSTATE 'ZX001' THEN NULL;
    WHEN OTHERS THEN
      result_rows := jsonb_build_array(jsonb_build_object(
        'requirement','audit execution','test_name','fixture/setup execution',
        'passed',false,'detail','SQLSTATE=' || SQLSTATE || ': ' || SQLERRM));
  END;

  INSERT INTO pg_temp.ownership_audit_results
  SELECT * FROM jsonb_to_recordset(result_rows) AS r(requirement TEXT,test_name TEXT,passed BOOLEAN,detail TEXT);
  SELECT count(*) INTO residual_count FROM auth.users WHERE id IN (a,b);
  INSERT INTO pg_temp.ownership_audit_results VALUES ('cleanup','temporary Auth accounts removed',residual_count=0,'remaining=' || residual_count);
  SELECT count(*) INTO residual_count FROM public.profiles WHERE id IN (a,b);
  INSERT INTO pg_temp.ownership_audit_results VALUES ('cleanup','temporary profiles removed',residual_count=0,'remaining=' || residual_count);
  SELECT count(*) INTO residual_count FROM public.properties WHERE id IN (pa,pb,ea,eb) OR user_id IN (a,b);
  INSERT INTO pg_temp.ownership_audit_results VALUES ('cleanup','temporary properties removed',residual_count=0,'remaining=' || residual_count);
  FOR descriptor IN SELECT unnest(ARRAY['acquisition_costs','operating_expenses','financing']) AS tbl
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE property_id IN (%L,%L,%L,%L)',descriptor.tbl,pa,pb,ea,eb) INTO residual_count;
    INSERT INTO pg_temp.ownership_audit_results VALUES ('cleanup',descriptor.tbl || ' temporary children removed',residual_count=0,'remaining=' || residual_count);
  END LOOP;
  FOR descriptor IN SELECT unnest(ARRAY['investment_criteria','scenario_configs']) AS tbl
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id IN (%L,%L)',descriptor.tbl,a,b) INTO residual_count;
    INSERT INTO pg_temp.ownership_audit_results VALUES ('cleanup',descriptor.tbl || ' temporary configuration removed',residual_count=0,'remaining=' || residual_count);
  END LOOP;
END;
$audit$;

SELECT requirement, test_name, CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, detail
FROM pg_temp.ownership_audit_results
ORDER BY requirement, test_name;
