import type { VerifiedActor } from "../../lib/location/contracts";
import { instant, record, uuid } from "../../lib/location/primitives";
import type { ActorVerifierPort } from "./ports.server";
import { requireTargetPolicy } from "./target-policy.server";
import type { TargetPolicy } from "./target-policy.server";

export type TokenCheck = Readonly<{ token: string; target: TargetPolicy }>;
export type SessionCheck = TokenCheck &
  Readonly<{
    userId: string;
    sessionId: string;
    checkedAtSeconds: number;
  }>;

/** PRIVATE TRUSTED ports, injected at composition time, never by request input.
 * A future verifier must really verify signatures with fixed keys/algorithms;
 * this slice supplies no cryptography, decoder, SDK, client or live composition.
 * Results are exact minimal projections, validated/snapshotted before any await.
 * Test successes are registered synthetic evidence, not verified Auth sessions. */
export interface SignedTokenVerificationPort {
  verifySignedToken(check: TokenCheck): Promise<unknown>;
}
export interface OnlineUserConfirmationPort {
  confirmUser(check: TokenCheck): Promise<unknown>;
}
export interface SessionLivenessPort {
  confirmSession(check: SessionCheck): Promise<unknown>;
}
export interface AdmissionClock {
  nowSeconds(): number;
}
export type AdmissionDependencies = Readonly<{
  target: TargetPolicy;
  signatures: SignedTokenVerificationPort;
  users: OnlineUserConfirmationPort;
  sessions: SessionLivenessPort;
  clock: AdmissionClock;
}>;

function requireAdmission(ok: boolean): asserts ok {
  if (!ok) throw new Error("Admission denied");
}

function seconds(value: unknown): number {
  requireAdmission(
    typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= 253402300799 &&
      !Object.is(value, -0),
  );
  return value;
}

function nonzeroUuid(value: unknown): string {
  const id = uuid(value);
  requireAdmission(id !== "00000000-0000-0000-0000-000000000000");
  return id;
}

function bearer(evidence: unknown): string {
  // Exactly one canonical Authorization field value, bounded in ASCII bytes.
  // JWT-like syntax is ONLY syntax; never decode it or treat it as proof.
  requireAdmission(
    typeof evidence === "string" &&
      evidence.length <= 8192 &&
      /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(evidence),
  );
  return evidence.slice(7);
}

function audienceMatches(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value === expected;
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1 ||
    value.length > 8 ||
    Reflect.ownKeys(value).length !== value.length + 1
  )
    return false;
  const entries: string[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return false;
    const entry: unknown = descriptor.value;
    if (
      typeof entry !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(entry) ||
      entries.includes(entry)
    )
      return false;
    entries.push(entry);
  }
  return entries.includes(expected);
}

function claimsSnapshot(output: unknown, target: TargetPolicy) {
  // This offline projection requires all three timestamps explicitly. A later
  // live-port mapping must be reviewed; never invent/default a missing nbf.
  const v = record(output, [
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
  ]);
  requireAdmission(
    typeof v["algorithm"] === "string" &&
      target.algorithms.some((algorithm) => algorithm === v["algorithm"]) &&
      v["issuer"] === target.issuer &&
      audienceMatches(v["audience"], target.audience) &&
      v["role"] === "authenticated" &&
      v["tokenClass"] === "USER_ACCESS" &&
      v["isAnonymous"] === false,
  );
  return Object.freeze({
    userId: nonzeroUuid(v["subject"]),
    sessionId: nonzeroUuid(v["sessionId"]),
    exp: seconds(v["exp"]),
    iat: seconds(v["iat"]),
    nbf: seconds(v["nbf"]),
  });
}

function checkTimes(claims: ReturnType<typeof claimsSnapshot>, now: number, target: TargetPolicy) {
  requireAdmission(
    claims.exp > now &&
      claims.exp - now >= target.clock.minRemainingLifetimeSeconds &&
      claims.iat <= now + target.clock.maxFutureSkewSeconds &&
      claims.nbf <= now + target.clock.maxFutureSkewSeconds &&
      claims.exp > claims.iat &&
      claims.exp > claims.nbf,
  );
}

/** Dormant, request-scoped ActorVerifierPort. Only a bounded bearer string enters
 * verify; actors, claims and target/service selectors cannot enter that surface.
 * Every invocation rechecks all three authorities, without a positive cache.
 * No instantaneous revocation-at-COMMIT or real liveness guarantee is supplied. */
export function createActorAdmission(dependencies: AdmissionDependencies): ActorVerifierPort {
  let target: TargetPolicy;
  let verifySignedToken: SignedTokenVerificationPort["verifySignedToken"];
  let confirmUser: OnlineUserConfirmationPort["confirmUser"];
  let confirmSession: SessionLivenessPort["confirmSession"];
  let nowSeconds: AdmissionClock["nowSeconds"];
  try {
    const d = record(dependencies, ["target", "signatures", "users", "sessions", "clock"]);
    target = requireTargetPolicy(d["target"]);
    // Capture the trusted methods once; later replacing dependency properties
    // cannot switch this factory to a different verifier or ambient target.
    verifySignedToken = dependencies.signatures.verifySignedToken.bind(dependencies.signatures);
    confirmUser = dependencies.users.confirmUser.bind(dependencies.users);
    confirmSession = dependencies.sessions.confirmSession.bind(dependencies.sessions);
    nowSeconds = dependencies.clock.nowSeconds.bind(dependencies.clock);
  } catch {
    throw new Error("Invalid admission configuration");
  }
  return Object.freeze({
    async verify(evidence: unknown): Promise<VerifiedActor | null> {
      try {
        const token = bearer(evidence);
        const check: TokenCheck = Object.freeze({ token, target });
        const start = seconds(nowSeconds());
        const claims = claimsSnapshot(await verifySignedToken(check), target);
        checkTimes(claims, start, target);
        const user = record(await confirmUser(check), ["userId", "status", "isAnonymous"]);
        requireAdmission(
          nonzeroUuid(user["userId"]) === claims.userId &&
            user["status"] === "AUTHENTICATED" &&
            user["isAnonymous"] === false,
        );
        const checkedAtSeconds = seconds(nowSeconds());
        requireAdmission(checkedAtSeconds >= start);
        checkTimes(claims, checkedAtSeconds, target);
        const sessionCheck: SessionCheck = Object.freeze({
          ...check,
          userId: claims.userId,
          sessionId: claims.sessionId,
          checkedAtSeconds,
        });
        const session = record(await confirmSession(sessionCheck), [
          "userId",
          "sessionId",
          "active",
          "checkedAtSeconds",
        ]);
        requireAdmission(
          nonzeroUuid(session["userId"]) === claims.userId &&
            nonzeroUuid(session["sessionId"]) === claims.sessionId &&
            session["active"] === true &&
            session["checkedAtSeconds"] === checkedAtSeconds,
        );
        const completed = seconds(nowSeconds());
        requireAdmission(completed >= checkedAtSeconds);
        checkTimes(claims, completed, target);
        return Object.freeze({
          userId: uuid(claims.userId),
          verifiedAt: instant(new Date(completed * 1000).toISOString()),
          issuer: target.issuer,
        }) as VerifiedActor;
      } catch {
        // Uniform public denial: no raw exception, diagnostics, token or claims.
        return null;
      }
    },
  });
}
