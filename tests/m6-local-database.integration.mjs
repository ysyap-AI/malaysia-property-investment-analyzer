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
const password = `M6-local-${randomUUID()}!`;
async function signup(label) {
  const email = `m6-${label}-${suffix}@example.test`;
  const r = await request("/auth/v1/signup", null, { email, password });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.access_token, "Synthetic signup returns real Auth token");
  return { email, id: r.data.user.id, token: r.data.access_token };
}
const rpc = (user, name, body) => request("/rest/v1/rpc/" + name, user?.token, body);
async function create(name = "M6 local synthetic") {
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

// Exact identity and live source comparison; never discovers or targets a remote database.
const inspected = spawnSync(
  "docker",
  ["inspect", container],
  { encoding: "utf8" },
);
assert.equal(inspected.status, 0);
// This fresh runner uses Docker directly rather than Compose. Verify concrete
// name, image, dedicated volume and network instead of a Compose-only label.
const identity = JSON.parse(inspected.stdout)[0];
assert.equal(identity.Name, "/" + container);
assert.equal(identity.Config.Image, "public.ecr.aws/supabase/postgres:17.11.0.006");
assert.ok(identity.NetworkSettings.Networks["supabase_network_mpia-post-m7-disposable-20261031"]);
assert.ok(identity.Mounts.some(m => m.Name === container && m.Destination === "/var/lib/postgresql/data"));
assert.equal(sql("SELECT count(*) FROM supabase_migrations.schema_migrations"), "10");
const migration = readFileSync(
  new URL("../supabase/migrations/20261030010000_m6_investment_strategies.sql", import.meta.url),
  "utf8",
);
for (const name of ["m6_valid_strategy", "m4_write_property"]) {
  const source = migration
    .slice(migration.indexOf("public." + name + "("))
    .split("AS $$")[1]
    .split("$$;")[0]
    .trim()
    .replaceAll("\r\n", "\n");
  assert.equal(
    sql(
      `SELECT prosrc FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${quote(name)}`,
    ).replaceAll("\r\n", "\n"),
    source,
  );
}
assert.equal(sql("SELECT has_table_privilege('authenticated','public.properties','UPDATE')"), "f");
assert.equal(
  sql("SELECT relrowsecurity FROM pg_class WHERE oid='public.properties'::regclass"),
  "t",
);
console.log(
  "PASS: exact disposable identity, migration function parity, RLS and direct-write restrictions",
);
const a = await signup("owner");
const b = await signup("other");
console.log("PASS: two synthetic Supabase Auth identities");
const blankTargets = () => ({
  minimumMonthlyCashFlow: null,
  minimumCashOnCash: null,
  minimumProfit: null,
  minimumEquityRoi: null,
  maximumCashFunded: null,
});
const commonBase = () => ({
  horizonMonths: 60,
  restrictionsAcknowledged: false,
  targets: blankTargets(),
  evidence: {},
});
const sale = () => ({
  ...commonBase(),
  resalePrice: 600000,
  exitCosts: {
    agentFee: 12000,
    legalFees: 3000,
    serviceTax: 1000,
    redemptionFees: 0,
    consentOther: 0,
  },
  zerosAcknowledged: true,
  disposalTax: { status: "user_estimate", amount: 10000, basis: "Synthetic planning estimate" },
  depositRefund: 0,
  refundableDepositBasis: "",
  settlementAtHorizonConfirmed: true,
});
const assumptions = {
  version: 1,
  modelVersion: "m6-v1",
  preferredStrategy: "keep",
  common: {
    financingMode: "cash",
    fixedAmortisingConfirmed: false,
    quotedPaymentConfirmed: false,
    initialCostsOutsideHorizon: true,
    flatAssumptionsConfirmed: true,
    acceptedOn: "2026-10-30",
  },
  keep: { ...commonBase(), occupiedMonths: 11 },
  flip: { ...sale(), horizonMonths: 12 },
  hybrid: { ...sale(), occupiedMonths: 11, nonRentalMonths: 6, rentThroughSaleConfirmed: true },
};
const id = await create();
const initial = await snapshot(id);
assert.equal(initial.property.investment_strategy_assumptions, null);
const acq = Object.fromEntries(
  [
    "purchase_price",
    "spa_legal_fee",
    "transfer_stamp_duty",
    "loan_legal_fee",
    "loan_stamp_duty",
    "valuation_fee",
    "renovation_cost",
    "furnishing_cost",
    "utility_deposits",
    "maintenance_deposit",
    "acquisition_agent_fee",
    "initial_holding_cost",
    "contingency_cost",
    "other_cost",
  ].map((k) => [
    k,
    k === "purchase_price"
      ? 500000
      : k === "renovation_cost"
        ? 20000
        : k === "contingency_cost"
          ? 5000
          : 0,
  ]),
);
const opex = Object.fromEntries(
  [
    "annual_maintenance_fee",
    "annual_sinking_fund",
    "annual_assessment_tax",
    "annual_quit_or_parcel_rent",
    "annual_landlord_insurance",
    "annual_property_management_fee",
    "annual_leasing_agent_fee",
    "annual_tenancy_documentation",
    "annual_repair_reserve",
    "annual_furniture_replacement_reserve",
    "annual_cleaning_cost",
    "annual_vacancy_utilities",
    "annual_bad_debt_allowance",
    "annual_other_operating_expenses",
  ].map((k) => [k, k === "annual_maintenance_fee" ? 6000 : 0]),
);
await success(id, 1, "acquisition_costs", acq);
await success(id, 2, "operating_expenses", opex);
await success(id, 3, "properties", { expected_monthly_rent: 2400 });
const before = await snapshot(id);
const saved = await success(id, 4, "properties", { investment_strategy_assumptions: assumptions });
assert.deepEqual(saved.record.investment_strategy_assumptions, assumptions);
let fresh = await snapshot(id);
assert.deepEqual(fresh.property.investment_strategy_assumptions, assumptions);
for (const key of ["acquisition_costs", "operating_expenses", "financing"])
  assert.deepEqual(fresh[key], before[key]);
for (const [key, value] of Object.entries(before.property))
  if (!["investment_strategy_assumptions", "updated_at", "revision"].includes(key))
    assert.deepEqual(fresh.property[key], value);
console.log(
  "PASS: real atomic strategy save / reload, exact revision, all financial values preserved",
);
conflict(await write(id, 4, "properties", { investment_strategy_assumptions: assumptions }));
conflict(
  await write(id, 5, "properties", { investment_strategy_assumptions: assumptions }, false, b),
);
const anon = await write(
  id,
  5,
  "properties",
  { investment_strategy_assumptions: assumptions },
  false,
  null,
);
assert.notEqual(anon.status, 200);
assert.deepEqual(
  (await request(`/rest/v1/properties?id=eq.${id}&select=*`, b.token, undefined, "GET")).data,
  [],
);
assert.notEqual(
  (
    await request(
      `/rest/v1/properties?id=eq.${id}`,
      a.token,
      { investment_strategy_assumptions: assumptions },
      "PATCH",
    )
  ).status,
  200,
);
const malformed = [
  { ...assumptions, version: 2 },
  { ...assumptions, extra: true },
  { ...assumptions, common: { ...assumptions.common, acceptedOn: "2099-01-01" } },
  { ...assumptions, flip: { ...assumptions.flip, resalePrice: -1 } },
  { ...assumptions, hybrid: { ...assumptions.hybrid, nonRentalMonths: 61 } },
  {
    ...assumptions,
    flip: { ...assumptions.flip, disposalTax: { status: "user_estimate", amount: 0, basis: "" } },
  },
  {
    ...assumptions,
    keep: {
      ...assumptions.keep,
      evidence: {
        horizon: {
          origin: "external_observation",
          valueAtReview: 60,
          sourceLabel: "Unsafe",
          sourceUrl: "javascript:alert(1)",
          notes: null,
          observedOn: "2026-10-30",
          verifiedOn: null,
          estimate: null,
        },
      },
    },
  },
];
for (const bad of malformed) {
  const result = await write(id, 5, "properties", {
    investment_strategy_assumptions: bad,
    expected_monthly_rent: 1,
  });
  assert.equal(result.status, 400, JSON.stringify(result));
  assert.equal(result.data.code, "23514");
  fresh = await snapshot(id);
  assert.equal(fresh.property.revision, 5);
  assert.equal(fresh.property.expected_monthly_rent, 2400);
  assert.equal(sql(`SELECT public.m6_valid_strategy(${quote(JSON.stringify(bad))}::jsonb)`), "f");
}
console.log(
  "PASS: stale/cross-owner/anonymous and direct-write denial; strict validation and atomic rollback",
);
const validEvidence = {
  origin: "user_assumption",
  valueAtReview: 60,
  sourceLabel: "Synthetic horizon basis",
  sourceUrl: null,
  notes: "Five-year rental plan",
  observedOn: "2026-10-30",
  verifiedOn: null,
  estimate: null,
};
sql(
  `DO $$ BEGIN BEGIN UPDATE public.properties SET investment_strategy_assumptions=${quote(JSON.stringify(malformed[0]))}::jsonb WHERE id=${quote(id)}; RAISE EXCEPTION 'CHECK failed to reject invalid plan'; EXCEPTION WHEN check_violation THEN NULL; END; END $$;`,
);
assert.equal((await snapshot(id)).property.revision, 5);
assumptions.keep.evidence.horizon = validEvidence;
assumptions.flip.evidence.agentFee = {
  ...validEvidence,
  valueAtReview: 12000,
  sourceLabel: "Synthetic agent quotation",
};
const simultaneous = await Promise.all([
  write(id, 5, "properties", { investment_strategy_assumptions: assumptions }),
  write(id, 5, "properties", { expected_monthly_rent: 2401 }),
]);
assert.equal(simultaneous.filter((r) => r.status === 200).length, 1);
assert.equal(simultaneous.filter((r) => r.status === 409).length, 1);
fresh = await snapshot(id);
assert.equal(fresh.property.revision, 6);
await success(id, 6, "properties", {
  investment_strategy_assumptions: assumptions,
  expected_monthly_rent: 2400,
});
const rentEvidence = {
  version: 1,
  fields: { expected_monthly_rent: { ...validEvidence, valueAtReview: 2400 } },
};
const withM5 = await Promise.all([
  write(id, 7, "properties", { investment_strategy_assumptions: assumptions }),
  write(id, 7, "properties", { evidence_metadata: rentEvidence }),
]);
assert.equal(withM5.filter((r) => r.status === 200).length, 1);
assert.equal(withM5.filter((r) => r.status === 409).length, 1);
await success(id, 8, "properties", {
  investment_strategy_assumptions: assumptions,
  evidence_metadata: rentEvidence,
});
assert.deepEqual((await snapshot(id)).property.evidence_metadata, rentEvidence);
const signedIn = await request("/auth/v1/token?grant_type=password", null, {
  email: a.email,
  password,
});
assert.equal(signedIn.status, 200);
const afterSignIn = await snapshot(id, { ...a, token: signedIn.data.access_token });
assert.deepEqual(afterSignIn.property.investment_strategy_assumptions, assumptions);
console.log(
  "PASS: one winner for concurrent value/strategy writes, strategy evidence round trip, new Auth session reload",
);
console.log("Synthetic browser fixture property:", id);
// Password remains in process memory; no credential receipt is written.

console.log("PASS: synthetic strategy fixture persisted locally; browser UI remains separately unverified");
