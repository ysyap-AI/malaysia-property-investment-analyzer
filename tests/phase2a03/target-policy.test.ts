import { afterEach, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as ts from "typescript";
import {
  createTargetPolicy,
  requireTargetPolicy,
} from "../../src/server/location/target-policy.server";

function configuration() {
  return {
    environmentId: "offline-test",
    projectRef: "synthetic-project",
    authOrigin: "https://auth.synthetic.invalid",
    issuer: "https://auth.synthetic.invalid/auth/v1",
    jwksOrigin: "https://auth.synthetic.invalid",
    algorithms: ["ES256", "RS256"],
    audience: "authenticated",
    sqlTarget: { identity: "opaque-synthetic-target", projectRef: "synthetic-project" },
    tls: { route: "DIRECT_TLS", certificateVerification: "VERIFY_FULL" },
    clock: {
      maxFutureSkewSeconds: 30,
      expiredTokenGraceSeconds: 0,
      minRemainingLifetimeSeconds: 15,
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("constructs a deeply frozen detached descriptor using reserved .invalid hosts", () => {
  const input = configuration();
  const before = structuredClone(input);
  const target = createTargetPolicy(input);
  expect(target).toEqual(before);
  expect(requireTargetPolicy(target)).toBe(target);
  for (const object of [target, target.algorithms, target.sqlTarget, target.tls, target.clock])
    expect(Object.isFrozen(object)).toBe(true);
  expect(input).toEqual(before);
  expect(Object.isFrozen(input)).toBe(false);
  input.algorithms[0] = "none";
  input.sqlTarget.identity = "replacement";
  input.tls.certificateVerification = "DISABLED";
  input.clock.minRemainingLifetimeSeconds = 0;
  input.issuer = "https://other.invalid/auth/v1";
  expect(target).toEqual(before);
  expect(() => Object.assign(target.clock, { maxFutureSkewSeconds: 999 })).toThrow();
  expect(() => Object.assign(target.sqlTarget, { identity: "replacement" })).toThrow();
  expect(() => (target.algorithms as string[]).push("none")).toThrow();
});

it.each([undefined, null, [], true, "", 1, Object.create({})])(
  "fails closed without an exact explicit configuration: %j",
  (input) => {
    expect(() => createTargetPolicy(input)).toThrow("Invalid target policy");
  },
);
it.each(Object.keys(configuration()))("requires %s", (key) => {
  const input: Record<string, unknown> = configuration();
  delete input[key];
  expect(() => createTargetPolicy(input)).toThrow("Invalid target policy");
});
it.each(["password", "dsn", "bearer", "apiKey", "admin", "environment", "jwksUrl", "sqlRoute"])(
  "rejects unapproved/secret field %s",
  (key) => {
    expect(() =>
      createTargetPolicy({ ...configuration(), [key]: "synthetic-private-canary" }),
    ).toThrow("Invalid target policy");
  },
);

const invalidConfigurations: [string, (c: ReturnType<typeof configuration>) => unknown][] = [
  ["wrong project", (c) => ({ ...c, sqlTarget: { ...c.sqlTarget, projectRef: "other-project" } })],
  ["wrong issuer", (c) => ({ ...c, issuer: "https://other.invalid/auth/v1" })],
  ["issuer suffix", (c) => ({ ...c, issuer: `${c.issuer}/` })],
  ["wrong JWKS origin", (c) => ({ ...c, jwksOrigin: "https://keys.other.invalid" })],
  ["JWKS path", (c) => ({ ...c, jwksOrigin: `${c.authOrigin}/auth/v1/.well-known/jwks.json` })],
  ["wrong audience", (c) => ({ ...c, audience: "service_role" })],
  ["empty algorithms", (c) => ({ ...c, algorithms: [] })],
  ["duplicate algorithms", (c) => ({ ...c, algorithms: ["ES256", "ES256"] })],
  ["none algorithm", (c) => ({ ...c, algorithms: ["none"] })],
  ["unapproved symmetric algorithm", (c) => ({ ...c, algorithms: ["HS256"] })],
  ["non-array algorithms", (c) => ({ ...c, algorithms: "ES256" })],
  ["sparse algorithms", (c) => ({ ...c, algorithms: new Array(1) })],
  [
    "SQL selector URL",
    (c) => ({ ...c, sqlTarget: { ...c.sqlTarget, identity: "https://sql.invalid" } }),
  ],
  ["SQL extra field", (c) => ({ ...c, sqlTarget: { ...c.sqlTarget, password: "private-canary" } })],
  ["SQL missing identity", (c) => ({ ...c, sqlTarget: { projectRef: c.projectRef } })],
  ["plaintext route", (c) => ({ ...c, tls: { ...c.tls, route: "PLAINTEXT" } })],
  [
    "disabled TLS verification",
    (c) => ({ ...c, tls: { ...c.tls, certificateVerification: "DISABLED" } }),
  ],
  ["missing TLS field", (c) => ({ ...c, tls: { route: "DIRECT_TLS" } })],
  ["extra TLS field", (c) => ({ ...c, tls: { ...c.tls, fallback: true } })],
  ["looser skew", (c) => ({ ...c, clock: { ...c.clock, maxFutureSkewSeconds: 31 } })],
  ["expiry grace", (c) => ({ ...c, clock: { ...c.clock, expiredTokenGraceSeconds: 1 } })],
  ["negative zero grace", (c) => ({ ...c, clock: { ...c.clock, expiredTokenGraceSeconds: -0 } })],
  ["shorter lifetime", (c) => ({ ...c, clock: { ...c.clock, minRemainingLifetimeSeconds: 14 } })],
  ["missing clock field", (c) => ({ ...c, clock: { maxFutureSkewSeconds: 30 } })],
  ["noninteger clock field", (c) => ({ ...c, clock: { ...c.clock, maxFutureSkewSeconds: 30.5 } })],
  ["extra clock field", (c) => ({ ...c, clock: { ...c.clock, systemClockFallback: true } })],
];
it.each(invalidConfigurations)("rejects inconsistent configuration: %s", (_name, change) => {
  expect(() => createTargetPolicy(change(configuration()))).toThrow("Invalid target policy");
});

it.each([
  "http://auth.synthetic.invalid",
  "https://auth.synthetic.invalid/",
  "https://AUTH.synthetic.invalid",
  "https://auth.synthetic.invalid/path",
  "https://auth.synthetic.invalid?project=other",
  "https://auth.synthetic.invalid#fragment",
  "https://user:private-canary@auth.synthetic.invalid",
  "https://auth.synthetic.invalid:443",
  "https://localhost",
  "https://bad..invalid",
  "https://-bad.invalid",
  "https://bad_.invalid",
  "https://auth.synthetic.invalid.",
  " https://auth.synthetic.invalid",
  "file:///synthetic",
  "not-an-origin",
  "",
])("rejects malformed/noncanonical Auth origin %s", (authOrigin) => {
  expect(() =>
    createTargetPolicy({
      ...configuration(),
      authOrigin,
      jwksOrigin: authOrigin,
      issuer: `${authOrigin}/auth/v1`,
    }),
  ).toThrow("Invalid target policy");
});

it.each(["", "UPPER", "with space", "a".repeat(65), "sb-secret-canary", "a.b.c", "a/b"])(
  "rejects malformed descriptive identifier %s",
  (value) => {
    for (const key of ["environmentId", "projectRef"])
      expect(() => createTargetPolicy({ ...configuration(), [key]: value })).toThrow();
  },
);
it.each(["DIRECT_TLS", "SESSION_TLS", "TRANSACTION_TLS"])(
  "retains explicitly selected %s policy",
  (route) => {
    const c = configuration();
    expect(createTargetPolicy({ ...c, tls: { ...c.tls, route } }).tls.route).toBe(route);
  },
);
it("requires constructor provenance instead of trusting casts or frozen copies", () => {
  const target = createTargetPolicy(configuration());
  for (const value of [
    undefined,
    null,
    configuration(),
    Object.freeze({ ...target }),
    structuredClone(target),
  ])
    expect(() => requireTargetPolicy(value)).toThrow("Invalid target policy");
});
it("rejects accessors/symbols/proxies without exposing private errors or running getters", () => {
  const getter = vi.fn(() => {
    throw new Error("private-config-canary");
  });
  const c = configuration();
  const accessor = Object.defineProperty({ ...c }, "authOrigin", { get: getter });
  const array = Object.defineProperty(["ES256"], "0", { get: getter });
  const extraArray = Object.assign(["ES256"], { extra: "canary" });
  for (const value of [
    accessor,
    { ...c, algorithms: array },
    { ...c, algorithms: extraArray },
    { ...c, [Symbol("private")]: true },
    new Proxy(c, { ownKeys: getter }),
  ]) {
    expect(() => createTargetPolicy(value)).toThrow(/^Invalid target policy$/);
  }
  // ownKeys is the sole proxy trap that must run; data getters never run.
  expect(getter).toHaveBeenCalledTimes(1);
});
it("constructs with ambient network and storage disabled", () => {
  const forbidden = vi.fn(() => {
    throw new Error("ambient-access-canary");
  });
  vi.stubGlobal("fetch", forbidden);
  vi.stubGlobal("localStorage", { getItem: forbidden });
  expect(createTargetPolicy(configuration()).audience).toBe("authenticated");
  expect(forbidden).not.toHaveBeenCalled();
});

it("actual source graph keeps both modules private, dormant and free of I/O/dependencies", () => {
  const root = resolve(import.meta.dirname, "../../src");
  const files = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(resolve(directory, entry.name))
        : /\.[cm]?[jt]sx?$/.test(entry.name)
          ? [resolve(directory, entry.name)]
          : [],
    );
  const policies = ["target-policy.server.ts", "actor-admission.server.ts"].map((name) =>
    resolve(root, "server/location", name),
  );
  const incoming: string[] = [];
  const forbidden: string[] = [];
  for (const path of files(root)) {
    const source = readFileSync(path, "utf8");
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const isPolicy = policies.includes(path);
    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const target = specifier.startsWith("@/")
          ? resolve(root, specifier.slice(2))
          : resolve(dirname(path), specifier);
        if (policies.some((policy) => policy === target || policy === `${target}.ts`) && !isPolicy)
          incoming.push(path);
        if (
          isPolicy &&
          ![
            "../../lib/location/primitives",
            "../../lib/location/contracts",
            "./ports.server",
            "./target-policy.server",
          ].includes(specifier)
        )
          forbidden.push(`${path}:import`);
      }
      if (isPolicy) {
        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            /^(?:fetch|require|eval|createClient|createActorAdmission|createTargetPolicy)$/.test(
              node.expression.getText(ast),
            ))
        )
          forbidden.push(`${path}:call`);
        if (
          ts.isIdentifier(node) &&
          [
            "process",
            "Deno",
            "Bun",
            "localStorage",
            "sessionStorage",
            "XMLHttpRequest",
            "WebSocket",
            "fetch",
            "console",
            "importScripts",
          ].includes(node.text)
        )
          forbidden.push(`${path}:ambient`);
        if (ts.isMetaProperty(node)) forbidden.push(`${path}:meta`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  expect(incoming).toEqual([]);
  expect(forbidden).toEqual([]);
});
