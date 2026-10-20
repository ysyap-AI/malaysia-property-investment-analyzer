import { afterEach, expect, it, vi } from "vitest";
import { createActorAdmission } from "../../src/server/location/actor-admission.server";
import type {
  AdmissionDependencies,
  SessionCheck,
  TokenCheck,
} from "../../src/server/location/actor-admission.server";
import { createTargetPolicy } from "../../src/server/location/target-policy.server";
import {
  AuthenticationDenied,
  buildFrozenOperation,
} from "../../src/server/location/command-builder.server";
import { createDormantTransactionCore } from "../../src/server/location/transaction.server";
import { operationBytes } from "../../src/lib/location/canonical";
import type { VerifiedActor } from "../../src/lib/location/contracts";
import { actorId, command } from "./fixtures";
import { deferred, syntheticHarness } from "./transaction-fake";

// Explicit registry keys, not JWTs, signatures, decoded payloads, or real sessions.
const tokenA = "synthetic-header-a.synthetic-payload-a.synthetic-signature-a";
const tokenB = "synthetic-header-b.synthetic-payload-b.synthetic-signature-b";
const evidenceA = `Bearer ${tokenA}`;
const evidenceB = `Bearer ${tokenB}`;
const otherUser = "f2000000-0000-0000-0000-000000000002";
const sessionA = "f6000000-0000-0000-0000-000000000001";
const sessionB = "f6000000-0000-0000-0000-000000000002";
const now = 1792458123; // 2026-10-20T01:02:03.000Z
const canary = "synthetic-private-admission-canary";

function targetConfiguration() {
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

function harness() {
  const configuration = targetConfiguration();
  const target = createTargetPolicy(configuration);
  const claims = (subject: string, sessionId: string): Record<string, unknown> => ({
    algorithm: "ES256",
    issuer: target.issuer,
    audience: "authenticated",
    role: "authenticated",
    tokenClass: "USER_ACCESS",
    isAnonymous: false,
    subject,
    sessionId,
    exp: now + 120,
    iat: now - 60,
    nbf: now - 60,
  });
  const signatures = new Map<string, unknown>([
    [tokenA, claims(actorId, sessionA)],
    [tokenB, claims(otherUser, sessionB)],
  ]);
  const users = new Map<string, unknown>([
    [tokenA, { userId: actorId, status: "AUTHENTICATED", isAnonymous: false }],
    [tokenB, { userId: otherUser, status: "AUTHENTICATED", isAnonymous: false }],
  ]);
  const sessions = new Map<string, Record<string, unknown>>([
    [tokenA, { userId: actorId, sessionId: sessionA, active: true }],
    [tokenB, { userId: otherUser, sessionId: sessionB, active: true }],
  ]);
  const calls: { stage: string; check: TokenCheck | SessionCheck }[] = [];
  const signaturePort = vi.fn(async (check: TokenCheck): Promise<unknown> => {
    calls.push({ stage: "signature", check });
    return signatures.get(check.token) ?? null;
  });
  const userPort = vi.fn(async (check: TokenCheck): Promise<unknown> => {
    calls.push({ stage: "user", check });
    return users.get(check.token) ?? null;
  });
  const sessionPort = vi.fn(async (check: SessionCheck): Promise<unknown> => {
    calls.push({ stage: "session", check });
    const registered = sessions.get(check.token);
    // Synthetic liveness at the injected time only. This asserts no real revocation semantics.
    return registered ? { checkedAtSeconds: check.checkedAtSeconds, ...registered } : null;
  });
  const clock = vi.fn(() => now);
  const dependencies: AdmissionDependencies = {
    target,
    signatures: { verifySignedToken: signaturePort },
    users: { confirmUser: userPort },
    sessions: { confirmSession: sessionPort },
    clock: { nowSeconds: clock },
  };
  const admission = createActorAdmission(dependencies);
  const patch = (fields: Record<string, unknown>) => {
    signatures.set(tokenA, { ...(signatures.get(tokenA) as object), ...fields });
  };
  return {
    configuration,
    target,
    signatures,
    users,
    sessions,
    calls,
    signaturePort,
    userPort,
    sessionPort,
    clock,
    dependencies,
    admission,
    patch,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("accepts only registered synthetic evidence and returns exactly the immutable v1 actor", async () => {
  const h = harness();
  const before = structuredClone(h.signatures.get(tokenA));
  const actor = await h.admission.verify(evidenceA);
  expect(actor).toEqual({
    userId: actorId,
    verifiedAt: "2026-10-20T01:02:03.000Z",
    issuer: h.target.issuer,
  });
  expect(Object.keys(actor!)).toEqual(["userId", "verifiedAt", "issuer"]);
  expect(Object.isFrozen(actor)).toBe(true);
  expect(Object.isFrozen(h.admission)).toBe(true);
  expect(h.signatures.get(tokenA)).toEqual(before);
  expect(Object.isFrozen(h.signatures.get(tokenA))).toBe(false);
  expect(() => Object.assign(actor!, { userId: otherUser })).toThrow();
  expect(h.calls.map((call) => call.stage)).toEqual(["signature", "user", "session"]);
  for (const { check } of h.calls) {
    expect(check.token).toBe(tokenA);
    expect(check.target).toBe(h.target);
    expect(Object.isFrozen(check)).toBe(true);
  }
  expect(h.calls[0]!.check).toBe(h.calls[1]!.check);
  expect(h.calls[2]!.check).toEqual({
    token: tokenA,
    target: h.target,
    userId: actorId,
    sessionId: sessionA,
    checkedAtSeconds: now,
  });
});

const badInputs: unknown[] = [
  undefined,
  null,
  true,
  42,
  "",
  tokenA,
  "Bearer",
  "Bearer ",
  `bearer ${tokenA}`,
  `Bearer  ${tokenA}`,
  ` Bearer ${tokenA}`,
  `${evidenceA} `,
  `${evidenceA}\n`,
  `${evidenceA}, ${evidenceB}`,
  `${evidenceA}\r\nAuthorization: ${evidenceB}`,
  [evidenceA],
  [evidenceA, evidenceB],
  { authorization: evidenceA },
  { userId: actorId, verifiedAt: "2026-10-20T01:02:03Z", issuer: "https://other.invalid" },
  { token: tokenA, claims: { subject: actorId } },
  new String(evidenceA),
  "Bearer one",
  "Bearer one.two",
  "Bearer one.two.three.four",
  "Bearer .two.three",
  "Bearer one..three",
  "Bearer one.two.",
  "Bearer one.two.==",
  "Bearer one.twö.three",
  "Bearer sb_publishable_synthetic",
  "Bearer sb_secret_synthetic",
  "apikey synthetic",
  `Bearer ${"x".repeat(8193)}.b.c`,
];
it.each(badInputs.map((value, index) => [index, value] as const))(
  "rejects missing/malformed/duplicate/oversized/API-shaped evidence case %s before trusted calls",
  async (_index, evidence) => {
    const h = harness();
    expect(await h.admission.verify(evidence)).toBeNull();
    expect(h.calls).toEqual([]);
    expect(h.clock).not.toHaveBeenCalled();
  },
);
it.each([
  "actor",
  "issuer",
  "project",
  "projectRef",
  "jwksOrigin",
  "jwksUrl",
  "sqlTarget",
  "sqlRoute",
  "verifier",
])("rejects caller-provided %s without reading its value", async (field) => {
  const h = harness();
  const getter = vi.fn(() => {
    throw new Error(canary);
  });
  const evidence = Object.defineProperty({ authorization: evidenceA }, field, { get: getter });
  expect(await h.admission.verify(evidence)).toBeNull();
  expect(getter).not.toHaveBeenCalled();
  expect(h.calls).toEqual([]);
});
it("enforces the exact 8192-byte ASCII credential boundary", async () => {
  const h = harness();
  const token = `${"a".repeat(8181)}.b.c`; // 8185 + seven-byte scheme = 8192
  h.signatures.set(token, h.signatures.get(tokenA));
  h.users.set(token, h.users.get(tokenA));
  h.sessions.set(token, h.sessions.get(tokenA)!);
  expect(`Bearer ${token}`).toHaveLength(8192);
  expect(await h.admission.verify(`Bearer ${token}`)).not.toBeNull();
  h.calls.length = 0;
  expect(await h.admission.verify(`Bearer a${token}`)).toBeNull();
  expect(h.calls).toEqual([]);
});

const invalidClaims: [string, unknown][] = [
  ["algorithm", "none"],
  ["algorithm", "HS256"],
  ["algorithm", "es256"],
  ["algorithm", null],
  ["issuer", "https://other.invalid/auth/v1"],
  ["issuer", "https://auth.synthetic.invalid/auth/v1/"],
  ["audience", "anon"],
  ["audience", ["service_role"]],
  ["audience", []],
  ["audience", ["authenticated", "authenticated"]],
  ["audience", ["authenticated", 1]],
  ["audience", Array(1)],
  ["audience", Array(9).fill("authenticated")],
  ["role", "anon"],
  ["role", "service_role"],
  ["role", "admin"],
  ["tokenClass", "REFRESH"],
  ["tokenClass", "API_KEY"],
  ["tokenClass", "SERVICE"],
  ["isAnonymous", true],
  ["isAnonymous", "false"],
  ["isAnonymous", null],
  ["subject", "00000000-0000-0000-0000-000000000000"],
  ["subject", actorId.toUpperCase()],
  ["subject", ` ${actorId}`],
  ["subject", actorId.replaceAll("-", "")],
  ["subject", null],
  ["subject", "not-a-uuid"],
  ["sessionId", "00000000-0000-0000-0000-000000000000"],
  ["sessionId", sessionA.toUpperCase()],
  ["sessionId", "not-a-session"],
  ["sessionId", null],
];
it.each(invalidClaims)(
  "denies claim %s variant %# without online confirmation",
  async (key, value) => {
    const h = harness();
    h.patch({ [key]: value });
    expect(await h.admission.verify(evidenceA)).toBeNull();
    expect(h.userPort).not.toHaveBeenCalled();
    expect(h.sessionPort).not.toHaveBeenCalled();
  },
);
it.each([
  "algorithm",
  "issuer",
  "audience",
  "role",
  "tokenClass",
  "isAnonymous",
  "subject",
  "sessionId",
  "exp",
  "iat",
  "nbf",
])("denies missing required projected claim %s", async (key) => {
  const h = harness();
  delete (h.signatures.get(tokenA) as Record<string, unknown>)[key];
  expect(await h.admission.verify(evidenceA)).toBeNull();
  expect(h.userPort).not.toHaveBeenCalled();
});
it.each(["exp", "iat", "nbf"])("validates integer/range rules for %s", async (key) => {
  for (const value of [
    undefined,
    null,
    "1792458123",
    NaN,
    Infinity,
    -Infinity,
    -1,
    -0,
    now + 0.5,
    Number.MAX_SAFE_INTEGER + 1,
    253402300800,
  ]) {
    const h = harness();
    h.patch({ [key]: value });
    expect(await h.admission.verify(evidenceA), `${key} invalid value`).toBeNull();
    expect(h.userPort).not.toHaveBeenCalled();
  }
});
it.each([
  ["expired", { exp: now - 1 }, false],
  ["exact expiry", { exp: now }, false],
  ["lifetime below minimum", { exp: now + 14 }, false],
  ["lifetime exact minimum", { exp: now + 15 }, true],
  ["lifetime above minimum", { exp: now + 16 }, true],
  ["iat exact future skew", { iat: now + 30 }, true],
  ["iat beyond future skew", { iat: now + 31 }, false],
  ["nbf exact future skew", { nbf: now + 30 }, true],
  ["nbf beyond future skew", { nbf: now + 31 }, false],
  ["iat equals exp", { iat: now + 30, exp: now + 30 }, false],
  ["nbf equals exp", { nbf: now + 30, exp: now + 30 }, false],
  ["iat after exp", { iat: now + 30, exp: now + 20 }, false],
  ["nbf after exp", { nbf: now + 30, exp: now + 20 }, false],
] as const)("applies exact provisional time boundary: %s", async (_name, fields, accepted) => {
  const h = harness();
  h.patch(fields);
  expect((await h.admission.verify(evidenceA)) !== null).toBe(accepted);
  if (!accepted) expect(h.userPort).not.toHaveBeenCalled();
});
it.each(["ES256", "RS256"])(
  "accepts explicitly permitted %s and audience membership",
  async (algorithm) => {
    const h = harness();
    h.patch({ algorithm, audience: ["another-audience", "authenticated"] });
    expect(await h.admission.verify(evidenceA)).not.toBeNull();
  },
);
it("enforces the selected subset of permitted algorithms", async () => {
  const h = harness();
  const target = createTargetPolicy({ ...targetConfiguration(), algorithms: ["RS256"] });
  const admission = createActorAdmission({ ...h.dependencies, target });
  expect(await admission.verify(evidenceA)).toBeNull();
  expect(h.userPort).not.toHaveBeenCalled();
});

it.each([null, undefined, false, {}, new Error(canary)])(
  "denies an unsuccessful signature result %# without user/session calls",
  async (output) => {
    const h = harness();
    h.signaturePort.mockResolvedValue(output);
    expect(await h.admission.verify(evidenceA)).toBeNull();
    expect(h.userPort).not.toHaveBeenCalled();
    expect(h.sessionPort).not.toHaveBeenCalled();
  },
);
it.each([
  null,
  {},
  { userId: otherUser, status: "AUTHENTICATED", isAnonymous: false },
  { userId: actorId.toUpperCase(), status: "AUTHENTICATED", isAnonymous: false },
  { userId: "00000000-0000-0000-0000-000000000000", status: "AUTHENTICATED", isAnonymous: false },
  { userId: actorId, status: "DISABLED", isAnonymous: false },
  { userId: actorId, status: "DELETED", isAnonymous: false },
  { userId: actorId, status: "AUTHENTICATED", isAnonymous: true },
  { userId: actorId, status: "AUTHENTICATED" },
  {
    userId: actorId,
    status: "AUTHENTICATED",
    isAnonymous: false,
    user_metadata: { role: "admin" },
  },
])("denies unsuccessful/mismatched/anonymous user result %#", async (output) => {
  const h = harness();
  h.users.set(tokenA, output);
  expect(await h.admission.verify(evidenceA)).toBeNull();
  expect(h.sessionPort).not.toHaveBeenCalled();
});
it.each([
  null,
  {},
  { userId: actorId, sessionId: sessionA, active: false },
  { userId: otherUser, sessionId: sessionA, active: true },
  { userId: actorId, sessionId: sessionB, active: true },
  { userId: actorId, sessionId: sessionA.toUpperCase(), active: true },
  { userId: actorId, sessionId: "00000000-0000-0000-0000-000000000000", active: true },
  { userId: actorId, active: true },
  { userId: actorId, sessionId: sessionA, active: "true" },
  { userId: actorId, sessionId: sessionA, active: true, checkedAtSeconds: now - 1 },
  { userId: actorId, sessionId: sessionA, active: true, checkedAtSeconds: String(now) },
])("denies absent/revoked/mismatched/stale session result %#", async (output) => {
  const h = harness();
  if (output === null) h.sessions.delete(tokenA);
  else h.sessions.set(tokenA, output);
  expect(await h.admission.verify(evidenceA)).toBeNull();
});

it.each([undefined, NaN, Infinity, -1, -0, now + 0.5, 253402300800])(
  "denies invalid injected clock value %#",
  async (value) => {
    const h = harness();
    h.clock.mockReturnValue(value as number);
    expect(await h.admission.verify(evidenceA)).toBeNull();
    expect(h.calls).toEqual([]);
  },
);
it.each(
  [
    [now, now - 1, now],
    [now, now, now - 1],
    [now, now + 106, now + 106],
    [now, now, now + 106],
    [now, now, now + 120],
  ].map((times) => [times] as const),
)("rechecks time after online checks; denies backwards/insufficient lifetime %#", async (times) => {
  const h = harness();
  h.clock
    .mockReturnValueOnce(times[0]!)
    .mockReturnValueOnce(times[1]!)
    .mockReturnValueOnce(times[2]!);
  expect(await h.admission.verify(evidenceA)).toBeNull();
});
it("stamps completed admission and accepts exactly 15 seconds remaining after checks", async () => {
  const h = harness();
  h.clock
    .mockReturnValueOnce(now)
    .mockReturnValueOnce(now + 100)
    .mockReturnValueOnce(now + 105);
  expect(await h.admission.verify(evidenceA)).toMatchObject({
    verifiedAt: new Date((now + 105) * 1000).toISOString(),
  });
  expect(h.sessionPort.mock.calls[0]![0].checkedAtSeconds).toBe(now + 100);
});

it("never falls back to decoded claims, supplied results, or an unregistered token", async () => {
  const h = harness();
  const forged = `Bearer ${Buffer.from('{"alg":"ES256"}').toString("base64url")}.${Buffer.from(
    JSON.stringify(h.signatures.get(tokenA)),
  ).toString("base64url")}.unsigned`;
  expect(await h.admission.verify(forged)).toBeNull();
  expect(await h.admission.verify(h.signatures.get(tokenA))).toBeNull();
  expect(h.userPort).not.toHaveBeenCalled();
});
it("does not cache successful signatures, user checks or session liveness across requests", async () => {
  const h = harness();
  expect(await h.admission.verify(evidenceA)).not.toBeNull();
  h.sessions.set(tokenA, { userId: actorId, sessionId: sessionA, active: false });
  expect(await h.admission.verify(evidenceA)).toBeNull();
  h.users.delete(tokenA);
  expect(await h.admission.verify(evidenceA)).toBeNull();
  h.signatures.delete(tokenA);
  expect(await h.admission.verify(evidenceA)).toBeNull();
  expect(h.signaturePort).toHaveBeenCalledTimes(4);
  expect(h.userPort).toHaveBeenCalledTimes(3);
  expect(h.sessionPort).toHaveBeenCalledTimes(2);
});

it("isolates concurrent calls with explicit barriers and reversed completion", async () => {
  const h = harness();
  const enteredA = deferred(),
    enteredB = deferred(),
    releaseA = deferred(),
    releaseB = deferred();
  const originalSession = h.sessionPort.getMockImplementation()!;
  h.sessionPort.mockImplementation(async (check) => {
    if (check.token === tokenA) {
      enteredA.resolve();
      await releaseA.promise;
    } else {
      enteredB.resolve();
      await releaseB.promise;
    }
    return originalSession(check);
  });
  const pendingA = h.admission.verify(evidenceA),
    pendingB = h.admission.verify(evidenceB);
  await Promise.all([enteredA.promise, enteredB.promise]);
  releaseB.resolve();
  const actorB = await pendingB;
  expect(actorB?.userId).toBe(otherUser);
  releaseA.resolve();
  const actorA = await pendingA;
  expect(actorA?.userId).toBe(actorId);
  expect(actorA).not.toBe(actorB);
  for (const token of [tokenA, tokenB]) {
    const calls = h.calls.filter((call) => call.check.token === token);
    expect(calls.map((call) => call.stage)).toEqual(["signature", "user", "session"]);
    expect(calls.every((call) => call.check.target === h.target)).toBe(true);
    expect(calls[2]!.check).toMatchObject(
      token === tokenA
        ? { userId: actorId, sessionId: sessionA }
        : { userId: otherUser, sessionId: sessionB },
    );
  }
});
it("snapshots verified fields before awaiting the user and cannot be redirected by mutation", async () => {
  const h = harness();
  const entered = deferred(),
    release = deferred();
  const originalUser = h.userPort.getMockImplementation()!;
  h.userPort.mockImplementation(async (check) => {
    entered.resolve();
    await release.promise;
    return originalUser(check);
  });
  const pending = h.admission.verify(evidenceA);
  await entered.promise;
  const claims = h.signatures.get(tokenA) as Record<string, unknown>;
  Object.assign(claims, { subject: otherUser, sessionId: sessionB, exp: now - 1 });
  h.configuration.issuer = "https://other.invalid/auth/v1";
  h.configuration.algorithms[0] = "none";
  h.configuration.clock.minRemainingLifetimeSeconds = 0;
  Object.assign(h.dependencies, { target: createTargetPolicy(targetConfiguration()) });
  h.dependencies.signatures.verifySignedToken = async () => {
    throw new Error(canary);
  };
  release.resolve();
  expect(await pending).toMatchObject({ userId: actorId, issuer: h.target.issuer });
  expect(h.sessionPort.mock.calls[0]![0]).toMatchObject({ userId: actorId, sessionId: sessionA });
});
it("rejects accessor evidence without invoking it and sanitizes hostile result proxies", async () => {
  const h = harness();
  const getter = vi.fn(() => {
    throw new Error(canary);
  });
  h.signatures.set(
    tokenA,
    Object.defineProperty({ ...(h.signatures.get(tokenA) as object) }, "subject", { get: getter }),
  );
  expect(await h.admission.verify(evidenceA)).toBeNull();
  expect(getter).not.toHaveBeenCalled();
  h.signatures.set(tokenA, new Proxy({}, { getPrototypeOf: getter }));
  expect(await h.admission.verify(evidenceA)).toBeNull();
  expect(h.userPort).not.toHaveBeenCalled();
});
it("has no network, storage, system-clock or ambient configuration fallback", async () => {
  const h = harness();
  const forbidden = vi.fn(() => {
    throw new Error(canary);
  });
  vi.stubGlobal("fetch", forbidden);
  vi.stubGlobal("localStorage", { getItem: forbidden });
  vi.spyOn(Date, "now").mockImplementation(forbidden);
  expect(await h.admission.verify(evidenceA)).not.toBeNull();
  h.signaturePort.mockRejectedValue(new Error(canary));
  expect(await h.admission.verify(evidenceA)).toBeNull();
  expect(forbidden).not.toHaveBeenCalled();
});

it.each(["signature", "user", "session", "clock"])(
  "private %s failures never escape public denials or existing transaction diagnostics",
  async (stage) => {
    const privateErrors: unknown[] = [
      new Error(canary),
      new Error("outer", { cause: new Error(canary) }),
      new AggregateError([new Error(canary)], canary),
      { code: "23514", detail: canary, message: canary },
      canary,
      new Proxy(
        {},
        {
          getPrototypeOf() {
            throw new Error(canary);
          },
        },
      ),
    ];
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    for (const error of privateErrors) {
      const h = harness();
      if (stage === "signature") h.signaturePort.mockRejectedValue(error);
      if (stage === "user") h.userPort.mockRejectedValue(error);
      if (stage === "session") h.sessionPort.mockRejectedValue(error);
      if (stage === "clock")
        h.clock.mockImplementation(() => {
          throw error;
        });
      expect(await h.admission.verify(evidenceA)).toBeNull();
      const transaction = await syntheticHarness();
      const core = createDormantTransactionCore({ ...transaction.ports, actors: h.admission });
      const result = await core.execute(evidenceA, transaction.input);
      expect(result).toMatchObject({ kind: "FAILURE", code: "AUTHENTICATION_FAILED" });
      expect(transaction.ports.commands.construct).not.toHaveBeenCalled();
      expect(transaction.ports.connections.acquire).not.toHaveBeenCalled();
      expect(JSON.stringify({ result, events: transaction.events })).not.toContain(canary);
      if (stage === "signature" || stage === "clock") expect(h.userPort).not.toHaveBeenCalled();
      if (stage !== "session") expect(h.sessionPort).not.toHaveBeenCalled();
    }
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  },
);

it("requires all separate trusted ports and a constructor-validated policy at composition", () => {
  const h = harness();
  for (const key of ["target", "signatures", "users", "sessions", "clock"]) {
    const d = { ...h.dependencies } as Record<string, unknown>;
    delete d[key];
    expect(() => createActorAdmission(d as AdmissionDependencies)).toThrow(
      /^Invalid admission configuration$/,
    );
  }
  expect(() =>
    createActorAdmission({ ...h.dependencies, target: Object.freeze({ ...h.target }) }),
  ).toThrow(/^Invalid admission configuration$/);
  expect(() => createActorAdmission({ ...h.dependencies, target: undefined! })).toThrow(
    /^Invalid admission configuration$/,
  );
});
it("preserves existing buildFrozenOperation v1 bytes and fixed accepted hash", async () => {
  const h = harness();
  const builder = {
    construct: vi.fn(async (_actor: VerifiedActor, _intent: unknown) => command()),
  }; // private synthetic builder only
  const frozen = await buildFrozenOperation(h.admission, builder, evidenceA, undefined);
  const golden =
    '["mpia-location-command-v1","f1000000-0000-0000-0000-000000000001","f2000000-0000-0000-0000-000000000001","ABSENT",null,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","APPEND_LOCATION",null,null,null,101.6869,3.139,"USER_PIN","EPSG:4326",null,null,null,"USER_PIN",null,"UNKNOWN",null,"REVIEW_REQUIRED",null,"INITIAL_INPUT"]';
  expect(operationBytes(frozen.command, frozen.actor.userId)).toBe(golden);
  expect(new TextEncoder().encode(operationBytes(frozen.command, frozen.actor.userId))).toEqual(
    new TextEncoder().encode(golden),
  );
  expect(frozen.hash).toBe("9351efbe0ee938e2189e8750b2fa6d84d84537695906ecff3a13daf2c540c4a4");
  expect(Object.keys(frozen.actor)).toEqual(["userId", "verifiedAt", "issuer"]);
  expect(builder.construct.mock.calls[0]![0]).toEqual(frozen.actor);
  expect(Object.isFrozen(frozen.actor)).toBe(true);
  h.sessions.delete(tokenA);
  await expect(
    buildFrozenOperation(h.admission, builder, evidenceA, undefined),
  ).rejects.toBeInstanceOf(AuthenticationDenied);
  expect(builder.construct).toHaveBeenCalledTimes(1);
});
