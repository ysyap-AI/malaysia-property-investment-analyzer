import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createProperty, matchesCreatedProperty } from "@/lib/property/property-api";
import {
  CreateSession,
  getCreateSession,
  PropertyCreateError,
  type CreateAttempt,
} from "@/lib/property/property-create";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyInput,
  type PropertyRecord,
} from "@/lib/property/property-fields";
const mock = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  reply: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { from: mock.from, auth: { getUser: mock.getUser } },
}));
const values = () =>
  propertySchema.parse({
    ...emptyPropertyForm,
    project_name: "Invented create",
    asking_price: "0",
  });
const attempt = (): CreateAttempt =>
  Object.freeze({
    owner: "owner1",
    values: Object.freeze(values()),
    draft: Object.freeze({
      ...emptyPropertyForm,
      project_name: "  Invented create  ",
      asking_price: "0",
    }),
  });
const row = () =>
  ({
    ...values(),
    revision: 1,
    id: "b0510000-0000-4000-8000-000000000004",
    user_id: "owner1",
    created_at: "2026-10-26T00:00:00Z",
    updated_at: "2026-10-26T00:00:00Z",
  }) as PropertyRecord;
beforeEach(() => {
  vi.clearAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "owner1" } }, error: null });
  mock.reply.mockResolvedValue({ data: row(), error: null });
  mock.from.mockImplementation(() => {
    const q = {
      insert: (p: unknown) => {
        mock.insert(p);
        return q;
      },
      select: () => q,
      single: mock.reply,
    };
    return q;
  });
});
it("uses supported INSERT, owner stamp, zero/null and exact returned evidence", async () => {
  await expect(createProperty(attempt(), () => true)).resolves.toEqual(row());
  expect(mock.insert).toHaveBeenCalledWith({ ...values(), user_id: "owner1" });
  expect(values().asking_price).toBe(0);
  expect(values().bank_valuation).toBeNull();
});
it.each(["foreign", "expired", "error", "throw", "lifetime"])(
  "pre-dispatch %s is not-sent",
  async (mode) => {
    if (mode === "foreign")
      mock.getUser.mockResolvedValue({ data: { user: { id: "owner2" } }, error: null });
    if (mode === "expired") mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
    if (mode === "error")
      mock.getUser.mockResolvedValue({ data: { user: { id: "owner1" } }, error: {} });
    if (mode === "throw") mock.getUser.mockRejectedValue(Error("PRIVATE"));
    await expect(createProperty(attempt(), () => mode !== "lifetime")).rejects.toMatchObject({
      outcome: "not-sent",
    });
    expect(mock.from).not.toHaveBeenCalled();
  },
);
it.each([
  { asking_price: "0" },
  { city: undefined },
  { project_name: "" },
  { extra: "private" },
  { asking_price: -1 },
  { city: "x".repeat(101) },
])("rejects malformed/coerced API payload without dispatch", async (patch) => {
  await expect(
    createProperty(
      { ...attempt(), values: { ...values(), ...patch } as PropertyInput },
      () => true,
    ),
  ).rejects.toMatchObject({ outcome: "not-sent" });
  expect(mock.from).not.toHaveBeenCalled();
});
it.each(Object.keys(values()))(
  "requires returned field %s, including nulls and workflow",
  async (key) => {
    const data = { ...row() } as Record<string, unknown>;
    delete data[key];
    mock.reply.mockResolvedValue({ data, error: null });
    await expect(createProperty(attempt(), () => true)).rejects.toMatchObject({
      outcome: "uncertain",
    });
  },
);
it.each(Object.keys(values()))("rejects mismatch in %s", async (key) => {
  const data = { ...row(), [key]: "unexpected" };
  mock.reply.mockResolvedValue({ data, error: null });
  await expect(createProperty(attempt(), () => true)).rejects.toMatchObject({
    outcome: "uncertain",
  });
});
it.each([
  null,
  {},
  { ...row(), id: "bad" },
  { ...row(), user_id: "owner2" },
  { ...row(), updated_at: "nonsense" },
  { ...row(), created_at: null },
])("incomplete identity/metadata is uncertain", async (data) => {
  mock.reply.mockResolvedValue({ data, error: null });
  await expect(createProperty(attempt(), () => true)).rejects.toMatchObject({
    outcome: "uncertain",
  });
});
it.each([
  "42501",
  "23502",
  "23503",
  "23505",
  "23514",
  "22001",
  "22P02",
  "PGRST116",
  "503",
  "unknown",
])("classifies %s without private text", async (code) => {
  mock.reply.mockResolvedValue({ data: null, error: { code, message: "PRIVATE_SENTINEL" } });
  try {
    await createProperty(attempt(), () => true);
    throw Error("Expected rejection");
  } catch (e) {
    expect(e).toBeInstanceOf(PropertyCreateError);
    expect((e as Error).message).not.toContain("PRIVATE_SENTINEL");
    expect((e as PropertyCreateError).outcome).toBe(
      ["PGRST116", "503", "unknown"].includes(code) ? "uncertain" : "rejected",
    );
  }
});
it.each(["throw", "undefined"])("conservatively classifies broken %s transport", async (mode) => {
  if (mode === "throw") mock.reply.mockRejectedValue(Error("PRIVATE"));
  else mock.reply.mockResolvedValue(undefined);
  await expect(createProperty(attempt(), () => true)).rejects.toMatchObject({
    outcome: "uncertain",
  });
});
it("synchronously locks immutable attempts and retains them across remount, cache clear and owner return", async () => {
  const client = new QueryClient();
  const s = getCreateSession(client, "owner1");
  const a = attempt();
  let release!: (r: PropertyRecord) => void;
  const operation = vi.fn(
    () =>
      new Promise<PropertyRecord>((done) => {
        release = done;
      }),
  );
  const followup = vi.fn();
  let live = true;
  const promise = s.run(a.owner, a.values, a.draft, operation, followup, () => live);
  await s.run(a.owner, a.values, a.draft, operation, followup, () => live);
  expect(operation).toHaveBeenCalledOnce();
  expect(Object.isFrozen(s.getSnapshot().attempt?.draft)).toBe(true);
  expect(Object.isFrozen(s.getSnapshot().attempt?.values)).toBe(true);
  client.clear();
  live = false;
  release(row());
  await promise;
  expect(followup).not.toHaveBeenCalled();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  expect(getCreateSession(client, "owner2").getSnapshot()).toEqual({ outcome: "idle" });
  expect(getCreateSession(client, "owner1")).toBe(s);
  expect(s.getSnapshot().outcome).toBe("created-refresh-failed");
  await s.run(a.owner, a.values, a.draft, operation, followup, () => true);
  expect(operation).toHaveBeenCalledOnce();
});
it.each(["uncertain", "rejected", "not-sent"] as const)(
  "%s retains exact draft and only permits safe deliberate resubmission",
  async (outcome) => {
    const s = new CreateSession(),
      a = attempt();
    const operation = vi.fn().mockRejectedValue(new PropertyCreateError(outcome));
    await s.run(a.owner, a.values, a.draft, operation, vi.fn(), () => true);
    const first = s.getSnapshot().attempt;
    expect(first?.draft.project_name).toBe("  Invented create  ");
    s.fresh();
    await s.run(a.owner, a.values, a.draft, operation, vi.fn(), () => true);
    expect(operation).toHaveBeenCalledTimes(outcome === "uncertain" ? 1 : 2);
    if (outcome === "uncertain") expect(s.getSnapshot().attempt).toBe(first);
  },
);
it("separates acknowledgement, failed refresh/navigation, recovery and deliberate different property", async () => {
  const s = new CreateSession(),
    a = attempt();
  const operation = vi.fn().mockResolvedValue(row());
  await s.run(
    a.owner,
    a.values,
    a.draft,
    operation,
    async () => {
      expect(s.getSnapshot().outcome).toBe("acknowledged");
      throw Error("read failed");
    },
    () => true,
  );
  expect(s.getSnapshot().outcome).toBe("created-refresh-failed");
  s.fresh();
  expect(s.getSnapshot().row).toEqual(row());
  s.reviewed();
  expect(s.getSnapshot().outcome).toBe("created");
  s.navigationFailed();
  expect(s.getSnapshot().outcome).toBe("created-refresh-failed");
  s.reviewed();
  s.fresh();
  expect(s.getSnapshot()).toEqual({ outcome: "idle" });
  expect(operation).toHaveBeenCalledOnce();
  expect(matchesCreatedProperty(row(), a.values, "owner1")).toBe(true);
});
