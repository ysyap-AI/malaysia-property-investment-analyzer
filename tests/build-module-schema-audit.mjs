// Generate a rollback-only PostgreSQL test for an EMPTY local Supabase schema.
// Run with psql -X -v ON_ERROR_STOP=1. Never reset an existing application schema.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = join(root, "supabase/migrations");
const target = "20260921010000_reconcile_property_cost_columns.sql";
const files = readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
if (!process.argv[2] || !files.includes(target)) throw new Error("Missing reconciliation migration; supply an output SQL path");
const baseline = files.filter((file) => file < target).map((file) => readFileSync(join(directory, file), "utf8")).join("\n");
const migration = readFileSync(join(directory, target), "utf8");
writeFileSync(process.argv[2], `
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public') THEN
    RAISE EXCEPTION 'Requires empty public schema: refusing to touch application tables';
  END IF;
END $$;
${baseline}
CREATE TEMP TABLE fixture AS SELECT gen_random_uuid() AS uid, gen_random_uuid() AS pid;
INSERT INTO auth.users(id,raw_user_meta_data) SELECT uid,'{}'::jsonb FROM fixture;
INSERT INTO public.properties(id,user_id,name,address,asking_price)
  SELECT pid,uid,'Legacy fixture','Preserved address',0 FROM fixture;
INSERT INTO public.acquisition_costs(property_id,legal_fees,valuation_fee)
  SELECT pid,500,0 FROM fixture;
INSERT INTO public.operating_expenses(property_id,maintenance_monthly,utilities_monthly)
  SELECT pid,250,NULL FROM fixture;

${migration}
-- A project with already-aligned columns must also be supported, without data loss.
${migration}

CREATE TEMP TABLE module_checks(name text, passed boolean);
INSERT INTO module_checks VALUES
  ('renamed property values and explicit zero survive',
    (SELECT project_name='Legacy fixture' AND full_address='Preserved address' AND asking_price=0
     FROM public.properties WHERE id=(SELECT pid FROM fixture))),
  ('legacy acquisition costs survive and no purchase price is fabricated',
    (SELECT legal_fees=500 AND valuation_fee=0 AND purchase_price IS NULL AND spa_legal_fee IS NULL
     FROM public.acquisition_costs WHERE property_id=(SELECT pid FROM fixture))),
  ('legacy monthly expenses are not silently relabelled as annual',
    (SELECT maintenance_monthly=250 AND utilities_monthly IS NULL AND annual_maintenance_fee IS NULL
     FROM public.operating_expenses WHERE property_id=(SELECT pid FROM fixture))),
  ('all three tables retain RLS',
    (SELECT count(*)=3 FROM pg_class WHERE oid IN ('public.properties'::regclass,
      'public.acquisition_costs'::regclass,'public.operating_expenses'::regclass) AND relrowsecurity)),
  ('all twelve ownership policies survive',
    (SELECT count(*)=12 FROM pg_policies WHERE schemaname='public'
      AND tablename IN ('properties','acquisition_costs','operating_expenses')));

DO $$
DECLARE field_name text; audit_table text; parent uuid; owner_id uuid;
BEGIN
  -- The complete financial write contract: NUMERIC, nullable, no zero default.
  FOR audit_table,field_name IN
    SELECT 'properties',unnest(ARRAY['asking_price','target_purchase_price','bank_valuation','expected_monthly_rent'])
    UNION ALL
    SELECT 'acquisition_costs',unnest(ARRAY['purchase_price','spa_legal_fee','transfer_stamp_duty',
      'loan_legal_fee','loan_stamp_duty','valuation_fee','renovation_cost','furnishing_cost',
      'utility_deposits','maintenance_deposit','acquisition_agent_fee','initial_holding_cost','contingency_cost','other_cost'])
    UNION ALL
    SELECT 'operating_expenses',unnest(ARRAY['annual_maintenance_fee','annual_sinking_fund','annual_assessment_tax',
      'annual_quit_or_parcel_rent','annual_landlord_insurance','annual_property_management_fee',
      'annual_leasing_agent_fee','annual_tenancy_documentation','annual_repair_reserve',
      'annual_furniture_replacement_reserve','annual_cleaning_cost','annual_vacancy_utilities',
      'annual_bad_debt_allowance','annual_other_operating_expenses'])
  LOOP
    INSERT INTO module_checks SELECT audit_table || '.' || field_name || ' numeric/nullable/no-default',
      count(*)=1 FROM information_schema.columns c WHERE c.table_schema='public'
      AND c.table_name=audit_table AND c.column_name=field_name AND c.data_type='numeric'
      AND c.is_nullable='YES' AND c.column_default IS NULL;
    IF audit_table <> 'properties' THEN
      BEGIN
        EXECUTE format('UPDATE public.%I SET %I=-1 WHERE property_id=(SELECT pid FROM fixture)',audit_table,field_name);
        INSERT INTO module_checks VALUES (audit_table || '.' || field_name || ' negative rejected',false);
      EXCEPTION WHEN check_violation THEN
        INSERT INTO module_checks VALUES (audit_table || '.' || field_name || ' negative rejected',true);
      END;
    END IF;
  END LOOP;
  FOREACH field_name IN ARRAY ARRAY['tenure','rent_verification_status','property_status','analysis_status'] LOOP
    BEGIN
      EXECUTE format('UPDATE public.properties SET %I=''invalid-audit-value'' WHERE id=(SELECT pid FROM fixture)',field_name);
      INSERT INTO module_checks VALUES (field_name || ' invalid enum rejected',false);
    EXCEPTION WHEN check_violation THEN
      INSERT INTO module_checks VALUES (field_name || ' invalid enum rejected',true);
    END;
  END LOOP;
  SELECT pid,uid INTO parent,owner_id FROM fixture;
  FOREACH audit_table IN ARRAY ARRAY['acquisition_costs','operating_expenses'] LOOP
    BEGIN
      EXECUTE format('INSERT INTO public.%I(property_id) VALUES ($1)',audit_table) USING parent;
      INSERT INTO module_checks VALUES (audit_table || ' duplicate child rejected',false);
    EXCEPTION WHEN unique_violation THEN
      INSERT INTO module_checks VALUES (audit_table || ' duplicate child rejected',true);
    END;
    BEGIN
      EXECUTE format('INSERT INTO public.%I(property_id) VALUES ($1)',audit_table) USING gen_random_uuid();
      INSERT INTO module_checks VALUES (audit_table || ' orphan child rejected',false);
    EXCEPTION WHEN foreign_key_violation THEN
      INSERT INTO module_checks VALUES (audit_table || ' orphan child rejected',true);
    END;
    BEGIN
      EXECUTE format('INSERT INTO public.%I(property_id) VALUES (NULL)',audit_table);
      INSERT INTO module_checks VALUES (audit_table || ' null parent rejected',false);
    EXCEPTION WHEN not_null_violation THEN
      INSERT INTO module_checks VALUES (audit_table || ' null parent rejected',true);
    END;
  END LOOP;
END $$;

-- Current field names can be written; real zero and missing remain distinguishable.
UPDATE public.properties SET target_purchase_price=NULL,expected_monthly_rent=0 WHERE id=(SELECT pid FROM fixture);
UPDATE public.acquisition_costs SET purchase_price=600000,other_cost=0 WHERE property_id=(SELECT pid FROM fixture);
UPDATE public.operating_expenses SET annual_maintenance_fee=4800,annual_sinking_fund=0 WHERE property_id=(SELECT pid FROM fixture);
INSERT INTO module_checks VALUES
  ('property zero and null round trip', (SELECT expected_monthly_rent=0 AND target_purchase_price IS NULL FROM public.properties WHERE id=(SELECT pid FROM fixture))),
  ('acquisition zero and null round trip', (SELECT purchase_price=600000 AND other_cost=0 AND spa_legal_fee IS NULL FROM public.acquisition_costs WHERE property_id=(SELECT pid FROM fixture))),
  ('operating annual value, zero and null round trip', (SELECT annual_maintenance_fee=4800 AND annual_sinking_fund=0 AND annual_assessment_tax IS NULL FROM public.operating_expenses WHERE property_id=(SELECT pid FROM fixture)));
DELETE FROM public.properties WHERE id=(SELECT pid FROM fixture);
INSERT INTO module_checks VALUES
  ('property deletion cascades to acquisition',NOT EXISTS(SELECT 1 FROM public.acquisition_costs WHERE property_id=(SELECT pid FROM fixture))),
  ('property deletion cascades to operating',NOT EXISTS(SELECT 1 FROM public.operating_expenses WHERE property_id=(SELECT pid FROM fixture)));
SELECT jsonb_build_object('passed',count(*) FILTER(WHERE passed),'failed',count(*) FILTER(WHERE NOT passed OR passed IS NULL),
  'checks',jsonb_agg(to_jsonb(module_checks))) FROM module_checks;
ROLLBACK;
`);
console.log("Prepared local schema audit; entire test rolls back");

