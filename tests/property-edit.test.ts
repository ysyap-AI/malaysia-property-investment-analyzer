import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { updateProperty, getProperty } from "@/lib/property/property-api";
import {
  makePropertyAttempt,
  parentConfirmationKey,
  parentBlocksAnalysis,
  runParentSave,
} from "@/lib/property/property-edit";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyRecord,
  type PropertyPatch,
} from "@/lib/property/property-fields";
const mock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
  payload: {} as Record<string, unknown>,
  filters: [] as [string, unknown][],
  row: null as Record<string, unknown> | null,
  error: null as { code: string; message: string } | null,
  throws: false,
  mismatch: false,
}));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { from: mock.from, rpc: mock.rpc, auth: { getUser: mock.getUser } },
}));
const original = () =>
  ({
    ...propertySchema.parse({ ...emptyPropertyForm, project_name: "Invented original" }),
    revision: 1,
    id: "p1",
    user_id: "owner1",
    created_at: "2026-10-26T00:00:00Z",
    updated_at: "2026-10-26T00:00:00Z",
  }) as PropertyRecord;
const attempt = () => makePropertyAttempt("owner1", original(), { city: "Ipoh" });
beforeEach(() => {
  mock.payload = {};
  mock.filters = [];
  mock.row = original();
  mock.error = null;
  mock.throws = false;
  mock.mismatch = false;
  mock.getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner1" } }, error: null });
  mock.rpc.mockReset().mockImplementation(async (_name, args) => {
    mock.payload = args.p_values;
    mock.filters = [["id", args.p_id], ["revision", args.p_revision]];
    if (mock.throws) throw Error("private response");
    if (mock.error) return { data: null, error: mock.error };
    if (!mock.row || mock.row.revision !== args.p_revision)
      return { data: null, error: { code: "PT409" } };
    mock.row = { ...mock.row, ...mock.payload, revision: args.p_revision + 1, updated_at: "2026-10-26T00:00:01Z" };
    return { data: { record: mock.mismatch ? { ...mock.row, city: "mismatch" } : mock.row, revision: args.p_revision + 1 }, error: null };
  });
  mock.from.mockReset().mockImplementation(() => {
    const query = {
      update: (p: Record<string, unknown>) => {
        mock.payload = p;
        return query;
      },
      eq: (key: string, value: unknown) => {
        mock.filters.push([key, value]);
        return query;
      },
      select: () => query,
      maybeSingle: async () => {
        if (mock.throws) throw new Error("private response");
        if (mock.error) return { data: null, error: mock.error };
        if (!mock.row || !mock.filters.every(([k, v]) => mock.row![k] === v))
          return { data: null, error: null };
        mock.row = { ...mock.row, ...mock.payload, updated_at: "2026-10-26T00:00:01Z" };
        return { data: mock.mismatch ? { ...mock.row, city: "mismatch" } : mock.row, error: null };
      },
    };
    return query;
  });
});
describe("parent API evidence and deliberate PATCH", () => {
  it("freezes original context and patch, sends owner-checked id/original revision", async () => {
    const a = attempt();
    expect(Object.isFrozen(a.patch)).toBe(true);
    expect(Object.isFrozen(a.original)).toBe(true);
    await expect(updateProperty(a, () => true)).resolves.toMatchObject({ city: "Ipoh" });
    expect(mock.payload).toEqual({ city: "Ipoh" });
    expect(mock.filters).toEqual([
      ["id", "p1"],
      ["revision", a.original.revision],
    ]);
  });
  it.each([
    { city: "x".repeat(101) },
    { city: undefined },
    { user_id: "private" },
    {},
    { asking_price: -1 },
  ])("invalid patch is not sent", async (patch) => {
    await expect(
      updateProperty(
        makePropertyAttempt("owner1", original(), patch as unknown as PropertyPatch),
        () => true,
      ),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("identity and lifetime checks after awaited authentication veto dispatch", async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: "owner2" } }, error: null });
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "not-sent",
    });
    mock.getUser.mockResolvedValue({ data: { user: { id: "owner1" } }, error: null });
    await expect(updateProperty(attempt(), () => false)).rejects.toMatchObject({
      outcome: "not-sent",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("keeps untouched legacy bytes, nulls, empties, unknown enums and oversized fields", async () => {
    mock.row = {
      ...mock.row,
      full_address: "a".repeat(501),
      state: "Legacy",
      country: null,
      district: "",
      postcode: "OLD",
    };
    await updateProperty(attempt(), () => true);
    expect(mock.payload).toEqual({ city: "Ipoh" });
    expect(mock.row).toMatchObject({
      full_address: "a".repeat(501),
      state: "Legacy",
      country: null,
      district: "",
      postcode: "OLD",
    });
  });
  it.each(["42501", "23514", "22001"])("known statement rejection %s is private", async (code) => {
    mock.error = { code, message: "private row contents" };
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "rejected",
    });
    await expect(updateProperty(attempt(), () => true)).rejects.not.toThrow("private");
  });
  it("thrown transport and unrecognized response errors are uncertain", async () => {
    mock.throws = true;
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "uncertain",
    });
    mock.throws = false;
    mock.error = { code: "gateway", message: "private" };
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "uncertain",
    });
  });
  it("mismatching returned values, owner, ID and missing field are uncertain", async () => {
    mock.mismatch = true;
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "uncertain",
    });
  });
  it("stale revision is a simulated conflict and never falls back", async () => {
    mock.row!["revision"] = 2;
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "conflict",
    });
    expect(mock.rpc).toHaveBeenCalledOnce();
  });
  it("same timestamp with a newer revision cannot overwrite", async () => {
    mock.row!["city"] = "Concurrent other value";
    mock.row!["revision"] = 2;
    await expect(updateProperty(attempt(), () => true)).rejects.toMatchObject({ outcome: "conflict" });
    expect(mock.row!["city"]).toBe("Concurrent other value");
  });
  it("read errors do not disclose returned service text", async () => {
    mock.error = { code: "fail", message: "private row" };
    await expect(getProperty("p1")).rejects.not.toThrow("private");
  });
});
describe("client attempt lifetime and downstream gating", () => {
  it("acknowledgment keeps analysis and duplicate writes gated until fresh refresh completes", async () => {
    const client = new QueryClient(),
      a = attempt();
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const refresh = vi.fn(() => held);
    const saving = runParentSave(client, a, async () => original(), refresh);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(client.getQueryData(parentConfirmationKey(a.owner, a.id))).toMatchObject({
      outcome: "acknowledged",
    });
    expect(parentBlocksAnalysis("acknowledged")).toBe(true);
    const duplicate = vi.fn(async () => original());
    await runParentSave(client, attempt(), duplicate, async () => {});
    expect(duplicate).not.toHaveBeenCalled();
    release();
    await saving;
    expect(client.getQueryData(parentConfirmationKey(a.owner, a.id))).toMatchObject({
      outcome: "saved",
    });
  });
  it("a deliberate retry after explicit rejection can complete with structurally shared original context", async () => {
    const client = new QueryClient(),
      a = attempt();
    const { PropertyEditError } = await import("@/lib/property/property-edit");
    await runParentSave(
      client,
      a,
      async () => {
        throw new PropertyEditError("rejected");
      },
      async () => {},
    );
    await runParentSave(
      client,
      attempt(),
      async () => original(),
      async () => {},
    );
    expect(client.getQueryData(parentConfirmationKey(a.owner, a.id))).toMatchObject({
      outcome: "saved",
    });
  });
  it("blocks duplicates synchronously, retains uncertainty and does not turn matching review into save", async () => {
    const client = new QueryClient(),
      a = attempt();
    let reject!: (e: unknown) => void;
    const operation = vi.fn(
        () =>
          new Promise<PropertyRecord>((_, r) => {
            reject = r;
          }),
      ),
      refresh = vi.fn();
    const first = runParentSave(client, a, operation, refresh);
    await runParentSave(client, attempt(), operation, refresh);
    expect(operation).toHaveBeenCalledOnce();
    reject(new Error("lost"));
    await first;
    await runParentSave(client, attempt(), operation, refresh);
    expect(operation).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
    expect(client.getQueryData(parentConfirmationKey(a.owner, a.id))).toMatchObject({
      outcome: "uncertain",
    });
    expect(parentBlocksAnalysis("uncertain")).toBe(true);
  });
  it("separates verified acknowledgment from refresh failure", async () => {
    const client = new QueryClient(),
      a = attempt();
    await runParentSave(
      client,
      a,
      async () => original(),
      async () => {
        throw Error("read");
      },
    );
    expect(client.getQueryData(parentConfirmationKey(a.owner, a.id))).toMatchObject({
      outcome: "saved-refresh-failed",
    });
  });
  it("cache clear and identical-key recreation fence late acknowledgments", async () => {
    const client = new QueryClient(),
      a = attempt();
    let resolve!: (p: PropertyRecord) => void;
    const refresh = vi.fn();
    const save = runParentSave(
      client,
      a,
      () =>
        new Promise((r) => {
          resolve = r;
        }),
      refresh,
    );
    client.clear();
    client.setQueryData(parentConfirmationKey(a.owner, a.id), { outcome: "idle" });
    resolve(original());
    await save;
    expect(refresh).not.toHaveBeenCalled();
    expect(client.getQueryData(["properties", a.id])).toBeUndefined();
    expect(client.getQueryData(parentConfirmationKey(a.owner, a.id))).toEqual({ outcome: "idle" });
  });
});
