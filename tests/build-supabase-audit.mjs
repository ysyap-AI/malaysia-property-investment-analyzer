// Generate an audit of repository migrations on an EMPTY public schema.
// All application schema and fixture changes are rolled back in a subtransaction.
// This verifies migration behavior; it does not deploy permanent policies.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import process from "node:process";

const [migrationDirectory, outputFile] = process.argv.slice(2);
if (!migrationDirectory || !outputFile) {
  throw new Error("Usage: node tests/build-supabase-audit.mjs <migration-directory> <output-file>");
}
const files = readdirSync(migrationDirectory).filter((file) => file.endsWith(".sql")).sort();
if (!files.length) throw new Error("No application migrations found");
const migrations = files.map((file) => readFileSync(join(migrationDirectory, file), "utf8")).join("\n");
let audit = readFileSync(new URL("./supabase-ownership.sql", import.meta.url), "utf8");
const finalQuery = /SELECT requirement, test_name, CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, detail\s+FROM pg_temp\.ownership_audit_results\s+ORDER BY requirement, test_name;\s*$/;
if (!finalQuery.test(audit)) throw new Error("Audit result query changed; review the wrapper generator");
audit = audit.replace(finalQuery, "SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM pg_temp.ownership_audit_results r;");
for (const delimiter of ["$migration_source$", "$test_source$", "$schema_audit$"]) {
  if (migrations.includes(delimiter) || audit.includes(delimiter)) throw new Error("SQL delimiter collision");
}
const sql = `-- Generated from the application's migrations; not a deployment.
-- Submit this entire file as ONE SQL request/transaction.
CREATE TEMP TABLE migration_audit_report (
  requirement text, test_name text, passed boolean, detail text
) ON COMMIT DROP;
DO $schema_audit$
DECLARE
  audit_report jsonb;
  auth_before bigint;
  auth_after bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')) THEN
    RAISE EXCEPTION 'This migration-validation wrapper requires an empty public schema; use the standalone ownership audit for an existing application database';
  END IF;
  SELECT count(*) INTO auth_before FROM auth.users;
  BEGIN
    EXECUTE $migration_source$${migrations}$migration_source$;
    EXECUTE $test_source$${audit}$test_source$ INTO audit_report;
    RAISE EXCEPTION USING ERRCODE='ZX002', MESSAGE='Rollback temporary application schema';
  EXCEPTION
    WHEN SQLSTATE 'ZX002' THEN NULL;
    WHEN OTHERS THEN
      audit_report := jsonb_build_array(jsonb_build_object(
        'requirement','audit execution','test_name','migration test setup',
        'passed',false,'detail','SQLSTATE=' || SQLSTATE || ': ' || SQLERRM));
  END;
  INSERT INTO pg_temp.migration_audit_report
  SELECT * FROM jsonb_to_recordset(audit_report) AS r(requirement text,test_name text,passed boolean,detail text);
  INSERT INTO pg_temp.migration_audit_report
  SELECT 'cleanup','temporary application tables removed',count(*)=0,'remaining=' || count(*)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f');
  SELECT count(*) INTO auth_after FROM auth.users;
  INSERT INTO pg_temp.migration_audit_report VALUES
    ('cleanup','Auth user count restored',auth_before=auth_after,'before=' || auth_before || '; after=' || auth_after);
END;
$schema_audit$;
SELECT requirement, test_name, CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, detail
FROM pg_temp.migration_audit_report ORDER BY requirement, test_name;
`;
writeFileSync(resolve(outputFile), sql);
console.log(`Prepared rollback-only audit from ${files.length} migrations`);
