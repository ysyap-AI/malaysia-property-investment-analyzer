import { describe, expect, it } from "vitest";
import { emitDiagnostic, safeSqlState } from "../../src/server/location/diagnostics.server";
import type { DiagnosticEvent } from "../../src/server/location/diagnostics.server";
import { syntheticHarness } from "./transaction-fake";

const secret =
  "Bearer synthetic.jwt.private postgres://user:password@private.invalid/db?token=secret 12 Sensitive Street https://provider.invalid/?key=private";
const errors: unknown[] = [
  new Error(secret),
  new Error("outer", { cause: new Error(secret) }),
  new AggregateError(
    [new Error(secret), { credentials: secret, nested: { headers: { Authorization: secret } } }],
    secret,
  ),
  {
    code: "23514",
    message: secret,
    detail: secret,
    hint: secret,
    query: secret,
    parameters: [secret],
  },
  { code: secret, connectionString: secret, url: secret },
  secret,
  null,
  Object.defineProperty({}, "code", {
    get() {
      throw new Error(secret);
    },
  }),
  new Proxy(
    {},
    {
      getOwnPropertyDescriptor() {
        throw new Error(secret);
      },
    },
  ),
  new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error(secret);
      },
    },
  ),
];

describe("I05 diagnostics closed projection/redaction", () => {
  it.each(["diagnosticId", "stage", "outcome", "certainty", "cleanup", "sqlState"])(
    "drops an invalid diagnostic %s without throwing or logging",
    async (field) => {
      const h = await syntheticHarness();
      await h.run();
      const before = h.events.length;
      const invalid = { ...h.events[0], [field]: secret } as DiagnosticEvent;
      expect(() => emitDiagnostic(h.ports.diagnostics, invalid)).not.toThrow();
      expect(h.events).toHaveLength(before);
    },
  );
  it.each(errors)("does not expose raw/nested/aggregate/accessor exception %#", async (error) => {
    const h = await syntheticHarness();
    h.client.failures.set("insert", error);
    h.client.failures.set("rollback", new AggregateError([error], secret));
    h.client.failures.set("discard", new Error(secret));
    const result = await h.run();
    const text = JSON.stringify({ result, events: h.events });
    for (const token of [
      secret,
      "Sensitive",
      "Bearer",
      "postgres://",
      "Authorization",
      "password",
      "provider.invalid",
      h.input.propertyId,
      h.input.operationId,
      h.input.propertyInput.digest,
      h.actor.userId,
    ])
      expect(text).not.toContain(token);
    expect(result).toMatchObject({ kind: "FAILURE", code: "TRANSACTION_FAILED", fieldIssues: [] });
    expect(Object.keys(h.events[0]!)).toEqual([
      "diagnosticId",
      "stage",
      "outcome",
      "certainty",
      "cleanup",
      "sqlState",
    ]);
    expect(h.events[0]?.sqlState).toBe(error === errors[3] ? "23514" : null);
  });
  it("does not traverse nested SQLSTATEs or prototype fields or invoke getters", () => {
    expect(safeSqlState({ cause: { code: "40001" } })).toBeNull();
    expect(safeSqlState(Object.create({ code: "40P01" }))).toBeNull();
    expect(safeSqlState({ code: "40001" })).toBe("40001");
    expect(safeSqlState({ code: "23505 secret" })).toBeNull();
  });
  it.each(["sync", "async"])(
    "%s diagnostic sink failure preserves confirmed success and primary failure",
    async (kind) => {
      const h = await syntheticHarness();
      h.ports.diagnostics.emit =
        kind === "sync"
          ? () => {
              throw new Error(secret);
            }
          : async () => {
              throw new Error(secret);
            };
      expect(await h.run()).toMatchObject({ kind: "COMMITTED" });
      h.client.failures.set("insert", new Error(secret));
      expect(
        await h.run({
          ...h.input,
          operationId: "f9000000-0000-0000-0000-000000000001",
          expected: {
            kind: "EXACT",
            revision: 1,
            currentLocationVersionId: h.store.state!["current_location_version_id"],
          },
          payload: { ...h.input.payload, change_reason: "LOCATION_CORRECTED" },
        }),
      ).toMatchObject({ kind: "FAILURE", code: "TRANSACTION_FAILED" });
    },
  );
  it("known commit survives release and logging errors without rollback claim", async () => {
    const h = await syntheticHarness();
    h.client.failures.set("release", new Error(secret));
    expect(await h.run()).toMatchObject({ kind: "COMMITTED" });
    expect(h.events[0]).toMatchObject({
      outcome: "CREATED",
      certainty: "COMMITTED",
      cleanup: "DISCARDED",
    });
    expect(h.client.transcript.map((e) => e.kind)).not.toContain("rollback");
  });
});
