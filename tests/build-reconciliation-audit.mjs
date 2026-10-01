// Generates rollback-only tests on an EMPTY local database. No live connection.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const directory = new URL("../supabase/migrations/", import.meta.url);
const target = "20260921010000_reconcile_property_cost_columns.sql";
const baseline = readdirSync(directory).filter((f) => f.endsWith(".sql") && f < target)
  .sort().map((f) => readFileSync(new URL(f, directory), "utf8")).join("\n");
const migration = readFileSync(new URL(target, directory), "utf8");
if (!process.argv[2]) throw new Error("Supply an output SQL path");

// Independent inventory: the full 28 required protections, not inferred from
// whatever checks the migration happens to create.
const columns = {
  acquisition_costs: ["purchase_price", "spa_legal_fee", "transfer_stamp_duty", "loan_legal_fee",
    "loan_stamp_duty", "valuation_fee", "renovation_cost", "furnishing_cost", "utility_deposits",
    "maintenance_deposit", "acquisition_agent_fee", "initial_holding_cost", "contingency_cost", "other_cost"],
  operating_expenses: ["annual_maintenance_fee", "annual_sinking_fund", "annual_assessment_tax",
    "annual_quit_or_parcel_rent", "annual_landlord_insurance", "annual_property_management_fee",
    "annual_leasing_agent_fee", "annual_tenancy_documentation", "annual_repair_reserve",
    "annual_furniture_replacement_reserve", "annual_cleaning_cost", "annual_vacancy_utilities",
    "annual_bad_debt_allowance", "annual_other_operating_expenses"],
};
const inventory = Object.entries(columns).flatMap(([table, fields]) => fields.map((field) =>
  `('${table}','${field}','${table === "acquisition_costs" ? "acq" : "opex"}_${field}_non_negative')`)).join(",\n");
const checks = (path) => `
DO $$ DECLARE s RECORD; value NUMERIC; rejected BOOLEAN; BEGIN
  FOR s IN SELECT * FROM required_cost_checks LOOP
    INSERT INTO reconciliation_checks SELECT '${path}: ' || s.tbl || '.' || s.col || ' one validated check',
      count(*)=1 AND bool_and(c.convalidated)
      FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND c.conkey=ARRAY[a.attnum]
      WHERE c.conrelid=format('public.%I',s.tbl)::regclass AND c.contype='c' AND a.attname=s.col;
    FOREACH value IN ARRAY ARRAY[-1::numeric,-0.01::numeric] LOOP
      rejected := false;
      BEGIN
        EXECUTE format('UPDATE public.%I SET %I=$1',s.tbl,s.col) USING value;
      EXCEPTION WHEN check_violation THEN rejected := true;
      END;
      INSERT INTO reconciliation_checks VALUES ('${path}: ' || s.tbl || '.' || s.col || ' rejects ' || value, rejected);
    END LOOP;
    FOREACH value IN ARRAY ARRAY[NULL::numeric,0::numeric,123.45::numeric] LOOP
      EXECUTE format('UPDATE public.%I SET %I=$1',s.tbl,s.col) USING value;
      INSERT INTO reconciliation_checks VALUES ('${path}: ' || s.tbl || '.' || s.col || ' permits ' || coalesce(value::text,'NULL'),true);
    END LOOP;
  END LOOP;
END $$;
`;
const expectedFailure = (name, state) => `
DO $test$ BEGIN
  BEGIN
    EXECUTE $migration$${migration}$migration$;
    INSERT INTO reconciliation_checks VALUES ('${name}',false);
  EXCEPTION WHEN SQLSTATE '${state}' THEN
    INSERT INTO reconciliation_checks VALUES ('${name}',true);
  END;
END $test$;
`;

writeFileSync(process.argv[2], `
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public') THEN
    RAISE EXCEPTION 'Requires empty public schema; refusing to touch application tables';
  END IF;
END $$;
${baseline}
CREATE TEMP TABLE reconciliation_checks(name TEXT, passed BOOLEAN);
CREATE TEMP TABLE required_cost_checks(tbl TEXT,col TEXT,legacy_name TEXT);
INSERT INTO required_cost_checks VALUES ${inventory};
${migration}
CREATE TEMP TABLE fixture AS SELECT gen_random_uuid() AS uid,gen_random_uuid() AS pid;
INSERT INTO auth.users(id,raw_user_meta_data) SELECT uid,'{}'::jsonb FROM fixture;
INSERT INTO public.properties(id,user_id,project_name) SELECT pid,uid,'Local reconciliation test' FROM fixture;
INSERT INTO public.acquisition_costs(property_id,legal_fees) SELECT pid,500 FROM fixture;
INSERT INTO public.operating_expenses(property_id,maintenance_monthly) SELECT pid,250 FROM fixture;
${checks("clean")}

-- Model the preflight schema: identical expressions with all 28 legacy names.
DO $$ DECLARE s RECORD; BEGIN
  FOR s IN SELECT * FROM required_cost_checks LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',s.tbl,s.tbl || '_' || s.col || '_check',s.legacy_name);
  END LOOP;
END $$;
CREATE TEMP TABLE constraints_before AS SELECT oid,conname,conbin::text,convalidated FROM pg_constraint
  WHERE conrelid IN ('public.acquisition_costs'::regclass,'public.operating_expenses'::regclass);
CREATE TEMP TABLE rows_before AS
  SELECT 'acquisition_costs' AS tbl,to_jsonb(t) AS row FROM public.acquisition_costs t
  UNION ALL SELECT 'operating_expenses',to_jsonb(t) FROM public.operating_expenses t;
${migration}
${migration}
INSERT INTO reconciliation_checks SELECT 'legacy replay preserves every constraint OID, name, expression and validation',
  NOT EXISTS(SELECT * FROM constraints_before EXCEPT SELECT oid,conname,conbin::text,convalidated FROM pg_constraint)
  AND (SELECT count(*) FROM constraints_before)=(SELECT count(*) FROM pg_constraint
    WHERE conrelid IN ('public.acquisition_costs'::regclass,'public.operating_expenses'::regclass));
INSERT INTO reconciliation_checks SELECT 'legacy replay preserves complete cost rows including timestamps',
  NOT EXISTS(SELECT * FROM rows_before EXCEPT
    (SELECT 'acquisition_costs',to_jsonb(t) FROM public.acquisition_costs t
     UNION ALL SELECT 'operating_expenses',to_jsonb(t) FROM public.operating_expenses t));
${checks("legacy")}

-- All destructive fixture setup below is local and rolled back with this file.
DO $$ DECLARE s RECORD; BEGIN
  FOR s IN SELECT * FROM required_cost_checks LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',s.tbl,s.legacy_name);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I >= 0)',s.tbl,s.legacy_name,s.col);
  END LOOP;
END $$;
${migration}
${checks("bare comparison")}

ALTER TABLE public.acquisition_costs DROP CONSTRAINT acq_purchase_price_non_negative;
ALTER TABLE public.acquisition_costs ADD CONSTRAINT weak_legacy CHECK (purchase_price >= -1);
${migration}
INSERT INTO reconciliation_checks SELECT 'weak legacy check is retained but cannot substitute for required protection',
  count(*)=2 FROM pg_constraint WHERE conrelid='public.acquisition_costs'::regclass
  AND conname IN ('weak_legacy','acquisition_costs_purchase_price_check') AND convalidated;
ALTER TABLE public.acquisition_costs DROP CONSTRAINT acquisition_costs_purchase_price_check;
ALTER TABLE public.acquisition_costs DROP CONSTRAINT weak_legacy;

UPDATE public.acquisition_costs SET purchase_price=-1;
ALTER TABLE public.acquisition_costs ADD CONSTRAINT unvalidated_legacy CHECK (purchase_price >= 0) NOT VALID;
${expectedFailure("NOT VALID cannot hide invalid existing rows", "23514")}
UPDATE public.acquisition_costs SET purchase_price=0;
${migration}
INSERT INTO reconciliation_checks SELECT 'NOT VALID is retained and a validated protection is created',
  count(*)=2 AND count(*) FILTER(WHERE convalidated)=1 FROM pg_constraint
  WHERE conrelid='public.acquisition_costs'::regclass
  AND conname IN ('unvalidated_legacy','acquisition_costs_purchase_price_check');
ALTER TABLE public.acquisition_costs DROP CONSTRAINT acquisition_costs_purchase_price_check;
ALTER TABLE public.acquisition_costs DROP CONSTRAINT unvalidated_legacy;

ALTER TABLE public.acquisition_costs ADD CONSTRAINT acquisition_costs_purchase_price_check CHECK (purchase_price >= -1);
${expectedFailure("same-name weak check fails closed", "P0001")}
ALTER TABLE public.acquisition_costs DROP CONSTRAINT acquisition_costs_purchase_price_check;
ALTER TABLE public.acquisition_costs ADD CONSTRAINT acquisition_costs_purchase_price_check CHECK (purchase_price >= 0) NOT VALID;
${expectedFailure("same-name NOT VALID check fails closed", "P0001")}
ALTER TABLE public.acquisition_costs DROP CONSTRAINT acquisition_costs_purchase_price_check;
ALTER TABLE public.acquisition_costs ADD CONSTRAINT legacy_no_inherit CHECK (purchase_price >= 0) NO INHERIT;
${migration}
INSERT INTO reconciliation_checks SELECT 'NO INHERIT cannot substitute for inheritable protection',
  count(*)=1 FROM pg_constraint WHERE conrelid='public.acquisition_costs'::regclass
  AND conname='acquisition_costs_purchase_price_check' AND convalidated AND NOT connoinherit;

SELECT jsonb_build_object('passed',count(*) FILTER(WHERE passed),'failed',count(*) FILTER(WHERE NOT passed OR passed IS NULL),
  'checks',jsonb_agg(to_jsonb(reconciliation_checks))) FROM reconciliation_checks;
ROLLBACK;
`);
console.log("Prepared rollback-only reconciliation audit");
