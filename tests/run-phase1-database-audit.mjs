// Local Docker database only. Never deploys migrations; every run rolls back.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";

const directory = ".phase1-audit.local";
mkdirSync(directory, { recursive: true });
const container = "supabase_db_malaysia-property-investment-analyzer";
function sql(input) {
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], {
    input, encoding: "utf8", maxBuffer: 10 * 1024 * 1024,
  });
}
execFileSync(process.execPath, ["tests/build-module-schema-audit.mjs", `${directory}/schema.sql`]);
execFileSync(process.execPath, ["tests/build-reconciliation-audit.mjs", `${directory}/reconciliation.sql`]);
execFileSync(process.execPath, ["tests/build-supabase-audit.mjs", "supabase/migrations", `${directory}/ownership.sql`]);
const reports = {};
const usersBefore = Number(sql("SELECT count(*) FROM auth.users;").trim());
reports.schema = JSON.parse(sql(readFileSync(`${directory}/schema.sql`, "utf8")).trim());
reports.reconciliation = JSON.parse(sql(readFileSync(`${directory}/reconciliation.sql`, "utf8")).trim());
const ownership = sql(`BEGIN;\n${readFileSync(`${directory}/ownership.sql`, "utf8")}\nROLLBACK;`);
writeFileSync("docs/phase-1-ownership-results.txt", ownership);
const rows = ownership.trim().split(/\r?\n/);
reports.ownership = { passed: rows.filter((r) => r.includes("|PASS|")).length, failed: rows.filter((r) => r.includes("|FAIL|")).length };
if (!reports.ownership.passed) throw new Error("No ownership results returned");
const migrations = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(`supabase/migrations/${f}`, "utf8")).join("\n");
const guard = `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public') THEN RAISE EXCEPTION 'Requires empty public schema'; END IF; END $$;`;
reports.constraints = JSON.parse(sql(`BEGIN; ${guard}\n${migrations}\n${readFileSync("tests/phase1-database.sql", "utf8")}\nROLLBACK;`).trim());
reports.cleanup = JSON.parse(sql("SELECT jsonb_build_object('publicTables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'authUsers',(SELECT count(*) FROM auth.users));"));
reports.cleanup.authUsersBefore = usersBefore;
writeFileSync("docs/phase-1-database-results.json", JSON.stringify(reports, null, 2) + "\n");
console.log(JSON.stringify(Object.fromEntries(Object.entries(reports).map(([key, value]) => [key, key === "cleanup" ? value : { passed: value.passed, failed: value.failed }]))));
if (Object.values(reports).some((r) => r.failed > 0) || reports.cleanup.publicTables > 0 || reports.cleanup.authUsers !== usersBefore) process.exitCode = 1;
