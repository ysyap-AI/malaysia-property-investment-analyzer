import { record } from "../../lib/location/primitives";

/** Descriptive configuration only. Matching project labels are NOT control-plane
 * attestation, TLS qualification, or permission to connect to a real target. */
export type TargetPolicy = Readonly<{
  environmentId: string;
  projectRef: string;
  authOrigin: string;
  issuer: string;
  jwksOrigin: string;
  algorithms: readonly ("ES256" | "RS256")[];
  audience: "authenticated";
  sqlTarget: Readonly<{ identity: string; projectRef: string }>;
  tls: Readonly<{
    route: "DIRECT_TLS" | "SESSION_TLS" | "TRANSACTION_TLS";
    certificateVerification: "VERIFY_FULL";
  }>;
  clock: Readonly<{
    maxFutureSkewSeconds: 30;
    expiredTokenGraceSeconds: 0;
    minRemainingLifetimeSeconds: 15;
  }>;
}>;

const validated = new WeakSet<object>();
const keys = [
  "environmentId",
  "projectRef",
  "authOrigin",
  "issuer",
  "jwksOrigin",
  "algorithms",
  "audience",
  "sqlTarget",
  "tls",
  "clock",
] as const;

function requirePolicy(ok: boolean): asserts ok {
  if (!ok) throw new Error("Invalid target policy");
}

function identifier(value: unknown, max: number): string {
  requirePolicy(
    typeof value === "string" &&
      value.length <= max &&
      /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) &&
      !/^(?:sb-secret|sb-publishable|service-role)(?:-|$)/.test(value),
  );
  return value;
}

function httpsOrigin(value: unknown): string {
  requirePolicy(typeof value === "string" && value.length <= 253);
  const url = new URL(value);
  requirePolicy(
    url.protocol === "https:" &&
      url.origin === value &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      url.pathname === "/" &&
      url.hostname.includes(".") &&
      /^[a-z0-9.-]+$/.test(url.hostname) &&
      url.hostname
        .split(".")
        .every(
          (label) =>
            label.length >= 1 &&
            label.length <= 63 &&
            /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
        ),
  );
  return value;
}

/** Explicit trusted injection; no defaults, ambient configuration, credentials,
 * SDKs, discovery or I/O. Numeric settings are provisional offline policy, not
 * measured runtime budgets. A different policy requires separate review. */
export function createTargetPolicy(configuration: unknown): TargetPolicy {
  try {
    const v = record(configuration, keys);
    const sql = record(v["sqlTarget"], ["identity", "projectRef"]);
    const tls = record(v["tls"], ["route", "certificateVerification"]);
    const clock = record(v["clock"], [
      "maxFutureSkewSeconds",
      "expiredTokenGraceSeconds",
      "minRemainingLifetimeSeconds",
    ]);
    const environmentId = identifier(v["environmentId"], 64);
    const projectRef = identifier(v["projectRef"], 64);
    const authOrigin = httpsOrigin(v["authOrigin"]);
    const jwksOrigin = httpsOrigin(v["jwksOrigin"]);
    requirePolicy(
      v["issuer"] === `${authOrigin}/auth/v1` &&
        jwksOrigin === authOrigin &&
        v["audience"] === "authenticated" &&
        sql["projectRef"] === projectRef,
    );
    const identity = identifier(sql["identity"], 128);
    const algorithms = v["algorithms"];
    requirePolicy(Array.isArray(algorithms) && algorithms.length > 0 && algorithms.length <= 2);
    // Reject sparse/accessor/subclass/extra-property arrays before reading entries.
    requirePolicy(
      Object.getPrototypeOf(algorithms) === Array.prototype &&
        Reflect.ownKeys(algorithms).length === algorithms.length + 1,
    );
    const copy: ("ES256" | "RS256")[] = [];
    for (let index = 0; index < algorithms.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(algorithms, String(index));
      requirePolicy(descriptor !== undefined && Object.hasOwn(descriptor, "value"));
      const algorithm: unknown = descriptor.value;
      requirePolicy(algorithm === "ES256" || algorithm === "RS256");
      requirePolicy(!copy.includes(algorithm));
      copy.push(algorithm);
    }
    const route = tls["route"];
    requirePolicy(
      (route === "DIRECT_TLS" || route === "SESSION_TLS" || route === "TRANSACTION_TLS") &&
        tls["certificateVerification"] === "VERIFY_FULL",
    );
    requirePolicy(
      clock["maxFutureSkewSeconds"] === 30 &&
        clock["expiredTokenGraceSeconds"] === 0 &&
        !Object.is(clock["expiredTokenGraceSeconds"], -0) &&
        clock["minRemainingLifetimeSeconds"] === 15,
    );
    const policy: TargetPolicy = Object.freeze({
      environmentId,
      projectRef,
      authOrigin,
      issuer: `${authOrigin}/auth/v1`,
      jwksOrigin,
      algorithms: Object.freeze(copy),
      audience: "authenticated",
      sqlTarget: Object.freeze({ identity, projectRef }),
      tls: Object.freeze({ route, certificateVerification: "VERIFY_FULL" }),
      clock: Object.freeze({
        maxFutureSkewSeconds: 30,
        expiredTokenGraceSeconds: 0,
        minRemainingLifetimeSeconds: 15,
      }),
    });
    validated.add(policy);
    return policy;
  } catch {
    // Never expose rejected configuration or private getter/proxy errors.
    throw new Error("Invalid target policy");
  }
}

/** Runtime provenance within this module; a structural cast/frozen copy is not
 * a constructor result. This is not a cryptographic or control-plane attestation. */
export function requireTargetPolicy(value: unknown): TargetPolicy {
  if (typeof value !== "object" || value === null || !validated.has(value)) {
    throw new Error("Invalid target policy");
  }
  return value as TargetPolicy;
}
