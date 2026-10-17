// Read-only catalog verification; fixed disposable container from the passed run.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { newTables } from "./phase2a01-security-cases.mjs";
const report = JSON.parse(readFileSync("docs/phase2a01-database-results.json", "utf8"));
assert.equal(report.status, "PASS");
const meta = JSON.parse(
  execFileSync(
    "docker",
    ["--context", "desktop-linux", "inspect", "supabase_db_mpia-phase2a01-implementation"],
    { encoding: "utf8" },
  ),
)[0];
assert.equal(meta.Id, report.target.container);
assert.equal(meta.Image, report.target.image);
assert.equal(meta.Mounts[0].Name, report.target.volume);
const sql = (query) =>
  execFileSync(
    "docker",
    [
      "--context",
      "desktop-linux",
      "exec",
      "-i",
      meta.Id,
      "psql",
      "-X",
      "-qAt",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: `BEGIN READ ONLY; ${query}; COMMIT;`, encoding: "utf8" },
  ).trim();
const catalog = JSON.parse(
  sql(`SELECT jsonb_build_object(
 'columns',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'name',column_name,'type',data_type,'nullable',is_nullable='YES','default',column_default) ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='public'),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'type',k.contype,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated)) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE c.relnamespace='public'::regnamespace AND c.relname IN (${newTables.map((t) => `'${t}'`).join(",")})),
 'roles',(SELECT jsonb_agg(jsonb_build_object('role',rolname,'superuser',rolsuper,'bypass',rolbypassrls,'create_role',rolcreaterole,'create_db',rolcreatedb)) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','postgres')),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',m.rolname,'role',r.rolname,'inherit',a.inherit_option,'set',a.set_option,'admin',a.admin_option)),'[]') FROM pg_auth_members a JOIN pg_roles m ON m.oid=a.member JOIN pg_roles r ON r.oid=a.roleid WHERE m.rolname IN ('anon','authenticated','service_role','authenticator')),
 'defaults',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(defaclrole),'schema',n.nspname,'kind',defaclobjtype,'acl',defaclacl)) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public'),
 'guardACL',(SELECT jsonb_agg(jsonb_build_object('name',proname,'owner',pg_get_userbyid(proowner),'acl',proacl)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'guard_%'))`),
);
const types = {
  uuid: "uuid",
  text: "text",
  integer: "integer",
  bigint: "bigint",
  boolean: "boolean",
  timestamptz: "timestamp with time zone",
  "text[]": "ARRAY",
};
const spec = readFileSync("docs/PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md", "utf8");
let checked = 0;
for (const table of newTables) {
  const start = spec.indexOf("`" + table + "`", spec.indexOf("## 3."));
  const section = spec.slice(start, spec.indexOf("\n## ", start));
  const expected = [...section.matchAll(/^\| `([^`]+)` \| `([^`]+)`/gm)].map(([, name, decl]) => {
    const [type, nn] = decl.split(" ");
    return { name, type: types[type], nullable: nn !== "NN" };
  });
  const actual = catalog.columns.filter((c) => c.table === table);
  assert.equal(actual.length, expected.length, table + " column count");
  assert.deepEqual(
    actual.map(({ name, type, nullable }) => ({ name, type, nullable })),
    expected,
    table + " exact spec columns",
  );
  checked += expected.length;
  for (const c of actual) {
    const expectedDefault =
      c.name === "id"
        ? "gen_random_uuid()"
        : c.name === "created_at" || c.name === "updated_at"
          ? "now()"
          : c.name === "approval_state" || c.name === "retention_class"
            ? "'UNREVIEWED'::text"
            : c.name === "attribution_required"
              ? "true"
              : c.name === "processing_status"
                ? "'NOT_STARTED'::text"
                : c.name === "freshness_status"
                  ? "'UNKNOWN'::text"
                  : c.name === "publication_status"
                    ? "'NOT_ASSESSED'::text"
                    : c.name === "state_revision"
                      ? "0"
                      : null;
    assert.equal(c.default, expectedDefault, table + "." + c.name + " default");
  }
  assert.equal(sql(`SELECT count(*) FROM public.${table}`), "0", table + " must be empty");
}
assert.equal(checked, 53);
assert.equal(catalog.constraints.filter((c) => c.type === "p").length, 4);
assert.equal(catalog.constraints.filter((c) => c.type === "u").length, 3);
assert.equal(catalog.constraints.filter((c) => c.type === "f").length, 1);
assert.equal(
  catalog.constraints.find((c) => c.type === "f").definition,
  "FOREIGN KEY (property_id) REFERENCES properties(id) ON UPDATE RESTRICT ON DELETE CASCADE",
);
assert.ok(catalog.constraints.every((c) => c.validated));
for (const role of ["anon", "authenticated", "service_role"])
  for (const owner of [
    "postgres",
    "supabase_admin",
    ...(role === "service_role" ? [] : ["service_role"]),
  ])
    assert.equal(
      sql(`SELECT pg_has_role('${role}','${owner}','SET')`),
      "f",
      role + " cannot assume " + owner,
    );
assert.ok(catalog.defaults.length >= 3, "exercise broad object defaults");
// Compare the supplied external-project snapshot by name/type/nullability.
// Its extra nonunique property index and physical column order are irrelevant to types.
const evidence = readFileSync("docs/MPIA_OWNER_SUPPLIED_Q1_Q8_SQL_RESULTS_COMPILED.md", "utf8");
const external = evidence
  .split(/\r?\n/)
  .filter((x) => /^\| public\s*\|/.test(x))
  .map((x) =>
    x
      .split("|")
      .slice(1, -1)
      .map((x) => x.trim()),
  )
  .filter((x) => x.length === 14)
  .map((x) => ({ table: x[1], name: x[8], type: x[9], nullable: x[10] === "false" }));
const original = catalog.columns
  .filter((c) => !newTables.includes(c.table))
  .map(({ table, name, type, nullable }) => ({ table, name, type, nullable }));
const sort = (rows) =>
  rows.sort((a, b) => (a.table + "." + a.name).localeCompare(b.table + "." + b.name));
assert.equal(external.length, 129, "all 129 public columns in external evidence");
assert.deepEqual(sort(original), sort(external), "external Phase 1 schema equivalence");
writeFileSync(
  "docs/phase2a01-schema-verification.json",
  JSON.stringify(
    {
      status: "PASS",
      newColumns: checked,
      phase1ExternalColumns: external.length,
      specSha256: createHash("sha256").update(spec).digest("hex"),
      evidenceSha256: createHash("sha256").update(evidence).digest("hex"),
      catalog,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "PASS: 53 exact new columns/defaults, constraints, role memberships, empty tables; 129 Phase 1 columns match external snapshot",
);
