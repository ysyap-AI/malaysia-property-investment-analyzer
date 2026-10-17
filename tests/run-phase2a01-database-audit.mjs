// Fixed disposable local target ONLY. No URLs, --linked, remote psql or reset.
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { factContractTests } from "./phase2a01-contract-fixtures.mjs";
import { securityCases, constraintCases, newTables } from "./phase2a01-security-cases.mjs";

const target = "supabase_db_mpia-phase2a01-implementation";
const image = "sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc";
const output = ".phase2a01-implementation.local";
mkdirSync(output, { recursive: true });
function docker(args, input) {
  return execFileSync("docker", ["--context", "desktop-linux", ...args], {
    input,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
const endpoint = JSON.parse(docker(["context", "inspect", "desktop-linux"]))[0].Endpoints.docker
  .Host;
assert.equal(endpoint, "npipe:////./pipe/dockerDesktopLinuxEngine", "Docker must be local");
const meta = JSON.parse(docker(["inspect", target]))[0];
assert.equal(meta.Name, "/" + target);
assert.equal(meta.Image, image);
assert.equal(meta.State.Running, true);
assert.equal(meta.Mounts.length, 1);
assert.equal(meta.Mounts[0].Name, target);
assert.equal(meta.Mounts[0].Type, "volume");
assert.equal(meta.Mounts[0].Destination, "/var/lib/postgresql/data");
assert.ok(!JSON.stringify(meta.Config.Env).includes("viddikrrhogcebpbstti"));
const volume = JSON.parse(docker(["volume", "inspect", target]))[0];
assert.equal(volume.Driver, "local");
const container = meta.Id; // Pin the inspected immutable ID, not a potentially replaced name.
const args = [
  "exec",
  "-i",
  container,
  "psql",
  "-X",
  "-qAt",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
];
function sql(input) {
  return docker(args, input).trim();
}
const identity = JSON.parse(
  sql(
    `BEGIN READ ONLY; SELECT jsonb_build_object('database',current_database(),'user',current_user,'version',current_setting('server_version'),'socket',inet_server_addr() IS NULL,'users',(SELECT count(*) FROM auth.users),'tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public')); COMMIT;`,
  ),
);
assert.equal(identity.database, "postgres");
assert.equal(identity.user, "postgres");
assert.equal(identity.socket, true);
assert.match(identity.version, /^17\./);
const resumeConcurrency = process.argv.includes("--resume-concurrency");
const resume = process.argv.includes("--resume-behavior") || resumeConcurrency;
const verifyInstalled = process.argv.includes("--verify-installed");
if (!resume && !verifyInstalled) {
  assert.equal(identity.users, 0);
  assert.equal(identity.tables, 0, "Refuse to overwrite any existing application schema");
}
const reports =
  resume || verifyInstalled
    ? JSON.parse(readFileSync("docs/phase2a01-database-results.json", "utf8"))
    : {
        target: {
          container,
          volume: volume.Name,
          volumeCreatedAt: volume.CreatedAt,
          image,
          endpoint,
          ...identity,
        },
        tests: [],
        notExecuted: [
          "Real handler actor/session checks S07/S08 (no handler exists)",
          "Fact result/coverage/classifier/freshness engines (later phases)",
          "Interactive browser UI/auth regression",
        ],
      };
if (resume) {
  assert.equal(reports.status, "FAIL");
  assert.equal(reports.target.container, container);
  assert.equal(reports.target.volume, volume.Name);
  assert.equal(identity.users, 2);
  assert.equal(identity.tables, 11);
}
if (verifyInstalled) {
  assert.equal(reports.status, "PASS");
  assert.equal(reports.target.container, container);
  assert.equal(reports.target.volume, volume.Name);
  assert.equal(identity.users, 0);
  assert.equal(identity.tables, 11);
}
const files = readdirSync("supabase/migrations")
  .filter((x) => x.endsWith(".sql"))
  .sort();
assert.equal(files.length, 6);
assert.equal(files[5], "20261016000000_phase2a01_foundation.sql");
const candidateMigrations = files.map((file) => ({
  file,
  sha256: createHash("sha256")
    .update(readFileSync("supabase/migrations/" + file))
    .digest("hex"),
}));
if (resume || verifyInstalled)
  assert.deepEqual(
    candidateMigrations,
    reports.migrations,
    "Installed migration source must not drift",
  );
reports.migrations = candidateMigrations;
const phase1 = files
  .slice(0, 5)
  .map((f) => readFileSync("supabase/migrations/" + f, "utf8"))
  .join("\n");
const foundation = readFileSync("supabase/migrations/" + files[5], "utf8");
assert.equal((foundation.match(/^BEGIN;$/gm) || []).length, 1);
assert.equal((foundation.match(/^COMMIT;$/gm) || []).length, 1);
const body = foundation.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, "");
function passed(name, details = {}) {
  reports.tests.push({ name, status: "PASS", ...details });
  console.log("PASS " + name);
}
function resultJSON(output) {
  return JSON.parse(
    output
      .split(/\r?\n/)
      .filter((x) => x.startsWith("{"))
      .at(-1),
  );
}
const original = [
  "profiles",
  "properties",
  "acquisition_costs",
  "operating_expenses",
  "financing",
  "investment_criteria",
  "scenario_configs",
];
const names = original.map((x) => `'${x}'`).join(",");
// Named metadata, not OIDs; new FK triggers on properties are an expected additive
// dependency and are excluded by selecting only the frozen eight user triggers.
const snapshot = `SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_array(relname,pg_get_userbyid(relowner),relrowsecurity,relforcerowsecurity,relacl) ORDER BY relname) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN (${names})),
 'columns',(SELECT jsonb_agg(jsonb_build_array(c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attacl) ORDER BY c.relname,a.attnum) FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE c.relnamespace='public'::regnamespace AND c.relname IN (${names}) AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_array(c.relname,k.conname,pg_get_constraintdef(k.oid)) ORDER BY c.relname,k.conname) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE c.relnamespace='public'::regnamespace AND c.relname IN (${names})),
 'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY tablename,indexname) FROM pg_indexes i WHERE schemaname='public' AND tablename IN (${names})),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public' AND tablename IN (${names})),
 'functions',(SELECT jsonb_agg(pg_get_functiondef(p.oid) ORDER BY proname) FROM pg_proc p WHERE pronamespace='public'::regnamespace AND proname IN ('owns_property','set_updated_at','handle_new_user')),
 'triggers',(SELECT jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY tgname) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('owns_property','set_updated_at','handle_new_user')),
 'rows',jsonb_build_object(${original.map((t) => `'${t}',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) FROM public.${t} t)`).join(",")}))`;
const upgradeFixtures = `INSERT INTO auth.users(id,email) VALUES ('c2000000-0000-0000-0000-000000000001','upgrade-a@example.invalid'),('d2000000-0000-0000-0000-000000000002','upgrade-b@example.invalid');
 INSERT INTO public.properties(id,user_id,project_name) VALUES ('c2100000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','Upgrade A'),('d2100000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000002','Upgrade B');
 INSERT INTO public.acquisition_costs(property_id,purchase_price,renovation_cost) SELECT id,300000,0 FROM public.properties;
 INSERT INTO public.operating_expenses(property_id,annual_maintenance_fee) SELECT id,NULL FROM public.properties;
 INSERT INTO public.financing(property_id,loan_to_value_percent,use_user_provided_instalment) SELECT id,0,false FROM public.properties;
 INSERT INTO public.investment_criteria(user_id) SELECT id FROM auth.users;
 INSERT INTO public.scenario_configs(user_id,scenario_name) SELECT id,'synthetic' FROM auth.users;`;
try {
  let before;
  if (!resume && !verifyInstalled) {
    const empty = sql(
      `BEGIN; ${phase1}\n${body}\nSELECT jsonb_build_object('tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'newRows',(SELECT count(*) FROM public.location_provider_registry)+(SELECT count(*) FROM public.location_fact_definitions)+(SELECT count(*) FROM public.location_freshness_policies)+(SELECT count(*) FROM public.property_location_intelligence_state)); ROLLBACK;`,
    );
    assert.deepEqual(resultJSON(empty), { tables: 11, newRows: 0 });
    assert.equal(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'"), "0");
    passed("clean six-migration install and full rollback");
    sql(`BEGIN; ${phase1}\n${upgradeFixtures}\nCOMMIT;`);
    before = JSON.parse(sql(snapshot));
    writeFileSync(`${output}/phase1-before.json`, JSON.stringify(before, null, 2));
    for (const [name, marker] of [
      ["after tables", "CREATE FUNCTION public.guard_location_registry_row()"],
      ["after policies", "-- Remove every materialized default grantee"],
      ["after grants", "DO $verify$"],
    ]) {
      const fault = foundation.replace(
        marker,
        `DO $fault$ BEGIN RAISE EXCEPTION 'injected test failure'; END $fault$;\n${marker}`,
      );
      let failed = false;
      try {
        sql(fault);
      } catch (e) {
        failed = String(e.stderr).includes("injected test failure");
      }
      assert.equal(failed, true);
      assert.deepEqual(JSON.parse(sql(snapshot)), before);
      assert.equal(
        sql(
          "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'location_%'",
        ),
        "0",
      );
      assert.equal(
        sql(
          "SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'guard_%'",
        ),
        "0",
      );
      assert.equal(
        sql("SELECT to_regclass('public.property_location_intelligence_state') IS NULL"),
        "t",
      );
      passed("atomic failed migration rollback " + name);
    }
    sql(foundation);
    assert.deepEqual(JSON.parse(sql(snapshot)), before);
    passed(
      "populated upgrade preserves all seven Phase 1 tables, data, policies, grants, constraints, indexes and frozen functions/triggers",
    );
  } else if (resume) {
    before = JSON.parse(readFileSync(`${output}/phase1-before.json`, "utf8"));
    assert.deepEqual(
      JSON.parse(sql(snapshot)),
      before,
      "Resume requires the exact preserved synthetic upgrade baseline",
    );
  } else {
    before = JSON.parse(sql(snapshot));
    for (const table of [...original, ...newTables])
      assert.equal(sql(`SELECT count(*) FROM public.${table}`), "0");
  }
  if (!resumeConcurrency) {
    const cases =
      readFileSync("tests/phase2a01-foundation.sql", "utf8").replace(/^\uFEFF/, "") +
      "\n" +
      factContractTests() +
      constraintCases() +
      securityCases();
    writeFileSync(`${output}/executed-cases.sql`, cases);
    const results = resultJSON(
      sql(
        `BEGIN; ${cases}\nSELECT jsonb_build_object('passed',count(*),'failed',count(*) FILTER(WHERE NOT passed),'checks',jsonb_agg(name ORDER BY name)) FROM phase2_checks; ROLLBACK;`,
      ),
    );
    assert.equal(results.failed, 0);
    assert.ok(results.passed > 1900);
    reports.behavior = results;
    passed("database/security/61 contract positive and component-negative cases", {
      checks: results.passed,
    });
    assert.deepEqual(JSON.parse(sql(snapshot)), before);
    passed("behavior fixtures fully rolled back");
  } else {
    assert.ok(reports.behavior.passed > 1900);
    assert.equal(reports.behavior.failed, 0);
  }
  if (!verifyInstalled) {
    // Two actual connections race for the same expected revision. The first holds
    // the row lock, so the second must recheck its WHERE after waiting for commit.
    if (!resumeConcurrency)
      sql(
        "SET ROLE service_role; INSERT INTO public.property_location_intelligence_state(property_id) VALUES('c2100000-0000-0000-0000-000000000001');",
      );
    const expected = Number(
      sql(
        "SELECT state_revision FROM public.property_location_intelligence_state WHERE property_id='c2100000-0000-0000-0000-000000000001'",
      ),
    );
    function asyncSQL(input) {
      return new Promise((resolve, reject) => {
        const p = spawn("docker", ["--context", "desktop-linux", ...args], {
          stdio: ["pipe", "pipe", "pipe"],
        });
        let out = "",
          err = "";
        p.stdout.on("data", (d) => (out += d));
        p.stderr.on("data", (d) => (err += d));
        p.on("error", reject);
        p.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(Error(err))));
        p.stdin.end(input);
      });
    }
    const update = `WITH changed AS (UPDATE public.property_location_intelligence_state SET state_revision=0 WHERE property_id='c2100000-0000-0000-0000-000000000001' AND state_revision=${expected} RETURNING *) SELECT count(*) FROM changed;`;
    const winner = asyncSQL(
      `SET application_name='mpia_phase2a01_race_first'; BEGIN; SET LOCAL ROLE service_role; ${update} SELECT pg_sleep(3); COMMIT;`,
    );
    // Detect the first writer's sleep, rather than assume process startup timing.
    let held = false;
    for (let i = 0; i < 30; i++) {
      if (
        (await asyncSQL(
          "SELECT EXISTS(SELECT FROM pg_stat_activity WHERE application_name='mpia_phase2a01_race_first' AND wait_event='PgSleep')",
        )) === "t"
      ) {
        held = true;
        break;
      }
    }
    assert.equal(held, true, "first writer must hold the lock");
    const loser = asyncSQL(`BEGIN; SET LOCAL ROLE service_role; ${update} COMMIT;`);
    const [one, two] = await Promise.all([winner, loser]);
    assert.equal(one.trim(), "1");
    assert.equal(two.trim(), "0");
    assert.equal(
      sql("SELECT state_revision FROM public.property_location_intelligence_state"),
      String(expected + 1),
    );
    passed("two concurrent expected-revision writers: one winner, one zero-row stale writer");
    sql(
      "DELETE FROM auth.users WHERE id IN ('c2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000002');",
    );
    for (const table of [...original, ...newTables])
      assert.equal(sql(`SELECT count(*) FROM public.${table}`), "0");
    assert.equal(sql("SELECT count(*) FROM auth.users"), "0");
    passed("synthetic cleanup: zero users and zero application rows");
    // Post-install rollback is test-only and limited to the six newly added objects.
    const phase1Empty = JSON.parse(sql(snapshot));
    sql(
      `BEGIN; DROP TABLE public.property_location_intelligence_state; DROP TABLE public.location_freshness_policies; DROP TABLE public.location_fact_definitions; DROP TABLE public.location_provider_registry; DROP FUNCTION public.guard_property_location_state_row(); DROP FUNCTION public.guard_location_registry_row(); COMMIT;`,
    );
    assert.deepEqual(JSON.parse(sql(snapshot)), phase1Empty);
    passed("post-install rollback preserves Phase 1");
    sql(foundation);
    assert.deepEqual(JSON.parse(sql(snapshot)), phase1Empty);
    passed("reinstall leaves four empty tables for local type generation");
  }
  reports.status = "PASS";
  delete reports.error;
} catch (e) {
  reports.status = "FAIL";
  reports.error = String(e.stderr || e.stack || e);
  console.error(reports.error);
  process.exitCode = 1;
} finally {
  writeFileSync("docs/phase2a01-database-results.json", JSON.stringify(reports, null, 2) + "\n");
}
