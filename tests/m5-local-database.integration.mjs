import { readFileSync } from "node:fs";
// Opt-in real database qualification. This script can only target the named local sandbox.
// Run: node tests/m4-local-database.integration.mjs (Docker and local Supabase must be running).
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const container = "supabase_db_mpia-post-m7-disposable-20261031";
const base = "http://127.0.0.1:57521";
const args = [
  "exec",
  "-i",
  container,
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-X",
  "-Atq",
  "-v",
  "ON_ERROR_STOP=1",
  "-v",
  "VERBOSITY=verbose",
];
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function sql(statement) {
  const r = spawnSync("docker", args, { input: statement, encoding: "utf8", timeout: 20000 });
  assert.equal(r.status, 0, r.stderr || r.error?.message);
  return r.stdout.trim();
}
// Read only the public legacy API key from the disposable gateway, never a remote env file.
const kong = spawnSync(
  "docker",
  ["exec", "supabase_kong_mpia-post-m7-disposable-20261031", "cat", "/home/kong/kong.yml"],
  { encoding: "utf8" },
);
assert.equal(kong.status, 0, kong.stderr);
const key = [...kong.stdout.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)]
  .map((match) => match[0])
  .find((token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url")).role === "anon");
assert.ok(key, "Disposable anon gateway key");
async function request(path, token, body, method = "POST", extra = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      "Content-Type": "application/json",
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
}
const suffix = randomUUID().slice(0, 8);
const password = `M5-local-${randomUUID()}!`;
async function signup(label) {
  const email = `m5-${label}-${suffix}@example.test`;
  const r = await request("/auth/v1/signup", null, { email, password });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.access_token, "Synthetic signup returns real Auth token");
  return { email, id: r.data.user.id, token: r.data.access_token };
}
const a = await signup("owner");
const b = await signup("other");
console.log("PASS: two synthetic Supabase Auth identities");
const rpc = (user, name, body) => request("/rest/v1/rpc/" + name, user?.token, body);
async function create(name = "M4 local synthetic") {
  const r = await request(
    "/rest/v1/properties",
    a.token,
    {
      user_id: a.id,
      project_name: `${name} ${suffix}`,
      target_purchase_price: 490000,
      notes: "",
      expected_monthly_rent: null,
    },
    "POST",
    { Prefer: "return=representation" },
  );
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data[0].revision, 1);
  return r.data[0].id;
}
async function snapshot(id, user = a) {
  const r = await rpc(user, "m4_property_snapshot", { p_id: id });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
async function write(id, rev, table, values, del = false, user = a) {
  return rpc(user, "m4_write_property", {
    p_id: id,
    p_revision: rev,
    p_table: table,
    p_values: values,
    p_delete: del,
  });
}
async function success(id, rev, table, values) {
  const r = await write(id, rev, table, values);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.revision, rev + 1);
  return r.data;
}
function conflict(r) {
  assert.equal(r.status, 409, JSON.stringify(r.data));
  assert.equal(r.data.code, "PT409");
}

const finalMigration = readFileSync(
  new URL("../supabase/migrations/20261030000000_m5_investment_evidence.sql", import.meta.url),
  "utf8",
);
for (const name of ["m5_valid_evidence", "m4_write_property"]) {
  const start = finalMigration.indexOf("public." + name + "(");
  const body = finalMigration
    .slice(start)
    .split("AS $$")[1]
    .split("$$;")[0]
    .trim()
    .replaceAll("\r\n", "\n");
  assert.equal(
    sql(
      `SELECT prosrc FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${quote(name)};`,
    ).replaceAll("\r\n", "\n"),
    body,
    "Live function matches final migration: " + name,
  );
}
console.log("PASS: live validator and atomic RPC bodies match the final migration");
const date = "2026-10-30";
const entry = (value, origin = "external_observation") => ({
  origin,
  valueAtReview: value,
  sourceLabel: "Synthetic local listing",
  sourceUrl: "https://example.test/m5",
  notes: "Synthetic record checked for this unit",
  observedOn: date,
  verifiedOn: origin === "verified_actual" ? date : null,
  estimate: null,
});
const meta = (field, value, origin) => ({ version: 1, fields: { [field]: entry(value, origin) } });
assert.equal(
  sql(
    `SELECT count(*) FROM pg_attribute WHERE attname='evidence_metadata' AND atttypid='jsonb'::regtype AND NOT attnotnull AND attrelid IN ('public.properties'::regclass,'public.acquisition_costs'::regclass,'public.financing'::regclass,'public.operating_expenses'::regclass);`,
  ),
  "4",
);
assert.equal(
  sql(
    `SELECT count(*) FROM pg_constraint WHERE conname IN ('properties_evidence_metadata_check','acquisition_costs_evidence_metadata_check','financing_evidence_metadata_check','operating_expenses_evidence_metadata_check');`,
  ),
  "4",
);
assert.equal(
  sql(
    `SELECT public.m5_valid_evidence(${quote(JSON.stringify(meta("full_address", "  Unit 1  ", "user_assumption")))}::jsonb,'properties');`,
  ),
  "t",
);
assert.equal(
  sql(
    `SELECT public.m5_valid_evidence(${quote(JSON.stringify(meta("full_address", "   ", "user_assumption")))}::jsonb,'properties');`,
  ),
  "f",
);
const id = await create("M5 disposable evidence");
let s = await snapshot(id);
assert.equal(s.property.evidence_metadata, null);
for (const table of ["acquisition_costs", "financing", "operating_expenses"]) {
  const field = {
    acquisition_costs: "purchase_price",
    financing: "loan_amount",
    operating_expenses: "annual_maintenance_fee",
  }[table];
  const r = await write(id, 1, table, { evidence_metadata: meta(field, 0) });
  assert.equal(r.status, 400);
  assert.equal(r.data.code, "22023");
}
assert.equal((await snapshot(id)).property.revision, 1);
await success(id, 1, "properties", {
  expected_monthly_rent: 2200,
  rent_verification_status: "user-entered",
  bank_valuation: null,
});
await success(id, 2, "acquisition_costs", { purchase_price: 500000, furnishing_cost: 0 });
await success(id, 3, "financing", {
  loan_amount: 400000,
  annual_interest_rate_percent: 4,
  loan_tenure_years: 30,
  use_user_provided_instalment: false,
  bank_quote_verified: false,
});
await success(id, 4, "operating_expenses", {
  annual_maintenance_fee: 3600,
  annual_sinking_fund: 0,
});
s = await snapshot(id);
const configs = [
  ["properties", "expected_monthly_rent", 2200, "external_observation"],
  ["acquisition_costs", "purchase_price", 500000, "verified_actual"],
  ["financing", "loan_amount", 400000, "user_assumption"],
  ["operating_expenses", "annual_sinking_fund", 0, "verified_actual"],
];
let revision = 5;
for (const [table, field, value, origin] of configs) {
  const before = await snapshot(id),
    prior = before[table === "properties" ? "property" : table];
  const result = await success(id, revision++, table, {
    evidence_metadata: meta(field, value, origin),
  });
  const after = await snapshot(id),
    row = after[table === "properties" ? "property" : table];
  assert.deepEqual(row.evidence_metadata, meta(field, value, origin));
  for (const [key, value] of Object.entries(prior))
    if (!["evidence_metadata", "updated_at", "revision"].includes(key))
      assert.deepEqual(row[key], value, table + "." + key);
  assert.equal(after.property.revision, revision);
  assert.deepEqual(result.record.evidence_metadata, row.evidence_metadata);
}
console.log(
  "PASS: nullable legacy records, missing-child rejection, four tables metadata-only persistence, exact one revision, NULL/zero and declarations unchanged",
);
// Reject shape, key, field type, origin, URL, dates, attestation, numeric range and context injection atomically.
const invalid = [
  { version: 2, fields: {} },
  { version: 1, fields: { injected: entry(1) } },
  { version: 1, fields: {}, injected: 1 },
  ...[
    { sourceUrl: "javascript:alert(1)" },
    { sourceUrl: "https://user:secret@example.test" },
    { observedOn: "2026-02-30" },
    { observedOn: "2099-01-01" },
    { sourceLabel: "x".repeat(121) },
    { notes: "x".repeat(2001) },
    { origin: "independently_verified" },
    { origin: "verified_actual", verifiedOn: null },
    { origin: "system_estimate" },
    { valueAtReview: "2200" },
    { valueAtReview: -1 },
    { extra: true },
  ].map((patch) => ({
    version: 1,
    fields: { expected_monthly_rent: { ...entry(2200), ...patch } },
  })),
];
for (const evidence_metadata of invalid) {
  const r = await write(id, revision, "properties", {
    expected_monthly_rent: 9999,
    evidence_metadata,
  });
  assert.equal(r.status, 400, JSON.stringify(r));
  assert.equal(r.data.code, "23514");
  const after = await snapshot(id);
  assert.equal(after.property.expected_monthly_rent, 2200);
  assert.equal(after.property.revision, revision);
}
// CHECK constraints protect privileged maintenance writes too (transaction is rolled back).
const bad = JSON.stringify(invalid[0]);
const maintenance = spawnSync("docker", args, {
  input: `BEGIN; UPDATE public.properties SET evidence_metadata=${quote(bad)}::jsonb WHERE id=${quote(id)}; ROLLBACK;`,
  encoding: "utf8",
  timeout: 20000,
});
assert.notEqual(maintenance.status, 0);
assert.match(maintenance.stderr, /23514|check constraint/);
assert.equal((await snapshot(id)).property.revision, revision);
console.log(
  "PASS: strict database validation, maintenance CHECK and atomic combined-save rollback",
);
// M3 provenance round trip, including explicit zero cash-loan estimate.
const context = {
  rulesVersion: "m5-test-context",
  inputFingerprint: '["m5-test-context",true,500000,null,true,"cash",null,null,true]',
  inputs: {
    scopeConfirmed: true,
    purchasePrice: 500000,
    marketValue: null,
    usePriceAsMarketProxy: true,
    financing: "cash",
    loanToValuePercent: null,
    loanAmount: null,
    financingAvailable: true,
  },
};
const provenance = {
  version: 1,
  fields: { loan_stamp_duty: { ...entry(0, "system_estimate"), estimate: context } },
};
const mismatchedContext = structuredClone(provenance);
mismatchedContext.fields.loan_stamp_duty.estimate.inputFingerprint = "[]";
const invalidContext = await write(id, revision, "acquisition_costs", {
  purchase_price: 123,
  evidence_metadata: mismatchedContext,
});
assert.equal(invalidContext.status, 400);
assert.equal(invalidContext.data.code, "23514");
assert.equal((await snapshot(id)).property.revision, revision);
assert.equal((await snapshot(id)).acquisition_costs.purchase_price, 500000);
await success(id, revision++, "acquisition_costs", {
  loan_stamp_duty: 0,
  evidence_metadata: provenance,
});
assert.deepEqual((await snapshot(id)).acquisition_costs.evidence_metadata, provenance);
// Metadata can remain bound to a past value; changing the financial value must not rewrite the source.
await success(id, revision++, "properties", { expected_monthly_rent: 2300 });
assert.equal(
  (await snapshot(id)).property.evidence_metadata.fields.expected_monthly_rent.valueAtReview,
  2200,
);
await success(id, revision++, "properties", {
  expected_monthly_rent: 2400,
  evidence_metadata: meta("expected_monthly_rent", 2400),
});
assert.equal(
  (await snapshot(id)).property.evidence_metadata.fields.expected_monthly_rent.valueAtReview,
  2400,
);
// Shared revision serializes a competing amount save and evidence save.
const raceRevision = revision;
const race = await Promise.all([
  write(id, raceRevision, "properties", {
    evidence_metadata: meta("expected_monthly_rent", 2400, "user_assumption"),
  }),
  write(id, raceRevision, "financing", { annual_interest_rate_percent: 4.1 }),
]);
assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
revision++;
assert.equal((await snapshot(id)).property.revision, revision);
conflict(await write(id, raceRevision, "properties", {}, true));
console.log(
  "PASS: M3 provenance, atomic combined saves, historical value binding, competing evidence/value saves and stale deletion",
);
for (const [table, field, value] of configs) {
  const r = await write(id, revision, table, { evidence_metadata: meta(field, value) }, false, b);
  conflict(r);
  const filter = table === "properties" ? "id" : "property_id";
  const other = await request(
    `/rest/v1/${table}?${filter}=eq.${id}&select=evidence_metadata`,
    b.token,
    undefined,
    "GET",
  );
  assert.equal(other.status, 200);
  assert.deepEqual(other.data, []);
  const direct = await request(
    `/rest/v1/${table}?${filter}=eq.${id}`,
    a.token,
    { evidence_metadata: null },
    "PATCH",
  );
  assert.equal(direct.status, 403);
}
const anon = await rpc(null, "m4_write_property", {
  p_id: id,
  p_revision: revision,
  p_table: "properties",
  p_values: { evidence_metadata: meta("expected_monthly_rent", 2400) },
});
assert.ok([401, 403].includes(anon.status));
const signed = await request("/auth/v1/token?grant_type=password", null, {
  email: a.email,
  password,
});
assert.equal(signed.status, 200);
a.token = signed.data.access_token;
assert.equal((await snapshot(id)).property.expected_monthly_rent, 2400);
const del = await write(id, revision, "properties", {}, true);
assert.equal(del.status, 200);
for (const table of ["acquisition_costs", "financing", "operating_expenses"])
  assert.equal(sql(`SELECT count(*) FROM public.${table} WHERE property_id=${quote(id)};`), "0");
assert.equal(await snapshot(id), null);
console.log(
  "PASS: cross-user/anonymous isolation, direct bypass denial, fresh sign-in/reload, cascading deletion",
);
console.log("M5 LOCAL DATABASE: PASS (named disposable endpoint only; no remote changes)");
