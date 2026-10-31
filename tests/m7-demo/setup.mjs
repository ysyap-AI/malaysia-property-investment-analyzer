// Local-only entry point. No CLI link, remote URL, service key or migration replay.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const project = "mpia-post-m7-disposable-20261031";
const base = "http://127.0.0.1:57521";
const local = new URL("../../.m7-demo.local/", import.meta.url);
mkdirSync(local, { recursive: true });
function docker(args, input) {
  const r = spawnSync("docker", args, { input, encoding: "utf8", timeout: 20000 });
  if (r.status !== 0)
    throw Error(
      "Disposable Docker target is unavailable. Start Docker Desktop and the named local Supabase project; no data was seeded.",
    );
  return r.stdout.trim();
}
function sql(query) {
  return docker(
    [
      "exec",
      "-i",
      `supabase_db_${project}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-XAtq",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    `BEGIN READ ONLY; ${query}; COMMIT;`,
  );
}
async function main() {
  const binding = docker(["port", `supabase_kong_${project}`, "8000/tcp"]);
  assert.match(
    binding,
    /(?:127\.0\.0\.1|0\.0\.0\.0):57521\b/,
    "Named disposable gateway identity/port differs",
  );
  const ledger = sql(
    "SELECT coalesce(json_agg(version ORDER BY version),'[]') FROM supabase_migrations.schema_migrations",
  );
  const columns = sql(
    "SELECT json_agg(table_name || '.' || column_name ORDER BY table_name,column_name) FROM information_schema.columns WHERE table_schema='public' AND (column_name IN ('revision','evidence_metadata','investment_strategy_assumptions'))",
  );
  const rls = sql(
    "SELECT json_object_agg(relname,relrowsecurity) FROM pg_class WHERE oid IN ('public.properties'::regclass,'public.acquisition_costs'::regclass,'public.financing'::regclass,'public.operating_expenses'::regclass)",
  );
  const functions = sql(
    "SELECT json_agg(proname ORDER BY proname) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('m4_property_snapshot','m4_write_property','m5_valid_evidence','m6_exact_keys','m6_valid_strategy')",
  );
  const directUpdate = sql(
    "SELECT has_table_privilege('authenticated','public.properties','UPDATE')",
  );
  const inventory = {
    project,
    base,
    ledger: JSON.parse(ledger),
    columns: JSON.parse(columns),
    rls: JSON.parse(rls),
    functions: JSON.parse(functions),
    directUpdate,
  };
  writeFileSync(new URL("qualification.json", local), JSON.stringify(inventory, null, 2));
  for (const v of ["20261029000000", "20261030000000", "20261030010000"]) {
    if (!inventory.ledger.includes(v))
      throw Error(
        `Local migration ledger lacks ${v}. Known M5/M6 schema-versus-ledger mismatch must be reconciled by comparing live schema/functions/constraints/grants with reviewed migrations, or use a fresh qualified disposable instance. Do not replay ADD COLUMN migrations. Inventory: .m7-demo.local/qualification.json`,
      );
  }
  for (const key of [
    "properties.revision",
    "properties.investment_strategy_assumptions",
    ...["properties", "acquisition_costs", "financing", "operating_expenses"].map(
      (table) => `${table}.evidence_metadata`,
    ),
  ])
    assert.ok(inventory.columns.includes(key), `Missing ${key}`);
  assert.ok(Object.values(inventory.rls).every(Boolean), "All property tables require RLS");
  assert.equal(inventory.directUpdate, "f", "Authenticated direct UPDATE must remain denied");
  for (const name of [
    "m4_property_snapshot",
    "m4_write_property",
    "m5_valid_evidence",
    "m6_valid_strategy",
  ])
    assert.ok(inventory.functions.includes(name), `Missing ${name}`);
  if (!process.argv.includes("--apply") && !process.argv.includes("--preview")) {
    console.log(
      "Local identity/schema/ledger prerequisite inventory passed. No Auth or property writes. Use --apply after reviewing fixture/runbook.",
    );
    return;
  }
  const kong = docker(["exec", `supabase_kong_${project}`, "cat", "/home/kong/kong.yml"]);
  const anon = [...kong.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)]
    .map((m) => m[0])
    .find((token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url")).role === "anon");
  assert.ok(anon, "Disposable public anon key not found");
  if (process.argv.includes("--preview")) {
    process.env.M7_LOCAL_ANON_KEY = anon;
    const preview = await createServer({
      root,
      configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
    });
    await preview.listen();
    preview.printUrls();
    return;
  }
  const email = process.env.M7_DEMO_EMAIL,
    password = process.env.M7_DEMO_PASSWORD;
  assert.ok(
    /^m7[-a-z0-9]*@example\.test$/i.test(email ?? ""),
    "M7_DEMO_EMAIL must be a synthetic m7…@example.test account",
  );
  assert.ok(
    password?.length >= 12,
    "Set M7_DEMO_PASSWORD in this process only (at least 12 characters)",
  );
  const client = createClient(base, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = process.argv.includes("--signup")
    ? await client.auth.signUp({ email, password })
    : await client.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.session || !auth.data.user)
    throw Error(
      "Synthetic local Auth failed or needs confirmation. Review account before another signup; credentials were not logged.",
    );
  globalThis.__m7DemoClient = client;
  // Fail closed even if a future import accidentally bypasses the local-client alias.
  const runtimeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.origin !== base) throw Error("Demo setup refused a non-local network destination.");
    return runtimeFetch(input, init);
  };
  const receiptPath = new URL(`receipt-${auth.data.user.id}.json`, local);
  const receipt = existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, "utf8")) : null;
  if (receipt?.state === "create-intent" && !receipt.id)
    throw Error(
      "Previous creation outcome needs review. Do not recreate. Inspect the synthetic owner's local properties and resolve the receipt explicitly.",
    );
  const server = await createServer({
    configFile: false,
    root,
    server: { middlewareMode: true },
    appType: "custom",
    resolve: {
      alias: [
        {
          find: "@/integrations/supabase/external-client",
          replacement: fileURLToPath(new URL("./local-client.ts", import.meta.url)),
        },
        { find: "@", replacement: fileURLToPath(new URL("../../src/", import.meta.url)) },
      ],
    },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { setupDemo } = await server.ssrLoadModule("/tests/m7-demo/run.ts");
    const result = await setupDemo(auth.data.user.id, {
      create: process.argv.includes("--create") && !receipt,
      reviewedId: process.argv.find((arg) => arg.startsWith("--review-existing="))?.split("=")[1],
      beforeCreate: () =>
        writeFileSync(receiptPath, JSON.stringify({ state: "create-intent" }), { flag: "wx" }),
      recordId: (id) => writeFileSync(receiptPath, JSON.stringify({ state: "known-id", id })),
    });
    console.log(
      JSON.stringify(
        {
          id: result.id,
          changed: result.changed,
          results: result.results.map((r) => ({ strategy: r.strategy, metrics: r.metrics })),
        },
        null,
        2,
      ),
    );
  } finally {
    await server.close();
    delete globalThis.__m7DemoClient;
    await client.auth.signOut();
    globalThis.fetch = runtimeFetch;
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
