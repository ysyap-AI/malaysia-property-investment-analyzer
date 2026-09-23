import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
// An isolated source snapshot can be audited without replacing the working UI.
const sourceRoot = process.env.SECURITY_AUDIT_SOURCE_ROOT || root;

// Pattern checks are a regression guard, not an exhaustive secret audit or RLS test.
// Report paths and categories only; never print the matched credential.
function credentialFindings(source) {
  const findings = [];
  const patterns = [
    ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]+/],
    ["private key", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
    [
      "provider secret",
      /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/,
    ],
    ["database password URL", /\b(?:postgres(?:ql)?|mysql):\/\/[^\s:/]+:[^\s@]+@/i],
    [
      "private browser environment variable",
      /\bVITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|DATABASE_URL|PASSWORD)[A-Z0-9_]*\b/,
    ],
  ];
  for (const [label, pattern] of patterns) {
    if (pattern.test(source)) findings.push(label);
  }
  const literals = /["']?\b(api[_-]?key|api[_-]?secret|client[_-]?secret|password|access[_-]?token|service[_-]?role[_-]?key)["']?\s*[:=]\s*(["'`])([^"'`\r\n]{8,})\2/gi;
  for (const [, name, quote, value] of source.matchAll(literals)) {
    // Supabase Realtime's event-name enum and a variable-only template are not
    // embedded credentials. Specific secret formats are still checked above.
    const realtimeEvent = name === "access_token" && value === "access_token";
    const variableTemplate = quote === "`" && /^\$\{[\w.]+\}$/.test(value);
    if (!realtimeEvent && !variableTemplate) findings.push("literal credential");
  }
  for (const match of source.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const claims = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
      // The legacy anon key is public. User sessions and service-role JWTs are not.
      if (claims.role !== "anon") findings.push("non-anon JWT");
    } catch {
      findings.push("unrecognized JWT-like value");
    }
  }
  return [...new Set(findings)];
}

function filesUnder(directory, base = sourceRoot) {
  return readdirSync(join(base, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path, base) : [path];
  });
}

function fakeJwt(role) {
  // Synthetic, unsigned test data; never a working credential.
  return [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role })).toString("base64url"),
    "test-signature",
  ].join(".");
}

test("scanner detects secret formats without returning their values", () => {
  const cases = [
    ["sb_secret_" + "synthetic-test-value", "Supabase secret key"],
    [fakeJwt("service_role"), "non-anon JWT"],
    [fakeJwt("authenticated"), "non-anon JWT"],
    ["-----BEGIN " + "RSA PRIVATE KEY-----", "private key"],
    ["sk-" + "x".repeat(24), "provider secret"],
    ["postgresql://test:synthetic-password@localhost/test", "database password URL"],
    ["import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY", "private browser environment variable"],
    ['const apiKey = "synthetic-test-value"', "literal credential"],
  ];
  for (const [source, expected] of cases) {
    assert.ok(credentialFindings(source).includes(expected), `Missing detection: ${expected}`);
    assert.ok(!credentialFindings(source).includes(source), "Must not echo a secret");
  }
});

test("scanner permits public Supabase keys and ordinary password inputs", () => {
  for (const source of [
    fakeJwt("anon"),
    "sb_publishable_synthetic-test-value",
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY",
    '<Input id="password" type="password" autoComplete="current-password" />',
    'const events = { access_token: `access_token` }',
    'const headers = { apikey: `${this.supabaseKey}` }',
  ]) {
    assert.deepEqual(credentialFindings(source), []);
  }
});

test("source, public assets and build configuration contain no detected credentials", () => {
  const findings = [];
  const files = [...filesUnder("src"), ...filesUnder("public"), "vite.config.ts", "package.json"];
  for (const path of files) {
    for (const kind of credentialFindings(readFileSync(join(sourceRoot, path), "utf8"))) {
      findings.push(`${path}: ${kind}`);
    }
  }
  assert.deepEqual(findings, [], "Potential credentials detected (values redacted)");
});

test("built browser assets contain no detected credentials", {
  skip: !process.env.SECURITY_AUDIT_BROWSER_ROOT,
}, () => {
  const base = process.env.SECURITY_AUDIT_BROWSER_ROOT;
  const files = filesUnder(".", base);
  assert.ok(files.some((path) => path.endsWith(".js")), "Expected built browser JavaScript");
  const findings = files.flatMap((path) =>
    credentialFindings(readFileSync(join(base, path), "utf8"))
      .map((kind) => `${path}: ${kind}`),
  );
  assert.deepEqual(findings, [], "Potential browser credentials detected (values redacted)");
});

test("environment files are ignored at root and in nested directories", () => {
  const paths = [
    ".env",
    ".env.production",
    ".env.development",
    ".env.local",
    "nested/.env",
    "nested/.env.production",
  ];
  const ignored = execFileSync("git", ["check-ignore", "--no-index", "--stdin"], {
    cwd: root,
    input: [...paths, ".env.example", "nested/.env.example"].join("\n") + "\n",
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/);
  assert.deepEqual(ignored, paths);
});

test("no private environment files are already tracked", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  }).split("\0");
  assert.deepEqual(
    tracked.filter(
      (path) => /(?:^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith(".env.example"),
    ),
    [],
  );
});
