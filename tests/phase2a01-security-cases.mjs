import { literal as l, insert } from "./phase2a01-contract-fixtures.mjs";
export const newTables = [
  "location_provider_registry",
  "location_fact_definitions",
  "location_freshness_policies",
  "property_location_intelligence_state",
];
const a = "a2100000-0000-0000-0000-000000000001",
  b = "b2100000-0000-0000-0000-000000000002";
const denied = (label, sql, states = ["42501"]) =>
  `SELECT pg_temp.denied(${l(label)},${l(sql)},ARRAY[${states.map(l).join(",")}]);\n`;
export function securityCases() {
  let sql = "";
  for (const role of ["anon", "authenticated", "service_role"]) {
    sql += `SET LOCAL ROLE ${role};\n`;
    for (const table of newTables) {
      if (role === "anon") sql += denied("anon read " + table, `SELECT * FROM public.${table}`);
      else if (table !== "property_location_intelligence_state")
        sql += `SELECT pg_temp.ok(${l(role + " registry positive read " + table)},(SELECT count(*)>0 FROM public.${table}));\n`;
      for (const p of [
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
        "REFERENCES",
        "TRIGGER",
        "MAINTAIN",
      ]) {
        const allowed =
          (role !== "anon" && p === "SELECT") ||
          (role === "service_role" && table === newTables[3] && ["INSERT", "UPDATE"].includes(p));
        sql += `SELECT pg_temp.ok(${l(role + " effective " + table + " " + p)},has_table_privilege(current_user,${l("public." + table)},${l(p)})=${allowed} AND NOT has_table_privilege(current_user,${l("public." + table)},${l(p + " WITH GRANT OPTION")}));\n`;
      }
      sql += denied(role + " truncate " + table, `TRUNCATE public.${table}`);
      sql += denied(role + " direct DELETE " + table, `DELETE FROM public.${table}`);
      sql += denied(
        role + " alter " + table,
        `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY`,
      );
      sql += denied(
        role + " trigger " + table,
        `CREATE TRIGGER forbidden BEFORE INSERT ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.guard_location_registry_row()`,
      );
      // PostgreSQL GRANT by a non-owner can warn and grant nothing; verify the result.
      sql += `DO $test$ BEGIN GRANT UPDATE ON public.${table} TO anon; EXCEPTION WHEN insufficient_privilege THEN NULL; END $test$;\nSELECT pg_temp.ok('no grant escalation',NOT has_table_privilege('anon',${l("public." + table)},'UPDATE'));\n`;
      if (!(role === "service_role" && table === newTables[3])) {
        sql += denied(role + " insert " + table, `INSERT INTO public.${table} DEFAULT VALUES`);
        const column = table === newTables[3] ? "state_revision" : "created_at";
        sql += denied(role + " update " + table, `UPDATE public.${table} SET ${column}=${column}`);
        sql += denied(
          role + " upsert " + table,
          `INSERT INTO public.${table} DEFAULT VALUES ON CONFLICT (${table === newTables[3] ? "property_id" : "id"}) DO UPDATE SET ${column}=DEFAULT`,
        );
      }
    }
    for (const fn of ["guard_location_registry_row", "guard_property_location_state_row"])
      sql += denied(role + " direct guard " + fn, `SELECT public.${fn}()`);
    sql += "RESET ROLE;\n";
  }
  for (const [user, own, other] of [
    ["a2000000-0000-0000-0000-000000000001", a, b],
    ["b2000000-0000-0000-0000-000000000002", b, a],
  ]) {
    sql += `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',${l(user)},true);\n`;
    sql += `SELECT pg_temp.ok('own state and unfiltered isolation',(SELECT count(*)=1 AND bool_and(property_id=${l(own)}::uuid) FROM public.property_location_intelligence_state));\n`;
    sql += `SELECT pg_temp.ok('explicit other state hidden',NOT EXISTS(SELECT FROM public.property_location_intelligence_state WHERE property_id=${l(other)}));\n`;
    sql += `WITH d AS (DELETE FROM public.properties WHERE id=${l(other)} RETURNING *) SELECT pg_temp.ok('cannot delete other parent',NOT EXISTS(SELECT FROM d));\n`;
    for (const id of [own, other]) {
      sql += denied(
        "user cannot insert own/other state",
        `INSERT INTO public.property_location_intelligence_state(property_id) VALUES(${l(id)})`,
      );
      sql += denied(
        "user cannot update own/other state",
        `UPDATE public.property_location_intelligence_state SET state_revision=3 WHERE property_id=${l(id)}`,
      );
      sql += denied(
        "user cannot delete own/other state",
        `DELETE FROM public.property_location_intelligence_state WHERE property_id=${l(id)}`,
      );
      sql += denied(
        "user cannot upsert own/other state",
        `INSERT INTO public.property_location_intelligence_state(property_id) VALUES(${l(id)}) ON CONFLICT(property_id) DO UPDATE SET state_revision=3`,
      );
    }
    sql += "RESET ROLE;\n";
  }
  for (const table of newTables.slice(0, 3)) {
    sql += denied(
      "immutable " + table,
      `UPDATE public.${table} SET created_at=created_at-interval '1 second'`,
      ["23514"],
    );
    sql += denied("no-op update " + table, `UPDATE public.${table} SET created_at=created_at`, [
      "23514",
    ]);
    sql += denied("delete history " + table, `DELETE FROM public.${table}`, ["23514"]);
    sql += denied(
      "mixed deprecation " + table,
      `UPDATE public.${table} SET deprecated_at=now(),created_at=created_at-interval '1 second'`,
      ["23514"],
    );
    sql += `UPDATE public.${table} SET deprecated_at=now() WHERE deprecated_at IS NULL;\n`;
    sql += denied(
      "no repeat deprecation " + table,
      `UPDATE public.${table} SET deprecated_at=now()`,
      ["23514"],
    );
    sql += denied("no undeprecation " + table, `UPDATE public.${table} SET deprecated_at=NULL`, [
      "23514",
    ]);
    sql += denied(
      "duplicate identity " + table,
      `INSERT INTO public.${table} SELECT * FROM public.${table} LIMIT 1`,
      ["23514", "23505"],
    );
  }
  sql += `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','a2000000-0000-0000-0000-000000000001',true);
 DELETE FROM public.properties WHERE id=${l(a)};
 RESET ROLE;
 SELECT pg_temp.ok('A parent deletion cascades state and Phase 1 children',
 NOT EXISTS(SELECT FROM public.property_location_intelligence_state WHERE property_id=${l(a)}) AND
 NOT EXISTS(SELECT FROM public.acquisition_costs WHERE property_id=${l(a)}) AND
 NOT EXISTS(SELECT FROM public.operating_expenses WHERE property_id=${l(a)}) AND
 NOT EXISTS(SELECT FROM public.financing WHERE property_id=${l(a)}) AND
 EXISTS(SELECT FROM public.property_location_intelligence_state WHERE property_id=${l(b)}) AND
 EXISTS(SELECT FROM public.financing WHERE property_id=${l(b)}));
 DELETE FROM auth.users WHERE id='b2000000-0000-0000-0000-000000000002';
 SELECT pg_temp.ok('auth-user deletion cascades to state',NOT EXISTS(SELECT FROM public.property_location_intelligence_state WHERE property_id=${l(b)}));
 `;
  return sql;
}

export function constraintCases() {
  let sql = "";
  const p = {
    provider_key: "negative_fixture",
    provider_version: 1,
    display_name: "Synthetic",
    capabilities: ["GEOCODING"],
  };
  const reviewed = {
    ...p,
    approval_state: "APPROVED",
    retention_class: "TEMPORARY_30_DAY",
    retention_limit_seconds: 2592000,
    attribution_text: "Synthetic",
    terms_reference: "synthetic:terms",
    review_reference: "synthetic:review",
    reviewed_at: "2000-01-01",
  };
  for (const row of [
    { ...reviewed, provider_version: 2, retention_limit_seconds: 1 },
    { ...reviewed, provider_version: 3 },
    { ...p, provider_version: 4, approval_state: "DISABLED" },
    { ...reviewed, provider_version: 5, approval_state: "DISABLED" },
  ])
    sql += insert(newTables[0], row) + ";\n";
  const patches = [
    { capabilities: [] },
    { capabilities: ["GEOCODING", "GEOCODING"] },
    { capabilities: ["GEOCODING", null] },
    { capabilities: ["UNKNOWN"] },
    { capabilities: null },
    { provider_key: "Upper" },
    { provider_key: "" },
    { provider_key: "x".repeat(161) },
    { provider_version: 0 },
    { display_name: " " },
    { approval_state: "APPROVED" },
    { retention_class: "PERMANENT" },
    { retention_limit_seconds: 30 },
    { reviewed_at: "2000-01-01" },
    { terms_reference: " " },
    { attribution_text: "" },
    { deprecated_at: "2000-01-01" },
  ];
  for (const patch of patches)
    sql += denied(
      "invalid provider " + JSON.stringify(patch),
      insert(newTables[0], { ...p, ...patch }),
      ["23514", "23502"],
    );
  for (const patch of [
    { retention_limit_seconds: null },
    { retention_limit_seconds: 0 },
    { retention_limit_seconds: 2592001 },
    { retention_class: "PERMANENT" },
    { terms_reference: null },
    { review_reference: null },
    { reviewed_at: null },
    { reviewed_at: "infinity" },
    { reviewed_at: "2999-01-01" },
    { attribution_text: null },
    { approval_state: "UNREVIEWED" },
    { terms_reference: "x".repeat(1001) },
    { attribution_text: "x".repeat(4001) },
  ])
    sql += denied(
      "invalid reviewed provider " + Object.keys(patch),
      insert(newTables[0], { ...reviewed, ...patch }),
      ["23514", "23502"],
    );
  sql += denied(
    "duplicate logical provider version",
    insert(newTables[0], { ...p, provider_key: "synthetic" }),
    ["23505"],
  );
  sql += denied(
    "multidimensional capabilities",
    `INSERT INTO public.location_provider_registry(provider_key,provider_version,display_name,capabilities) VALUES('matrix',1,'Synthetic',ARRAY[['GEOCODING'],['ROUTING']])`,
    ["23514"],
  );
  const fresh = {
    policy_key: "negative_policy",
    policy_version: 1,
    category: "ROAD",
    age_basis: "OBSERVED_AT",
    fresh_for_seconds: 10,
    expire_after_seconds: 20,
    description: "Synthetic",
    approval_reference: "synthetic:review",
  };
  for (const patch of [
    { fresh_for_seconds: 0 },
    { fresh_for_seconds: -1 },
    { fresh_for_seconds: 20 },
    { expire_after_seconds: 9007199254740992 },
    { age_basis: "NOW" },
    { category: "FINANCE" },
    { description: " " },
    { approval_reference: "" },
    { policy_version: 0 },
    { policy_key: "Upper" },
    { fresh_for_seconds: null },
  ])
    sql += denied(
      "invalid freshness " + Object.keys(patch),
      insert(newTables[2], { ...fresh, ...patch }),
      ["23514", "23502"],
    );
  // Guard attachment failure is tested with a temporary public clone inside rollback.
  sql += `CREATE TABLE public.foundation_guard_probe (LIKE public.location_provider_registry INCLUDING DEFAULTS);
 CREATE TRIGGER unsupported BEFORE INSERT ON public.foundation_guard_probe FOR EACH ROW EXECUTE FUNCTION public.guard_location_registry_row();\n`;
  sql += denied("guard fails closed on wrong attachment", insert("foundation_guard_probe", p), [
    "23514",
  ]);
  sql += "DROP TABLE public.foundation_guard_probe;\n";
  return sql;
}
