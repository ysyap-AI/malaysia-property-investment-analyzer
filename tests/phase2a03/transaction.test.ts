import { afterEach, describe, expect, it, vi } from "vitest";
import {
  locationCommand,
  propertyInputFields,
  semanticFields,
} from "../../src/lib/location/contracts";
import { operationHash, propertyInputHash } from "../../src/lib/location/canonical";
import { uuid } from "../../src/lib/location/primitives";
import {
  createDormantTransactionCore,
  provisionalBudgets,
  transactionSql,
} from "../../src/server/location/transaction.server";
import {
  actorId,
  cleared,
  confirmed,
  geocoded,
  none,
  pin,
  propertyId,
  time,
  versionId,
} from "./fixtures";
import { deferred, stateRow, syntheticHarness } from "./transaction-fake";
import type { QueryResult } from "../../src/server/location/ports.server";

afterEach(() => vi.useRealTimers());
const other = uuid("f9000000-0000-0000-0000-000000000009");
const kinds = (h: Awaited<ReturnType<typeof syntheticHarness>>) =>
  h.client.transcript.map((entry) => entry.kind);
const fail = (code: string) => expect.objectContaining({ kind: "FAILURE", code });

describe("I05 synthetic protocol only (not PostgreSQL, authenticated security or concurrency proof)", () => {
  it("a newly verified synthetic owner cannot replay the previous actor's operation", async () => {
    const h = await syntheticHarness();
    await h.run();
    h.store.parent!["user_id"] = other;
    h.actors.set(h.evidence, Object.freeze({ ...h.actor, userId: other }));
    expect(await h.run()).toEqual(fail("OPERATION_CONFLICT"));
  });
  it("preserves the original provider receipt on replay despite equivalent SQL timestamp rendering", async () => {
    const h = await syntheticHarness();
    h.client.registry = {
      id: geocoded.provider_version_id,
      deprecated_at: null,
      approval_state: "APPROVED",
      retention_class: "PERMANENT",
      reviewed_at: time,
      terms_reference: "synthetic",
      review_reference: "synthetic",
      capabilities: ["GEOCODING"],
    };
    h.ports.providerPolicy.permits = () => true;
    const receipt = "2026-10-20T01:02:03Z";
    const input = { ...h.input, payload: { ...geocoded, retrieved_at: receipt } };
    expect(await h.run(input)).toMatchObject({ kind: "COMMITTED" });
    h.store.versions[0]!["retrieved_at"] = time;
    h.client.registry = {}; // replay is not new provider ingestion
    expect(await h.run(input)).toMatchObject({ kind: "COMMITTED", disposition: "DUPLICATE" });
    expect(await h.run({ ...input, payload: { ...input.payload, retrieved_at: time } })).toEqual(
      fail("OPERATION_CONFLICT"),
    );
  });
  it("duplicate COMMIT rejection still reports failure and never mutates storage", async () => {
    const h = await syntheticHarness();
    await h.run();
    const before = structuredClone(h.store);
    h.client.ack = { kind: "REJECTED" };
    expect(await h.run()).toEqual(fail("COMMIT_FAILED"));
    expect(h.store).toEqual(before);
  });
  it("caller cancellation during rollback cannot cancel the independent cleanup signal", async () => {
    const h = await syntheticHarness();
    const controller = new AbortController();
    h.client.failures.set("cas", Error());
    h.client.hooks.set("rollback", () => {
      controller.abort();
    });
    expect(await h.run(h.input, { signal: controller.signal })).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h)).not.toContain("commit");
    expect(kinds(h).slice(-2)).toEqual(["rollback", "release"]);
    expect(h.client.transcript.find((e) => e.kind === "rollback")?.signal?.aborted).toBe(false);
  });
  it("release failure following rollback cannot mask the original stale-state outcome", async () => {
    const h = await syntheticHarness();
    h.store.state = stateRow();
    h.client.failures.set("release", Error());
    expect(await h.run()).toEqual(fail("STALE_EXPECTED_STATE"));
    expect(kinds(h).slice(-3)).toEqual(["rollback", "release", "discard"]);
  });
  it("overall transaction deadline bounds COMMIT even when each preceding statement met its own limit", async () => {
    const h = await syntheticHarness();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const parentEntered = deferred(),
      parentFinish = deferred(),
      commitEntered = deferred(),
      commitFinish = deferred();
    h.client.hooks.set("parent", async () => {
      parentEntered.resolve();
      await parentFinish.promise;
    });
    h.client.hooks.set("commit", async () => {
      commitEntered.resolve();
      await commitFinish.promise;
    });
    const execution = h.run();
    await parentEntered.promise;
    await vi.advanceTimersByTimeAsync(4000);
    parentFinish.resolve();
    await commitEntered.promise;
    expect(h.client.transcript.find((e) => e.kind === "commit")?.timeoutMs).toBeLessThanOrEqual(
      4000,
    );
    await vi.advanceTimersByTimeAsync(4001);
    expect(await execution).toEqual(fail("COMMIT_OUTCOME_UNKNOWN"));
    expect(kinds(h).at(-1)).toBe("discard");
    commitFinish.resolve();
  });
  it("uses one reservation, fixed setup, parent before state, immutable append, pointer CAS and acknowledged COMMIT", async () => {
    const h = await syntheticHarness();
    const result = await h.run();
    expect(result).toMatchObject({
      kind: "COMMITTED",
      disposition: "CREATED",
      operationId: h.input.operationId,
      version: { versionNumber: 1 },
      observedState: { revision: 1 },
      versionIsObservedCurrent: true,
    });
    expect(kinds(h)).toEqual([
      "acquire",
      "begin",
      "setup0",
      "setup1",
      "setup2",
      "setup3",
      "setup4",
      "parent",
      "state",
      "prior",
      "createState",
      "latest",
      "insert",
      "cas",
      "commit",
      "release",
    ]);
    expect(h.ports.connections.acquire).toHaveBeenCalledTimes(1);
    expect(h.client.transcript.find((e) => e.kind === "begin")?.sql).toBe(
      "BEGIN ISOLATION LEVEL READ COMMITTED",
    );
    expect(h.client.transcript.filter((e) => e.kind.startsWith("setup")).map((e) => e.sql)).toEqual(
      transactionSql.setup,
    );
    const inserted = h.store.versions[0]!;
    expect(inserted["operation_hash"]).toBe(await operationHash(h.input, actorId));
    expect(inserted["property_input_hash"]).toBe(await propertyInputHash(h.store.parent));
    expect(inserted["created_by"]).toBe(actorId);
    expect(h.events[0]).toMatchObject({ certainty: "COMMITTED", cleanup: "RELEASED" });
  });
  it("binds hostile private text as data, never identifiers/SQL; generated columns and timestamps are omitted", async () => {
    const h = await syntheticHarness();
    const address = "private '); DROP TABLE public.properties; -- 🏠";
    const input = { ...h.input, payload: { ...none, input_address: address } };
    expect(await h.run(input)).toMatchObject({ kind: "COMMITTED" });
    for (const entry of h.client.transcript) {
      expect(entry.sql ?? "").not.toContain(address);
      if (entry.sql) {
        const indexes = [...entry.sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
        expect(Math.max(0, ...indexes)).toBe(entry.parameters?.length ?? 0);
      }
    }
    const insert = h.client.transcript.find((e) => e.kind === "insert")!;
    expect(insert.parameters?.[7]).toBe(address);
    expect(insert.sql?.split("VALUES")[0]).not.toMatch(/\b(position|created_at|confirmed_at)\b/);
    expect(h.client.transcript.find((e) => e.kind === "cas")?.parameters?.slice(2)).toEqual([
      0,
      null,
    ]);
  });
  it.each([null, {}, { userId: actorId }, "unverified.jwt.value"])(
    "rejects arbitrary authentication evidence %j before reservation",
    async (evidence) => {
      const h = await syntheticHarness();
      expect(await h.core.execute(evidence, h.input)).toEqual(fail("AUTHENTICATION_FAILED"));
      expect(kinds(h)).toEqual([]);
      expect(h.ports.commands.construct).not.toHaveBeenCalled();
    },
  );
  it("sanitizes verifier outage", async () => {
    const h = await syntheticHarness();
    h.ports.actors.verify = async () => {
      throw new Error("private token");
    };
    expect(await h.run()).toEqual(fail("AUTHENTICATION_UNAVAILABLE"));
    expect(kinds(h)).toEqual([]);
  });
  it.each([
    { expected: {} },
    { operationId: "bad" },
    { position: "EWKT" },
    { payload: { ...pin, confirmed_by: other } },
  ])("validates constructed commands before acquisition %j", async (patch) => {
    const h = await syntheticHarness();
    expect(await h.run({ ...h.input, ...patch })).toEqual(fail("VALIDATION_FAILED"));
    expect(kinds(h)).toEqual([]);
  });
  it("freezes actor, expected tokens, identity, provider receipt and payload before acquisition", async () => {
    const h = await syntheticHarness();
    const raw = structuredClone(h.input);
    const before = structuredClone(raw);
    const acquire = h.ports.connections.acquire;
    h.ports.connections.acquire = async (options) => {
      (raw.payload as unknown as Record<string, unknown>)["longitude"] = 0;
      (raw as unknown as Record<string, unknown>)["operationId"] = other;
      expect(Object.isFrozen(h.actor)).toBe(true);
      return acquire(options);
    };
    expect(await h.run(raw)).toMatchObject({ kind: "COMMITTED", operationId: before.operationId });
    expect(h.store.versions[0]!["longitude"]).toBe(before.payload.longitude);
    expect(h.store.versions[0]!["operation_hash"]).toBe(await operationHash(before, actorId));
  });
  it.each(["ABSENT", "EXACT"])(
    "distinguishes %s from existing inert revision-zero state",
    async (kind) => {
      const h = await syntheticHarness();
      h.store.state = stateRow();
      const input =
        kind === "EXACT"
          ? { ...h.input, expected: { kind, revision: 0, currentLocationVersionId: null } }
          : h.input;
      expect(await h.run(input)).toMatchObject(
        kind === "EXACT"
          ? { kind: "COMMITTED", observedState: { revision: 1 } }
          : fail("STALE_EXPECTED_STATE"),
      );
      expect(kinds(h)).not.toContain("createState");
    },
  );
  it("EXACT zero is stale when state is absent", async () => {
    const h = await syntheticHarness();
    expect(
      await h.run({
        ...h.input,
        expected: { kind: "EXACT", revision: 0, currentLocationVersionId: null },
      }),
    ).toEqual(fail("STALE_EXPECTED_STATE"));
  });
  it("exact duplicate returns original row/current observation without insert, update, allocation or restamp", async () => {
    const h = await syntheticHarness();
    const first = await h.run();
    const snapshot = structuredClone(h.store);
    h.client.transcript = [];
    expect(await h.run()).toMatchObject({ ...first, disposition: "DUPLICATE" });
    expect(h.store).toEqual(snapshot);
    expect(kinds(h)).toEqual([
      "acquire",
      "begin",
      "setup0",
      "setup1",
      "setup2",
      "setup3",
      "setup4",
      "parent",
      "state",
      "prior",
      "commit",
      "release",
    ]);
  });
  it("append uses exact pointer/revision and allocates next history version", async () => {
    const h = await syntheticHarness();
    await h.run();
    const original = h.store.versions[0]!["id"];
    const input = locationCommand(
      {
        ...h.input,
        operationId: other,
        expected: { kind: "EXACT", revision: 1, currentLocationVersionId: original },
        payload: { ...pin, change_reason: "LOCATION_CORRECTED" },
      },
      actorId,
    );
    expect(await h.run(input)).toMatchObject({
      kind: "COMMITTED",
      disposition: "CREATED",
      version: { versionNumber: 2 },
      observedState: { revision: 2 },
    });
    expect(h.store.versions).toHaveLength(2);
    h.client.transcript = [];
    expect(await h.run()).toMatchObject({
      kind: "COMMITTED",
      disposition: "DUPLICATE",
      version: { id: original, versionNumber: 1 },
      observedState: { revision: 2 },
      versionIsObservedCurrent: false,
    });
    expect(kinds(h)).not.toContain("cas");
  });
  it.each(["revision", "pointer"])("rejects stale exact %s without rebasing", async (field) => {
    const h = await syntheticHarness();
    await h.run();
    const expected = {
      kind: "EXACT",
      revision: field === "revision" ? 0 : 1,
      currentLocationVersionId:
        field === "pointer" ? null : h.store.state!["current_location_version_id"],
    };
    expect(await h.run({ ...h.input, operationId: other, expected })).toEqual(
      fail("STALE_EXPECTED_STATE"),
    );
    expect(h.store.versions).toHaveLength(1);
  });
  it.each(["payload", "expected", "actor"])(
    "same ID conflicting %s is rejected before fresh-state checking",
    async (field) => {
      const h = await syntheticHarness();
      await h.run();
      if (field === "actor") h.store.versions[0]!["created_by"] = other;
      const input =
        field === "payload"
          ? { ...h.input, payload: { ...pin, longitude: 102 } }
          : field === "expected"
            ? {
                ...h.input,
                expected: { kind: "EXACT", revision: 0, currentLocationVersionId: null },
              }
            : h.input;
      expect(await h.run(input)).toEqual(fail("OPERATION_CONFLICT"));
      expect(h.store.versions).toHaveLength(1);
    },
  );
  it.each([false, true])(
    "synthetic two-user denial takes precedence over duplicate=%s",
    async (duplicate) => {
      const h = await syntheticHarness();
      if (duplicate) await h.run();
      h.store.parent!["user_id"] = other;
      expect(await h.run()).toEqual(fail("OWNERSHIP_DENIED"));
      expect(kinds(h).slice(kinds(h).lastIndexOf("acquire"))).not.toContain("state");
    },
  );
  it.each([false, true])("deleted parent fails before replay; duplicate=%s", async (duplicate) => {
    const h = await syntheticHarness();
    if (duplicate) await h.run();
    h.store.parent = null;
    expect(await h.run()).toEqual(fail("PROPERTY_DELETED_OR_OWNERSHIP_CHANGED"));
  });
  it.each(propertyInputFields)(
    "locked current %s change rejects even an exact replay",
    async (field) => {
      const h = await syntheticHarness();
      await h.run();
      h.store.parent![field] = "changed";
      expect(await h.run()).toEqual(fail("INPUT_CHANGED"));
    },
  );
  it("financial-only edit preserves applicability", async () => {
    const h = await syntheticHarness();
    Object.assign(h.store.parent!, {
      purchase_price: 999999,
      monthly_rent: 3500,
      updated_at: "2099-01-01",
    });
    expect(await h.run()).toMatchObject({ kind: "COMMITTED" });
  });
  it.each([pin, confirmed, none, cleared])(
    "publishes latest intent status $confirmation_status",
    async (payload) => {
      const h = await syntheticHarness();
      expect(await h.run({ ...h.input, payload })).toMatchObject({
        kind: "COMMITTED",
        version: { confirmation: { kind: payload.confirmation_status } },
        versionIsObservedCurrent: true,
      });
    },
  );
  it.each(["version", "revision"])("rejects %s overflow before history INSERT", async (kind) => {
    const h = await syntheticHarness();
    h.store.state = stateRow(kind === "revision" ? Number.MAX_SAFE_INTEGER : 0);
    if (kind === "version")
      h.client.overrides.set("latest", { rowCount: 1, rows: [{ latest: "9007199254740991" }] });
    expect(
      await h.run({
        ...h.input,
        expected: {
          kind: "EXACT",
          revision: kind === "revision" ? Number.MAX_SAFE_INTEGER : 0,
          currentLocationVersionId: null,
        },
      }),
    ).toEqual(fail("VERSION_LIMIT_REACHED"));
    expect(kinds(h)).not.toContain("insert");
  });
  it("duplicates remain readable at revision ceiling", async () => {
    const h = await syntheticHarness();
    await h.run();
    h.store.state!["state_revision"] = "9007199254740991";
    expect(await h.run()).toMatchObject({
      kind: "COMMITTED",
      disposition: "DUPLICATE",
      observedState: { revision: Number.MAX_SAFE_INTEGER },
    });
  });
  it("INITIAL_INPUT cannot be used after first history", async () => {
    const h = await syntheticHarness();
    await h.run();
    expect(
      await h.run({
        ...h.input,
        operationId: other,
        expected: {
          kind: "EXACT",
          revision: 1,
          currentLocationVersionId: h.store.state!["current_location_version_id"],
        },
      }),
    ).toEqual(fail("VALIDATION_FAILED"));
  });
  it.each(["denied", "allowed", "withdrawn"])(
    "rechecks provider registry and injected reviewed field policy: %s",
    async (mode) => {
      const h = await syntheticHarness();
      h.client.registry = {
        id: geocoded.provider_version_id,
        deprecated_at: mode === "withdrawn" ? time : null,
        approval_state: "PROVISIONAL",
        retention_class: "PERMANENT",
        reviewed_at: time,
        terms_reference: "synthetic-terms",
        review_reference: "synthetic-review",
        capabilities: ["GEOCODING"],
      };
      h.ports.providerPolicy.permits = vi.fn(() => mode === "allowed");
      expect(await h.run({ ...h.input, payload: geocoded })).toMatchObject(
        mode === "allowed" ? { kind: "COMMITTED" } : fail("PROVIDER_INELIGIBLE"),
      );
      const provider = h.client.transcript.find((e) => e.kind === "provider")!;
      expect(provider.parameters).toEqual([geocoded.provider_version_id]);
      expect(provider.sql).not.toMatch(/FOR (UPDATE|SHARE)/);
    },
  );
  it.each([
    "acquire",
    "begin",
    "setup0",
    "setup1",
    "setup2",
    "setup3",
    "setup4",
    "parent",
    "state",
    "prior",
    "createState",
    "latest",
    "insert",
    "cas",
  ])("statement/acquisition failure at %s preserves storage and reports failure", async (at) => {
    const h = await syntheticHarness();
    const before = structuredClone(h.store);
    h.client.failures.set(at, new Error("synthetic unfiltered driver error"));
    expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(h.store).toEqual(before);
    expect(kinds(h)).not.toContain("commit");
    if (at === "acquire") expect(kinds(h)).toEqual(["acquire"]);
    else if (at === "begin") expect(kinds(h).slice(-1)).toEqual(["discard"]);
    else expect(kinds(h).slice(-2)).toEqual(["rollback", "release"]);
  });
  it.each([0, 2])(
    "CAS affected-row count %i is integrity failure with whole-attempt rollback",
    async (count) => {
      const h = await syntheticHarness();
      h.client.overrides.set("cas", {
        rowCount: count,
        rows: Array.from({ length: count }, () => stateRow(1, versionId)),
      });
      expect(await h.run()).toEqual(fail("INTEGRITY_FAILURE"));
      expect(h.store.state).toBeNull();
      expect(h.store.versions).toEqual([]);
    },
  );
  it.each([
    { rowCount: 1, rows: [] },
    { rowCount: 1, rows: [stateRow(9, versionId)] },
    { rowCount: 1, rows: [{ ...stateRow(1, versionId), property_id: other }] },
    { rowCount: 1, rows: [{ ...stateRow(1, versionId), state_revision: "9007199254740992" }] },
  ])("invalid CAS RETURNING fails closed %#", async (response) => {
    const h = await syntheticHarness();
    h.client.overrides.set("cas", response);
    expect(await h.run()).toEqual(fail("INTEGRITY_FAILURE"));
    expect(h.store.versions).toEqual([]);
  });
  it("corrupt state pointer lineage is rejected", async () => {
    const h = await syntheticHarness();
    h.store.state = stateRow(1, versionId);
    expect(await h.run()).toEqual(fail("INTEGRITY_FAILURE"));
  });
  it.each([
    "id",
    "property_id",
    "created_by",
    "operation_id",
    "operation_hash",
    "property_input_hash",
    "version_number",
    "longitude",
    "created_at",
    "confirmed_at",
  ])("validates INSERT RETURNING field %s", async (field) => {
    const h = await syntheticHarness();
    const original = h.client.query.bind(h.client);
    h.client.query = async (sql, parameters, options) => {
      const result = await original(sql, parameters, options);
      return sql === transactionSql.insert
        ? {
            ...result,
            rows: [{ ...result.rows[0], [field]: field === "confirmed_at" ? time : "corrupt" }],
          }
        : result;
    };
    expect(await h.run()).toEqual(fail("INTEGRITY_FAILURE"));
    expect(kinds(h)).not.toContain("commit");
  });
  it.each(["REJECTED", "ROLLED_BACK"] as const)("known COMMIT %s is not success", async (kind) => {
    const h = await syntheticHarness();
    h.client.ack = { kind };
    expect(await h.run()).toEqual(fail("COMMIT_FAILED"));
    expect(h.store.versions).toEqual([]);
    expect(kinds(h).slice(-2)).toEqual(
      kind === "REJECTED" ? ["rollback", "release"] : ["commit", "release"],
    );
  });
  it.each([false, true])(
    "lost COMMIT acknowledgement, applied=%s, is unknown without rollback and recovered by SAME identity",
    async (applied) => {
      const h = await syntheticHarness();
      h.client.unknownApplied = applied;
      h.client.failures.set("commit", new Error("connection lost"));
      const result = await h.run();
      expect(result).toMatchObject({
        kind: "FAILURE",
        code: "COMMIT_OUTCOME_UNKNOWN",
        retry: "RECONCILE_SAME_ID",
      });
      expect(kinds(h).slice(-2)).toEqual(["commit", "discard"]);
      expect(kinds(h)).not.toContain("rollback");
      const original = h.input;
      h.replaceClient();
      expect(await h.run(original)).toMatchObject({
        kind: "COMMITTED",
        disposition: applied ? "DUPLICATE" : "CREATED",
        operationId: original.operationId,
      });
      expect(h.store.versions).toHaveLength(1);
    },
  );
  it("UNKNOWN normal completion is unknown; even a SQLSTATE exception at COMMIT is not assumed to be a server rejection", async () => {
    const h = await syntheticHarness();
    h.client.ack = { kind: "UNKNOWN" };
    expect(await h.run()).toEqual(fail("COMMIT_OUTCOME_UNKNOWN"));
    h.replaceClient();
    h.client.failures.set("commit", { code: "23503", message: "uncertain transport wrapper" });
    expect(await h.run()).toEqual(fail("COMMIT_OUTCOME_UNKNOWN"));
  });
  it("quarantined connection cannot be reused for a repeated call", async () => {
    const h = await syntheticHarness();
    h.client.failures.set("commit", Error());
    await h.run();
    h.client.failures.clear();
    h.client.transcript = [];
    expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h)).toEqual(["acquire", "discard"]);
  });
  it("rollback failure discards; release failure after confirmed commit preserves success", async () => {
    const h = await syntheticHarness();
    h.client.failures.set("insert", Error());
    h.client.failures.set("rollback", Error());
    expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h).slice(-2)).toEqual(["rollback", "discard"]);
    h.replaceClient();
    h.client.failures.set("release", Error());
    h.client.failures.set("discard", Error());
    expect(await h.run()).toMatchObject({ kind: "COMMITTED" });
    expect(kinds(h).slice(-3)).toEqual(["commit", "release", "discard"]);
    expect(h.events.at(-1)).toMatchObject({ certainty: "COMMITTED", cleanup: "FAILED" });
  });
  it.each(["40001", "40P01", "55P03", "57014", "23505", "23503", "23514"])(
    "SQLSTATE %s uses controlled stage-aware advice, no automatic retry",
    async (code) => {
      const h = await syntheticHarness();
      h.client.failures.set("insert", { code, message: "secret" });
      expect(await h.run()).toMatchObject({
        kind: "FAILURE",
        code: ["55P03", "57014"].includes(code) ? "DATABASE_BUSY" : "TRANSACTION_FAILED",
        retry: ["40001", "40P01", "55P03", "57014"].includes(code)
          ? "SAME_ID_AFTER_BACKOFF"
          : "DO_NOT_RETRY",
      });
      expect(h.ports.connections.acquire).toHaveBeenCalledTimes(1);
    },
  );
  it("no transient retry advice when rollback was not acknowledged", async () => {
    const h = await syntheticHarness();
    h.client.failures.set("insert", { code: "40001" });
    h.client.failures.set("rollback", Error());
    expect(await h.run()).toMatchObject({ kind: "FAILURE", retry: "DO_NOT_RETRY" });
  });
  it("no successful response before pending COMMIT acknowledgement", async () => {
    const h = await syntheticHarness();
    const entered = deferred(),
      finish = deferred();
    h.client.hooks.set("commit", async () => {
      entered.resolve();
      await finish.promise;
    });
    let settled = false;
    const execution = h.run().then((value) => {
      settled = true;
      return value;
    });
    await entered.promise;
    expect(settled).toBe(false);
    expect(h.store.versions).toEqual([]);
    expect(kinds(h)).not.toContain("release");
    finish.resolve();
    expect(await execution).toMatchObject({ kind: "COMMITTED" });
  });
  it.each(["parent", "insert", "cas", "commit"])(
    "cancellation during %s discards without false rollback",
    async (at) => {
      const h = await syntheticHarness();
      const entered = deferred(),
        finish = deferred();
      const controller = new AbortController();
      h.client.hooks.set(at, async () => {
        entered.resolve();
        await finish.promise;
      });
      const execution = h.run(h.input, { signal: controller.signal });
      await entered.promise;
      controller.abort();
      expect(await execution).toEqual(
        fail(at === "commit" ? "COMMIT_OUTCOME_UNKNOWN" : "DATABASE_BUSY"),
      );
      expect(kinds(h).slice(-1)).toEqual(["discard"]);
      expect(kinds(h)).not.toContain("rollback");
      finish.resolve();
    },
  );
  it("pre-cancelled invocation acquires nothing", async () => {
    const h = await syntheticHarness();
    const controller = new AbortController();
    controller.abort();
    expect(await h.run(h.input, { signal: controller.signal })).toEqual(
      fail("AUTHENTICATION_UNAVAILABLE"),
    );
    expect(kinds(h)).toEqual([]);
  });
  it("acquisition timeout discards a late acquired client", async () => {
    const h = await syntheticHarness();
    vi.useFakeTimers();
    const entered = deferred(),
      finish = deferred();
    h.client.hooks.set("acquire", async () => {
      entered.resolve();
      await finish.promise;
    });
    const execution = h.run();
    await entered.promise;
    await vi.advanceTimersByTimeAsync(provisionalBudgets.acquireMs + 1);
    expect(await execution).toEqual(fail("DATABASE_BUSY"));
    finish.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(kinds(h)).toEqual(["acquire", "discard"]);
  });
  it.each(["parent", "commit", "rollback", "release", "discard"])(
    "bounded %s timeout preserves certainty and cleanup",
    async (at) => {
      const h = await syntheticHarness();
      vi.useFakeTimers();
      const entered = deferred(),
        finish = deferred();
      if (at === "rollback") h.client.failures.set("insert", Error());
      if (at === "discard") h.client.failures.set("begin", Error());
      h.client.hooks.set(at, async () => {
        entered.resolve();
        await finish.promise;
      });
      const execution = h.run();
      await entered.promise;
      await vi.advanceTimersByTimeAsync(
        at === "parent" || at === "commit"
          ? provisionalBudgets.statementMs + 1
          : provisionalBudgets.cleanupMs + 1,
      );
      expect(await execution).toMatchObject(
        at === "release"
          ? { kind: "COMMITTED" }
          : fail(
              at === "commit"
                ? "COMMIT_OUTCOME_UNKNOWN"
                : at === "parent"
                  ? "DATABASE_BUSY"
                  : "TRANSACTION_FAILED",
            ),
      );
      expect(kinds(h).at(-1)).toBe("discard");
      finish.resolve();
    },
  );
  it("overall deadline stops later statements; numeric budgets are only fake-tested", async () => {
    const h = await syntheticHarness();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const entered = deferred(),
      finish = deferred();
    h.client.hooks.set("parent", async () => {
      entered.resolve();
      await finish.promise;
    });
    const execution = h.run();
    await entered.promise;
    await vi.advanceTimersByTimeAsync(4000);
    finish.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(await execution).toMatchObject({ kind: "COMMITTED" });
    const casEntry = h.client.transcript.find((e) => e.kind === "cas");
    expect(casEntry?.timeoutMs).toBeLessThanOrEqual(4000);
  });
});

describe("CORRECTION-01 synthetic invocation ownership (no real pool or PostgreSQL proof)", () => {
  // Barriers establish ordering; fake timers only expire/flush bounded protocol work.
  function pause(h: Awaited<ReturnType<typeof syntheticHarness>>, at: string) {
    const entered = deferred(),
      finish = deferred();
    h.client.hooks.set(at, async () => {
      entered.resolve();
      await finish.promise;
    });
    return { entered: entered.promise, finish: () => finish.resolve() };
  }
  async function aliasOnly(h: Awaited<ReturnType<typeof syntheticHarness>>, run = () => h.run()) {
    const before = h.client.transcript.length;
    expect(await run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h).slice(before)).toEqual(["acquire"]);
    expect(h.events.at(-1)).toMatchObject({
      stage: "ACQUIRE",
      cleanup: "NONE",
      certainty: "NOT_COMMITTED",
    });
  }

  it("AUDIT-F01: repeated alias rejection preserves A through confirmed COMMIT and clean reuse", async () => {
    const h = await syntheticHarness();
    const commit = pause(h, "commit");
    let settled = false;
    const a = h.run().then((result) => {
      settled = true;
      return result;
    });
    await commit.entered;
    for (let i = 0; i < 5; i++) await aliasOnly(h);
    expect(settled).toBe(false);
    expect(h.store.versions).toEqual([]);
    expect(kinds(h)).not.toContain("release");
    commit.finish();
    expect(await a).toMatchObject({ kind: "COMMITTED", disposition: "CREATED" });
    expect(h.store.versions).toHaveLength(1);
    expect(kinds(h).filter((k) => k === "release")).toHaveLength(1);
    expect(kinds(h)).not.toContain("discard");
    expect(await h.run()).toMatchObject({ kind: "COMMITTED", disposition: "DUPLICATE" });
  });

  it("ownership guard applies across separate core factories sharing a connection", async () => {
    const h = await syntheticHarness();
    const commit = pause(h, "commit");
    const a = h.run();
    await commit.entered;
    const otherCore = createDormantTransactionCore(h.ports);
    await aliasOnly(h, () => otherCore.execute(h.evidence, h.input));
    commit.finish();
    expect(await a).toMatchObject({ kind: "COMMITTED" });
  });

  it("two acquisitions resolving together claim the object atomically before any SQL", async () => {
    const h = await syntheticHarness();
    const bothEntered = deferred(),
      acquired = deferred();
    let count = 0;
    h.client.hooks.set("acquire", async () => {
      if (++count === 2) bothEntered.resolve();
      await acquired.promise;
    });
    const commit = pause(h, "commit");
    const first = h.run(),
      second = h.run();
    await bothEntered.promise;
    acquired.resolve();
    await commit.entered;
    expect(await Promise.race([first, second])).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h).filter((k) => k === "begin")).toHaveLength(1);
    expect(kinds(h)).not.toContain("discard");
    commit.finish();
    expect((await Promise.all([first, second])).filter((r) => r.kind === "COMMITTED")).toHaveLength(
      1,
    );
    expect(h.store.versions).toHaveLength(1);
  });

  it("rollback acknowledgement precedes owning release and aliases cannot erase the claim", async () => {
    const h = await syntheticHarness();
    h.client.failures.set("insert", Error());
    const rollback = pause(h, "rollback"),
      release = pause(h, "release");
    const a = h.run();
    await rollback.entered;
    await aliasOnly(h);
    expect(kinds(h)).not.toContain("release");
    expect(h.client.active).not.toBeNull();
    rollback.finish();
    await release.entered;
    expect(h.client.active).toBeNull();
    await aliasOnly(h);
    release.finish();
    expect(await a).toEqual(fail("TRANSACTION_FAILED"));
    expect(h.store.versions).toEqual([]);
    h.client.failures.clear();
    expect(await h.run()).toMatchObject({ kind: "COMMITTED" });
  });

  it("release acknowledgement keeps ownership until completion, then a new owner stays protected", async () => {
    const h = await syntheticHarness();
    const release = pause(h, "release");
    const a = h.run();
    await release.entered;
    expect(h.store.versions).toHaveLength(1);
    for (let i = 0; i < 3; i++) await aliasOnly(h);
    release.finish();
    expect(await a).toMatchObject({ kind: "COMMITTED" });
    const commit = pause(h, "commit");
    const next = h.run();
    await commit.entered;
    await aliasOnly(h);
    commit.finish();
    expect(await next).toMatchObject({ kind: "COMMITTED", disposition: "DUPLICATE" });
    expect(kinds(h)).not.toContain("discard");
  });

  it.each(["UNKNOWN", "REJECTED", "COMMITTED"] as const)(
    "owner COMMIT %s retains distinct certainty after foreign alias rejection",
    async (kind) => {
      const h = await syntheticHarness();
      h.client.ack = { kind };
      const commit = pause(h, "commit");
      const a = h.run();
      await commit.entered;
      await aliasOnly(h);
      commit.finish();
      expect(await a).toMatchObject(
        kind === "COMMITTED"
          ? { kind: "COMMITTED" }
          : fail(kind === "UNKNOWN" ? "COMMIT_OUTCOME_UNKNOWN" : "COMMIT_FAILED"),
      );
      expect(h.events.at(-1)).toMatchObject({
        certainty:
          kind === "UNKNOWN" ? "UNKNOWN" : kind === "COMMITTED" ? "COMMITTED" : "NOT_COMMITTED",
        cleanup: kind === "UNKNOWN" ? "DISCARDED" : "RELEASED",
      });
      expect(h.store.versions).toHaveLength(kind === "COMMITTED" ? 1 : 0);
      expect(kinds(h).includes("rollback")).toBe(kind === "REJECTED");
    },
  );

  it.each([false, true])(
    "uncertain owner alone discards; failed discard=%s never permits reuse",
    async (failed) => {
      const h = await syntheticHarness();
      h.client.ack = { kind: "UNKNOWN" };
      if (failed) h.client.failures.set("discard", Error());
      const discard = pause(h, "discard");
      const a = h.run();
      await discard.entered;
      await aliasOnly(h);
      await aliasOnly(h);
      discard.finish();
      expect(await a).toEqual(fail("COMMIT_OUTCOME_UNKNOWN"));
      expect(kinds(h).filter((k) => k === "discard")).toHaveLength(1);
      expect(h.events.at(-1)).toMatchObject({
        cleanup: failed ? "FAILED" : "DISCARDED",
        certainty: "UNKNOWN",
      });
      h.client.failures.clear();
      const before = h.client.transcript.length;
      expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
      expect(kinds(h).slice(before)).toEqual(["acquire", "discard"]);
    },
  );

  it.each([false, true])(
    "release exception falls back to owner-only discard; discard exception=%s",
    async (failed) => {
      const h = await syntheticHarness();
      h.client.failures.set("release", Error());
      if (failed) h.client.failures.set("discard", Error());
      const release = pause(h, "release"),
        discard = pause(h, "discard");
      const a = h.run();
      await release.entered;
      await aliasOnly(h);
      release.finish();
      await discard.entered;
      await aliasOnly(h);
      discard.finish();
      expect(await a).toMatchObject({ kind: "COMMITTED" });
      expect(kinds(h).filter((k) => k === "release")).toHaveLength(1);
      expect(kinds(h).filter((k) => k === "discard")).toHaveLength(1);
      h.client.failures.clear();
      const before = h.client.transcript.length;
      expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
      expect(kinds(h).slice(before)).toEqual(["acquire", "discard"]);
    },
  );

  it("failed acquisition creates no ownership and cannot disturb an existing owner", async () => {
    const h = await syntheticHarness();
    const commit = pause(h, "commit");
    const a = h.run();
    await commit.entered;
    h.client.failures.set("acquire", Error());
    await aliasOnly(h);
    h.client.failures.clear();
    await aliasOnly(h);
    commit.finish();
    expect(await a).toMatchObject({ kind: "COMMITTED" });
    expect(await h.run()).toMatchObject({ kind: "COMMITTED", disposition: "DUPLICATE" });
  });

  it.each(["timeout", "cancel"])(
    "late %s acquisition of an active alias has no lifecycle authority",
    async (mode) => {
      const h = await syntheticHarness();
      vi.useFakeTimers();
      const acquire = pause(h, "acquire");
      const controller = new AbortController();
      const late = h.run(h.input, { signal: controller.signal });
      await acquire.entered;
      if (mode === "cancel") controller.abort();
      else await vi.advanceTimersByTimeAsync(provisionalBudgets.acquireMs + 1);
      expect(await late).toEqual(fail("DATABASE_BUSY"));
      h.client.hooks.delete("acquire");
      const commit = pause(h, "commit");
      const a = h.run();
      await commit.entered;
      const before = h.client.transcript.length;
      acquire.finish();
      await vi.advanceTimersByTimeAsync(0);
      expect(kinds(h).slice(before)).toEqual([]);
      await aliasOnly(h);
      commit.finish();
      expect(await a).toMatchObject({ kind: "COMMITTED" });
      expect(kinds(h)).not.toContain("discard");
    },
  );

  it("late unowned acquisition claims only for discard and cannot be resurrected after discard failure", async () => {
    const h = await syntheticHarness();
    vi.useFakeTimers();
    const acquire = pause(h, "acquire"),
      discard = pause(h, "discard");
    h.client.failures.set("discard", Error());
    const late = h.run();
    await acquire.entered;
    await vi.advanceTimersByTimeAsync(provisionalBudgets.acquireMs + 1);
    expect(await late).toEqual(fail("DATABASE_BUSY"));
    h.client.hooks.delete("acquire");
    acquire.finish();
    await discard.entered;
    await aliasOnly(h);
    discard.finish();
    await vi.advanceTimersByTimeAsync(0);
    h.client.failures.clear();
    expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h)).not.toContain("begin");
    expect(kinds(h).filter((k) => k === "discard")).toHaveLength(2);
  });

  it("cancelled pending SQL remains quarantined during and after owner discard", async () => {
    const h = await syntheticHarness();
    vi.useFakeTimers();
    const parent = pause(h, "parent"),
      discard = pause(h, "discard");
    const controller = new AbortController();
    const a = h.run(h.input, { signal: controller.signal });
    await parent.entered;
    controller.abort();
    await discard.entered;
    await aliasOnly(h);
    discard.finish();
    expect(await a).toEqual(fail("DATABASE_BUSY"));
    parent.finish();
    await vi.advanceTimersByTimeAsync(0);
    const before = h.client.transcript.length;
    expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(kinds(h).slice(before)).toEqual(["acquire", "discard"]);
    expect(kinds(h).filter((k) => k === "begin")).toHaveLength(1);
    expect(kinds(h)).not.toContain("release");
    expect(h.store.versions).toEqual([]);
  });

  it("timed-out release and its late completion cannot clear another active connection's ownership", async () => {
    const h = await syntheticHarness();
    vi.useFakeTimers();
    const old = h.client;
    const release = pause(h, "release");
    const a = h.run();
    await release.entered;
    await vi.advanceTimersByTimeAsync(provisionalBudgets.cleanupMs + 1);
    expect(await a).toMatchObject({ kind: "COMMITTED" });
    expect(old.transcript.at(-1)?.kind).toBe("discard");
    h.replaceClient();
    const commit = pause(h, "commit");
    const next = h.run();
    await commit.entered;
    release.finish();
    await vi.advanceTimersByTimeAsync(0);
    await aliasOnly(h);
    // Returning the old object still fails even after its delayed release resolves.
    const acquire = h.ports.connections.acquire;
    h.ports.connections.acquire = async (options) => {
      await old.step("acquire", options);
      return old;
    };
    expect(await h.run()).toEqual(fail("TRANSACTION_FAILED"));
    expect(old.transcript.slice(-2).map((e) => e.kind)).toEqual(["acquire", "discard"]);
    h.ports.connections.acquire = acquire;
    await aliasOnly(h);
    commit.finish();
    expect(await next).toMatchObject({ kind: "COMMITTED", disposition: "DUPLICATE" });
  });

  it("concurrent independent connections complete and clean up independently", async () => {
    const a = await syntheticHarness(),
      b = await syntheticHarness();
    const first = pause(a, "commit"),
      second = pause(b, "commit");
    const runA = a.run(),
      runB = b.run();
    await Promise.all([first.entered, second.entered]);
    await aliasOnly(a);
    first.finish();
    expect(await runA).toMatchObject({ kind: "COMMITTED" });
    expect(kinds(b)).not.toContain("release");
    await aliasOnly(b);
    second.finish();
    expect(await runB).toMatchObject({ kind: "COMMITTED" });
    for (const h of [a, b]) {
      expect(h.store.versions).toHaveLength(1);
      expect(kinds(h).filter((k) => k === "release")).toHaveLength(1);
      expect(kinds(h)).not.toContain("discard");
    }
  });

  it("AUDIT-G01: fake CAS rejects wrong property binding without mutation, then accepts correct SQL order", async () => {
    const h = await syntheticHarness();
    h.store.state = stateRow();
    const options = { signal: new AbortController().signal, timeoutMs: 1000 };
    await h.client.query(transactionSql.begin, [], options);
    const before = structuredClone(h.client.active);
    expect(transactionSql.cas).toContain(
      "SET current_location_version_id = $2 WHERE property_id = $1 AND state_revision = $3 AND current_location_version_id IS NOT DISTINCT FROM $4",
    );
    expect(await h.client.query(transactionSql.cas, [other, versionId, 0, null], options)).toEqual({
      rows: [],
      rowCount: 0,
    });
    expect(h.client.active).toEqual(before);
    const right = await h.client.query(
      transactionSql.cas,
      [propertyId, versionId, 0, null],
      options,
    );
    expect(right).toMatchObject({
      rowCount: 1,
      rows: [
        { property_id: propertyId, state_revision: "1", current_location_version_id: versionId },
      ],
    });
    await h.client.rollback(options);
    expect(h.store.state).toEqual(stateRow());
  });
});
