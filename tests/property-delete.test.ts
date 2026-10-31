import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { deleteProperty, observeDeletedProperty } from "@/lib/property/property-api";
import {
  clearDeletedProperty,
  deleteCacheFence,
  deletionBlocksProperty,
  DeleteSession,
  getDeleteSession,
  makeDeleteAttempt,
  PropertyDeleteError,
  propertyDeletionBlocked,
  type DeleteOutcome,
} from "@/lib/property/property-delete";
import { trackFinancialWrite } from "@/lib/property/financial-confirmation";
import { makePropertyAttempt, runParentSave } from "@/lib/property/property-edit";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyRecord,
} from "@/lib/property/property-fields";

const mock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
  filters: [] as [string, string][],
  result: undefined as unknown,
  read: undefined as unknown,
  deletes: vi.fn(),
  select: vi.fn(),
  throws: false,
}));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { from: mock.from, rpc: mock.rpc, auth: { getUser: mock.getUser } },
}));
const row = () =>
  ({
    ...propertySchema.parse({ ...emptyPropertyForm, project_name: "Invented delete parent" }),
    revision: 1,
    id: "p1",
    user_id: "owner1",
    created_at: "2026-10-26T00:00:00Z",
    updated_at: "2026-10-26T00:00:00Z",
  }) as PropertyRecord;
const attempt = () => makeDeleteAttempt("owner1", row());
const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  mock.filters = [];
  mock.throws = false;
  mock.result = { data: row(), error: null };
  mock.read = { data: null, error: null };
  mock.getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner1" } }, error: null });
  mock.deletes.mockReset();
  mock.select.mockReset();
  mock.rpc.mockReset().mockImplementation(async (_name, args) => {
    mock.deletes(args);
    if (mock.throws) throw Error("PRIVATE_LOST_RESPONSE");
    return mock.result;
  });
  mock.from.mockReset().mockImplementation(() => {
    let deleting = false;
    const query = {
      delete: (options: unknown) => {
        deleting = true;
        mock.deletes(options);
        return query;
      },
      eq: (key: string, value: string) => {
        mock.filters.push([key, value]);
        return query;
      },
      select: (columns: string) => {
        mock.select(columns);
        return query;
      },
      maybeSingle: async () => mock.read,
      then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
        if (!deleting) throw Error("Unexpected await");
        return (
          mock.throws
            ? Promise.reject(Error("PRIVATE_LOST_RESPONSE"))
            : Promise.resolve(mock.result)
        ).then(resolve, reject);
      },
    };
    return query;
  });
});
describe("DELETE API contract", () => {
  it("freezes original and identity; requires atomic revision deletion and returned original row", async () => {
    const original = row();
    const a = makeDeleteAttempt("owner1", original);
    original.city = "Changed";
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.original)).toBe(true);
    expect(a.original.city).not.toBe("Changed");
    await expect(deleteProperty(a, () => true)).resolves.toBeUndefined();
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("m4_write_property", {
      p_id: "p1", p_revision: 1, p_table: "properties", p_values: {}, p_delete: true,
    });
    expect(mock.from).not.toHaveBeenCalled();
  });
  it.each(["", "bad", "2026-00-00T00:00:00Z"])(
    "invalid observed timestamp %s never dispatches",
    async (updated_at) => {
      await expect(
        deleteProperty(makeDeleteAttempt("owner1", { ...row(), updated_at }), () => true),
      ).rejects.toMatchObject({ outcome: "not-sent" });
      expect(mock.from).not.toHaveBeenCalled();
    },
  );
  it.each(["", "owner2"])("wrong owner %s never dispatches", async (owner) => {
    await expect(deleteProperty(makeDeleteAttempt(owner, row()), () => true)).rejects.toMatchObject(
      { outcome: "not-sent" },
    );
    expect(mock.from).not.toHaveBeenCalled();
  });
  it.each([null, { id: "owner2" }])("authenticated owner required", async (user) => {
    mock.getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(deleteProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "not-sent",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("navigation/cancel after awaited auth vetoes dispatch", async () => {
    const held = deferred<unknown>();
    mock.getUser.mockReturnValue(held.promise);
    let active = true;
    const p = deleteProperty(attempt(), () => active);
    active = false;
    held.resolve({ data: { user: { id: "owner1" } }, error: null });
    await expect(p).rejects.toMatchObject({ outcome: "not-sent" });
    expect(mock.deletes).not.toHaveBeenCalled();
  });
  it.each(["42501", "23502", "23503", "23505", "23514", "22001", "22P02"])(
    "statement %s is explicitly rejected and private",
    async (code) => {
      mock.result = { data: null, error: { code, message: "PRIVATE_SQL" } };
      await expect(deleteProperty(attempt(), () => true)).rejects.toMatchObject({
        outcome: "rejected",
      });
      await expect(deleteProperty(attempt(), () => true)).rejects.not.toThrow("PRIVATE_SQL");
    },
  );
  it.each(["503", "PGRST116", "unknown", "08006"])(
    "%s cannot establish noncommit",
    async (code) => {
      mock.result = { data: null, error: { code, message: "PRIVATE_SQL" } };
      await expect(deleteProperty(attempt(), () => true)).rejects.toMatchObject({
        outcome: "uncertain",
      });
    },
  );
  it("only explicit database PT409 is conflict", async () => {
    mock.result = { data: null, error: { code: "PT409" } };
    await expect(deleteProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "conflict",
    });
    expect(mock.deletes).toHaveBeenCalledTimes(1);
  });
  it.each([
    undefined,
    null,
    {},
    { data: null, count: 0 },
    { data: [], count: null },
    { data: [row()], count: null },
    { data: [row()], count: 1 },
    { data: [], count: 1 },
    { data: [row(), row()], count: 2 },
    { data: [{ ...row(), id: "p2" }], count: 1 },
    { data: [{ ...row(), user_id: "owner2" }], count: 1 },
    { data: [{ ...row(), updated_at: "different" }], count: 1 },
    { data: [{ ...row(), city: "same-token change" }], count: 1 },
    { data: [{ id: "p1", user_id: "owner1" }], count: 1 },
  ])("malformed/mismatched response stays uncertain: %j", async (result) => {
    mock.result = result;
    await expect(deleteProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "uncertain",
    });
    expect(mock.deletes).toHaveBeenCalledTimes(1);
  });
  it("lost response stays uncertain with no retry", async () => {
    mock.throws = true;
    await expect(deleteProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "uncertain",
    });
    expect(mock.deletes).toHaveBeenCalledTimes(1);
  });
});
describe("separately reviewed authenticated read-only observation", () => {
  it("explicit absence uses owner and ID and sends no DELETE", async () => {
    await expect(observeDeletedProperty(attempt(), () => true)).resolves.toBe(true);
    expect(mock.filters).toEqual([
      ["id", "p1"],
      ["user_id", "owner1"],
    ]);
    expect(mock.select).toHaveBeenCalledWith("id,user_id");
    expect(mock.deletes).not.toHaveBeenCalled();
  });
  it("visible intended row is not absence", async () => {
    mock.read = { data: { id: "p1", user_id: "owner1" }, error: null };
    await expect(observeDeletedProperty(attempt(), () => true)).resolves.toBe(false);
  });
  it.each([
    undefined,
    {},
    { data: undefined },
    { data: null },
    { data: { id: "p2", user_id: "owner1" } },
    { data: { id: "p1", user_id: "owner2" } },
    { data: null, error: { message: "PRIVATE_READ" } },
  ])("failed/malformed/foreign reads cannot confirm %j", async (read) => {
    mock.read = read;
    await expect(observeDeletedProperty(attempt(), () => true)).rejects.not.toThrow("PRIVATE_READ");
  });
  it("expiry and old context cannot turn RLS invisibility into confirmation", async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(observeDeletedProperty(attempt(), () => true)).rejects.toThrow(
      "could not be completed",
    );
    expect(mock.from).not.toHaveBeenCalled();
  });
});
describe("immutable session, duplicate barrier and acknowledgment", () => {
  it("locks synchronously before auth, survives remount/cache clear and is owner/property scoped", async () => {
    const c = client();
    const s = getDeleteSession(c, "owner1", "p1");
    const held = deferred<void>();
    const op = vi.fn(() => held.promise);
    const after = vi.fn();
    const p = s.run(attempt(), op, after);
    await s.run(attempt(), op, after);
    expect(op).toHaveBeenCalledTimes(1);
    expect(s.getSnapshot().outcome).toBe("pending");
    c.clear();
    expect(getDeleteSession(c, "owner1", "p1")).toBe(s);
    expect(getDeleteSession(c, "owner2", "p1")).not.toBe(s);
    expect(getDeleteSession(c, "owner1", "p2")).not.toBe(s);
    held.resolve();
    await p;
    expect(s.getSnapshot().outcome).toBe("deleted");
    await s.run(attempt(), op, after);
    expect(op).toHaveBeenCalledTimes(1);
  });
  it.each(["not-sent", "rejected", "conflict", "uncertain"] as const)(
    "retains %s without executing follow-up",
    async (outcome) => {
      const s = new DeleteSession();
      const followup = vi.fn();
      await s.run(attempt(), () => Promise.reject(new PropertyDeleteError(outcome)), followup);
      expect(s.getSnapshot().outcome).toBe(outcome);
      expect(followup).not.toHaveBeenCalled();
    },
  );
  it("zero-row conflict needs a deliberate fresh-observation reset before a new attempt", async () => {
    const s = new DeleteSession();
    const op = vi.fn().mockRejectedValue(new PropertyDeleteError("conflict"));
    await s.run(attempt(), op, async () => {});
    await s.run(attempt(), op, async () => {});
    expect(op).toHaveBeenCalledTimes(1);
    s.reloadConflict();
    expect(s.getSnapshot().outcome).toBe("idle");
    await s.run(attempt(), op, async () => {});
    expect(op).toHaveBeenCalledTimes(2);
  });
  it("read-only checks cannot clear uncertain state or permit another deletion", async () => {
    const s = new DeleteSession();
    const op = vi.fn().mockRejectedValue(Error("PRIVATE"));
    await s.run(attempt(), op, async () => {});
    await s.check(async () => {});
    await s.run(attempt(), op, async () => {});
    expect(s.getSnapshot().outcome).toBe("uncertain");
    expect(op).toHaveBeenCalledTimes(1);
  });
  it("acknowledgment is retained through failed follow-up, recovery is read-only", async () => {
    const s = new DeleteSession();
    const held = deferred<void>();
    const op = vi.fn().mockResolvedValue(undefined);
    const p = s.run(attempt(), op, () => held.promise);
    await Promise.resolve();
    expect(s.getSnapshot().outcome).toBe("acknowledged");
    held.resolve();
    await p;
    expect(s.getSnapshot().outcome).toBe("deleted");
    const s2 = new DeleteSession();
    await s2.run(attempt(), op, async () => {
      throw Error("PRIVATE");
    });
    expect(s2.getSnapshot().outcome).toBe("deleted-refresh-failed");
    await s2.check(async () => {});
    expect(s2.getSnapshot().outcome).toBe("deleted");
    expect(op).toHaveBeenCalledTimes(2);
  });
  it.each([
    "idle",
    "not-sent",
    "rejected",
    "conflict",
    "pending",
    "uncertain",
    "acknowledged",
    "deleted-refresh-failed",
    "deleted",
  ] as DeleteOutcome[])("availability policy %s", (outcome) => {
    expect(deletionBlocksProperty(outcome)).toBe(
      !["idle", "not-sent", "rejected", "conflict"].includes(outcome),
    );
  });
});
describe("cache, isolation and financial coordination", () => {
  it("cancels old reads and removes only the deleted parent/children; preserves unrelated property/user config", async () => {
    const c = client();
    const old = deferred<unknown>();
    const read = c.fetchQuery({ queryKey: ["financing", "p1"], queryFn: () => old.promise });
    void read.catch(() => {});
    c.setQueryData(["properties"], [row(), { ...row(), id: "p2" }]);
    for (const key of ["properties", "acquisition-costs", "operating-expenses"])
      c.setQueryData([key, "p1"], row());
    c.setQueryData(["financing", "p2"], { untouched: true });
    c.setQueryData(["criteria", "owner1"], { untouched: true });
    await clearDeletedProperty(c, attempt(), () => true, true);
    old.resolve({ late: true });
    await Promise.resolve();
    expect(c.getQueryData(["properties", "p1"])).toBeNull();
    expect(c.getQueryData(["financing", "p1"])).toBeUndefined();
    expect(c.getQueryData(["properties"])).toEqual([{ ...row(), id: "p2" }]);
    expect(c.getQueryData(["financing", "p2"])).toEqual({ untouched: true });
    expect(c.getQueryData(["criteria", "owner1"])).toEqual({ untouched: true });
  });
  it("cache clear plus same key recreation revokes the old deletion fence", async () => {
    const c = client();
    const a = attempt();
    const current = deleteCacheFence(c, a);
    c.clear();
    deleteCacheFence(c, a);
    expect(current()).toBe(false);
    await expect(clearDeletedProperty(c, a, current, true)).rejects.toThrow();
    expect(c.getQueryData(["properties", "p1"])).toBeUndefined();
  });
  it("pending deletion synchronously blocks child writes and parent saves", async () => {
    const c = client();
    const held = deferred<void>();
    const s = getDeleteSession(c, "owner1", "p1");
    const p = s.run(
      attempt(),
      () => held.promise,
      async () => {},
    );
    expect(propertyDeletionBlocked(c, "owner1", "p1")).toBe(true);
    const operation = vi.fn();
    await expect(
      trackFinancialWrite(c, "owner1", "p1", "acquisition", operation),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    await runParentSave(
      c,
      makePropertyAttempt("owner1", row(), { city: "Ipoh" }),
      operation,
      async () => {},
    );
    expect(operation).not.toHaveBeenCalled();
    held.resolve();
    await p;
  });
});
