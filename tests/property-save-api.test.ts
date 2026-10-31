import { beforeEach, expect, it, vi } from "vitest";
import { createProperty, updateProperty } from "@/lib/property/property-api";
import { makePropertyAttempt } from "@/lib/property/property-edit";
import { emptyPropertyForm, propertySchema, type PropertyPatch, type PropertyRecord } from "@/lib/property/property-fields";

// Primary runtime-boundary cases ported from timestamp UPDATE to M4's RPC.
const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), insert: vi.fn(), row: {} as PropertyRecord }));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { from: mock.from, rpc: mock.rpc, auth: { getUser: mock.getUser } },
}));
const values = () => propertySchema.parse({ ...emptyPropertyForm, project_name: "Sample" });
beforeEach(() => {
  vi.clearAllMocks();
  mock.row = { ...values(), id: "b0510000-0000-4000-8000-000000000004", user_id: "owner1", revision: 1,
    created_at: "2026-10-31T00:00:00Z", updated_at: "2026-10-31T00:00:00Z" } as PropertyRecord;
  mock.getUser.mockResolvedValue({ data: { user: { id: "owner1" } }, error: null });
  mock.from.mockImplementation(() => {
    const q = { insert: (p: object) => { mock.insert(p); return q; }, select: () => q,
      single: async () => ({ data: { ...mock.row, ...mock.insert.mock.lastCall?.[0] }, error: null }) };
    return q;
  });
  mock.rpc.mockImplementation(async (_name, args) => {
    if (args.p_revision !== mock.row.revision) return { data: null, error: { code: "PT409" } };
    mock.row = { ...mock.row, ...args.p_values, revision: args.p_revision + 1 };
    return { data: { record: mock.row, revision: mock.row.revision }, error: null };
  });
});
const edit = (patch: unknown, original = mock.row) => updateProperty(
  makePropertyAttempt("owner1", original, patch as PropertyPatch), () => true,
);
it("preserves the primary Unicode scalar boundary, owner stamp and null creation", async () => {
  const input = { ...values(), full_address: "😀".repeat(500), country: null };
  const saved = await createProperty({ owner: "owner1", values: input, draft: { ...emptyPropertyForm, project_name: "Sample" } }, () => true);
  expect(mock.insert).toHaveBeenCalledWith({ ...input, user_id: "owner1" });
  expect(saved.country).toBeNull();
});
it.each([
  { project_name: "x".repeat(201) }, { full_address: "x".repeat(501) },
  { city: "x".repeat(101) }, { district: "x".repeat(101) }, { state: "x".repeat(101) },
  { postcode: "1".repeat(21) }, { country: "x".repeat(101) },
  { full_address: "\ud800" }, { project_name: "\u0000" }, { asking_price: -1 },
])("rejects primary invalid create/update case before dispatch: %j", async (patch) => {
  await expect(createProperty({ owner: "owner1", values: { ...values(), ...patch }, draft: emptyPropertyForm }, () => true)).rejects.toMatchObject({ outcome: "not-sent" });
  await expect(edit(patch)).rejects.toMatchObject({ outcome: "not-sent" });
  expect(mock.from).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("sends only the changed field with the database revision, preserving legacy bytes/null/empty", async () => {
  mock.row = { ...mock.row, full_address: "x".repeat(501), state: "Legacy", postcode: "OLD", city: "  bytes  ", district: "", country: null };
  const original = { ...mock.row };
  const saved = await edit({ target_purchase_price: 600000 });
  expect(mock.rpc).toHaveBeenCalledWith("m4_write_property", { p_id: original.id, p_revision: 1, p_table: "properties", p_values: { target_purchase_price: 600000 } });
  for (const field of ["full_address", "state", "postcode", "city", "district", "country"] as const)
    expect(saved[field]).toBe(original[field]);
  expect(mock.from).not.toHaveBeenCalled();
});
it("corrects oversized text and deliberately clears null through RPC", async () => {
  mock.row.full_address = "x".repeat(501);
  await expect(edit({ full_address: "Fixed", country: null })).resolves.toMatchObject({ full_address: "Fixed", country: null });
});
it.each([undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid database revision %j", async (revision) => {
  await expect(edit({ city: "Ipoh" }, { ...mock.row, revision } as PropertyRecord)).rejects.toMatchObject({ outcome: "not-sent" });
  expect(mock.rpc).not.toHaveBeenCalled();
});
it.each([{}, { city: undefined }, { user_id: "other" }, { property_status: "private status" }])("rejects invalid partial patch %j", async (patch) => {
  await expect(edit(patch)).rejects.toMatchObject({ outcome: "not-sent" });
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("rejects a stale editor even when the timestamp is identical; never retries", async () => {
  const original = { ...mock.row };
  await edit({ city: "Ipoh" }, original);
  expect(mock.row.updated_at).toBe(original.updated_at);
  await expect(edit({ city: "Old draft" }, original)).rejects.toMatchObject({ outcome: "conflict" });
  expect(mock.row.city).toBe("Ipoh");
  expect(mock.rpc).toHaveBeenCalledTimes(2);
});
it("does not overwrite omitted fields and classifies an unknown transport failure as uncertain", async () => {
  mock.row.city = "Other editor's city";
  await edit({ asking_price: 500000 });
  expect(mock.row.city).toBe("Other editor's city");
  mock.rpc.mockRejectedValueOnce(Error("Request unavailable"));
  await expect(edit({ city: "Draft" })).rejects.toMatchObject({ outcome: "uncertain" });
  expect(mock.rpc).toHaveBeenCalledTimes(2);
});
