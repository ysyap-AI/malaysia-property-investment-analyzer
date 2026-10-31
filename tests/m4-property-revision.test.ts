import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getPropertySnapshot, isPropertyRevision } from "@/lib/property/property-revision";
import { saveAcquisitionCosts } from "@/lib/property/acquisition-api";
import { saveFinancing } from "@/lib/property/financing-api";
import { saveOperatingExpenses } from "@/lib/property/operating-expenses-api";
import { deleteProperty, updateProperty } from "@/lib/property/property-api";
import { makeDeleteAttempt } from "@/lib/property/property-delete";
import { makePropertyAttempt } from "@/lib/property/property-edit";
import { acquisitionCostsSchema } from "@/lib/property/acquisition-fields";
import { operatingExpensesSchema } from "@/lib/property/operating-expense-fields";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyRecord,
} from "@/lib/property/property-fields";
import { financingRecord, financingValues } from "./financing-save-fixtures";

const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { rpc, auth: { getUser } },
}));
const id = "synthetic-property";
const property = (): PropertyRecord => ({
  ...propertySchema.parse({
    ...emptyPropertyForm,
    project_name: "M4 synthetic",
    target_purchase_price: "900",
  }),
  id,
  user_id: "owner",
  revision: 1,
  created_at: "2026-10-29T00:00:00Z",
  updated_at: "2026-10-29T00:00:00Z",
});
const snapshot = () => ({
  property: property(),
  acquisition_costs: null,
  financing: null,
  operating_expenses: null,
});
beforeEach(() => {
  rpc.mockReset();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
});

describe("M4 snapshot boundary", () => {
  it("captures confirmed absence and the property revision from one RPC", async () => {
    rpc.mockResolvedValue({ data: snapshot(), error: null });
    await expect(getPropertySnapshot(id, "owner")).resolves.toEqual(snapshot());
    expect(rpc).toHaveBeenCalledExactlyOnceWith("m4_property_snapshot", { p_id: id });
  });
  it.each([
    null,
    {},
    { ...snapshot(), property: { ...property(), user_id: "other" } },
    { ...snapshot(), property: { ...property(), revision: undefined } },
    { ...snapshot(), property: { ...property(), id: "other" } },
    { ...snapshot(), acquisition_costs: {} },
    { ...snapshot(), financing: {} },
    { ...snapshot(), operating_expenses: undefined },
  ])("rejects missing/foreign/malformed snapshot without exposing data (%j)", async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(getPropertySnapshot(id, "owner")).rejects.toThrow(/could not be loaded/);
  });
  it("retains explicit zero, missing values and separate target/purchase prices", async () => {
    const acquisition = {
      ...acquisitionCostsSchema.parse({ purchase_price: 1000, spa_legal_fee: 0 }),
      id: "a",
      property_id: id,
    };
    const expenses = {
      ...operatingExpensesSchema.parse({ annual_maintenance_fee: 0 }),
      id: "e",
      property_id: id,
    };
    rpc.mockResolvedValue({
      data: {
        ...snapshot(),
        acquisition_costs: acquisition,
        financing: financingRecord(),
        operating_expenses: expenses,
      },
      error: null,
    });
    const saved = await getPropertySnapshot(id, "owner");
    expect(saved.property.target_purchase_price).toBe(900);
    expect(saved.acquisition_costs?.purchase_price).toBe(1000);
    expect(saved.acquisition_costs?.spa_legal_fee).toBe(0);
    expect(saved.acquisition_costs?.other_cost).toBeNull();
    expect(saved.operating_expenses?.annual_maintenance_fee).toBe(0);
    expect(saved.operating_expenses?.annual_repair_reserve).toBeNull();
  });
  it.each([null, undefined, 0, -1, 1.1, NaN, Infinity, "1", 9007199254740992])(
    "rejects unsafe revision %s",
    (value) => {
      expect(isPropertyRevision(value)).toBe(false);
    },
  );
});

// This stub models an atomic RPC solely to test client behavior. It is NOT SQL,
// RLS, real two-browser contention, Auth persistence or cascading-FK qualification.
describe("M4 client journeys against an atomic RPC stub", () => {
  function database() {
    let parent: PropertyRecord | null = property();
    const children: Record<string, Record<string, unknown>> = {};
    rpc.mockImplementation(async (_name, args) => {
      if (_name === "m4_property_snapshot")
        return {
          data: parent
            ? {
                property: { ...parent },
                acquisition_costs: children["acquisition_costs"] ?? null,
                financing: children["financing"] ?? null,
                operating_expenses: children["operating_expenses"] ?? null,
              }
            : null,
          error: null,
        };
      if (!parent || args.p_revision !== parent.revision)
        return { data: null, error: { code: "PT409" } };
      if (args.p_delete) {
        const removed = parent;
        parent = null;
        Object.keys(children).forEach((k) => delete children[k]);
        return { data: removed, error: null };
      }
      const revision = parent.revision + 1;
      parent = { ...parent, revision };
      let record;
      if (args.p_table === "properties") record = parent = { ...parent, ...args.p_values };
      else
        record = children[args.p_table] = {
          ...(args.p_table === "financing" ? financingRecord() : {}),
          id: args.p_table,
          property_id: id,
          ...args.p_values,
        };
      return { data: { record, revision }, error: null };
    });
    return { children, parent: () => parent };
  }
  it("saves all three sections, reloads exact values, then deletes synthetic state", async () => {
    const db = database();
    const acquisition = acquisitionCostsSchema.parse({ purchase_price: 1000, spa_legal_fee: 0 });
    const expenses = operatingExpensesSchema.parse({ annual_maintenance_fee: 0 });
    await saveAcquisitionCosts(id, acquisition, () => true, 1);
    await saveFinancing(id, financingValues(), () => true, 2);
    await saveOperatingExpenses(id, expenses, () => true, 3);
    const saved = await getPropertySnapshot(id, "owner");
    expect(saved.property.revision).toBe(4);
    expect(saved.acquisition_costs).toMatchObject(acquisition);
    expect(saved.financing).toMatchObject(financingValues());
    expect(saved.operating_expenses).toMatchObject(expenses);
    await deleteProperty(makeDeleteAttempt("owner", saved.property), () => true);
    expect(db.parent()).toBeNull();
    expect(db.children).toEqual({});
    await expect(saveAcquisitionCosts(id, acquisition, () => true, 4)).rejects.toMatchObject({
      outcome: "conflict",
    });
  });
  it("two simultaneous initial child saves produce one acknowledgment and one conflict", async () => {
    const db = database();
    const values = acquisitionCostsSchema.parse({ purchase_price: 1000 });
    const outcomes = await Promise.allSettled([
      saveAcquisitionCosts(id, values, () => true, 1),
      saveAcquisitionCosts(id, values, () => true, 1),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.find((o) => o.status === "rejected")).toMatchObject({
      reason: { outcome: "conflict" },
    });
    expect(Object.keys(db.children)).toEqual(["acquisition_costs"]);
    expect(db.parent()?.revision).toBe(2);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("a financial edit fences an older delete confirmation and parent draft", async () => {
    const db = database(),
      baseline = property();
    await saveOperatingExpenses(
      id,
      operatingExpensesSchema.parse({ annual_maintenance_fee: 0 }),
      () => true,
      1,
    );
    await expect(
      deleteProperty(makeDeleteAttempt("owner", baseline), () => true),
    ).rejects.toMatchObject({ outcome: "conflict" });
    await expect(
      updateProperty(makePropertyAttempt("owner", baseline, { city: "Ipoh" }), () => true),
    ).rejects.toMatchObject({ outcome: "conflict" });
    expect(db.parent()?.city).toBeNull();
    expect(db.parent()?.revision).toBe(2);
  });
  it("a newer acquisition price fences a financing draft even if its child is unchanged", async () => {
    database();
    await saveAcquisitionCosts(
      id,
      acquisitionCostsSchema.parse({ purchase_price: 2000 }),
      () => true,
      1,
    );
    await expect(saveFinancing(id, financingValues(), () => true, 1)).rejects.toMatchObject({
      outcome: "conflict",
    });
    expect(rpc.mock.calls.at(-1)?.[1].p_revision).toBe(1);
  });
});

it("migration source keeps ownership checks, locking, RLS and CAS-only API writes explicit (source check only)", () => {
  const sql = readFileSync("supabase/migrations/20261029000000_m4_property_revision.sql", "utf8");
  expect(sql).toContain("WHERE id = p_id AND user_id = auth.uid() FOR UPDATE");
  expect(sql).toContain("parent.revision <> p_revision");
  expect(sql).toContain("NEW.revision := OLD.revision + 1");
  expect(sql).toContain("REVOKE UPDATE, DELETE ON public.properties");
  expect(sql).toContain(
    "REVOKE INSERT, UPDATE, DELETE ON public.acquisition_costs, public.financing, public.operating_expenses",
  );
  expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY|DROP POLICY|service_role/i);
  expect(sql).toContain("LANGUAGE sql STABLE SECURITY INVOKER");
});
