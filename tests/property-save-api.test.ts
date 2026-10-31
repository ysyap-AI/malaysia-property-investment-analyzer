import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProperty,
  updateProperty,
  PropertySaveConflictError,
} from "@/lib/property/property-api";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyPatch,
} from "@/lib/property/property-fields";
import { PropertyValidationError } from "@/lib/property/property-save-validation";

const mock = vi.hoisted(() => ({
  from: vi.fn(),
  payload: undefined as Record<string, unknown> | undefined,
  filters: [] as [string, unknown][],
  row: null as Record<string, unknown> | null,
  error: null as { message: string } | null,
}));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: { from: mock.from } }));
const version = "2026-10-22T10:00:00.000001+00:00";
const later = "2026-10-22T10:01:00.000002+00:00";
const base = () => propertySchema.parse({ ...emptyPropertyForm, project_name: "Sample" });

beforeEach(() => {
  mock.payload = undefined;
  mock.filters = [];
  mock.row = { ...base(), id: "p1", updated_at: version };
  mock.error = null;
  mock.from.mockReset();
  mock.from.mockImplementation(() => {
    const query = {
      insert(payload: Record<string, unknown>) {
        mock.payload = payload;
        return query;
      },
      update(payload: Record<string, unknown>) {
        mock.payload = payload;
        return query;
      },
      eq(key: string, value: unknown) {
        mock.filters.push([key, value]);
        return query;
      },
      select() {
        return query;
      },
      async single() {
        return { data: { ...mock.row, ...mock.payload }, error: mock.error };
      },
      async maybeSingle() {
        const current = mock.row;
        const matches = current && mock.filters.every(([key, value]) => current[key] === value);
        if (!matches || mock.error) return { data: null, error: mock.error };
        mock.row = { ...mock.row, ...mock.payload, updated_at: later };
        return { data: mock.row, error: null };
      },
    };
    return query;
  });
});

describe("application property API runtime boundary (mock Supabase only)", () => {
  it("validates creation, stamps the existing owner argument, and preserves null", async () => {
    const value = { ...base(), full_address: "😀".repeat(500), country: null };
    const saved = await createProperty(value, "owner1");
    expect(mock.from).toHaveBeenCalledWith("properties");
    expect(mock.payload).toEqual({ ...value, user_id: "owner1" });
    expect(saved.country).toBeNull();
  });
  it.each([
    { project_name: "x".repeat(201) },
    { full_address: "x".repeat(501) },
    { city: "x".repeat(101) },
    { district: "x".repeat(101) },
    { state: "x".repeat(101) },
    { postcode: "1".repeat(21) },
    { country: "x".repeat(101) },
    { full_address: "\ud800" },
    { project_name: "\u0000" },
    { asking_price: -1 },
  ])("rejects invalid creation and update before any request: %j", async (patch) => {
    await expect(createProperty({ ...base(), ...patch }, "owner1")).rejects.toBeInstanceOf(
      PropertyValidationError,
    );
    await expect(updateProperty("p1", patch, version)).rejects.toBeInstanceOf(
      PropertyValidationError,
    );
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("sends one changed field and the original timestamp as a database predicate", async () => {
    await updateProperty("p1", { city: "Ipoh" }, version);
    expect(mock.payload).toEqual({ city: "Ipoh" });
    expect(mock.filters).toEqual([
      ["id", "p1"],
      ["updated_at", version],
    ]);
  });
  it("an unrelated price edit preserves current legacy text, null and empty", async () => {
    mock.row = {
      ...mock.row,
      full_address: "x".repeat(501),
      state: "Legacy",
      postcode: "OLD",
      city: "  bytes  ",
      district: "",
      country: null,
    };
    const original = { ...mock.row };
    const saved = await updateProperty("p1", { target_purchase_price: 600000 }, version);
    expect(mock.payload).toEqual({ target_purchase_price: 600000 });
    for (const field of ["full_address", "state", "postcode", "city", "district", "country"])
      expect(saved[field as keyof typeof saved]).toBe(original[field]);
  });
  it("allows correction from oversized to compliant and an intentional null clear", async () => {
    mock.row!["full_address"] = "x".repeat(501);
    const saved = await updateProperty("p1", { full_address: "Fixed", country: null }, version);
    expect(saved).toMatchObject({ full_address: "Fixed", country: null });
    expect(mock.payload).toEqual({ full_address: "Fixed", country: null });
  });
  it.each([undefined, "", "not a timestamp"])(
    "rejects a missing/invalid edit baseline %j without sending",
    async (baseline) => {
      await expect(
        updateProperty("p1", { city: "Ipoh" }, baseline as string),
      ).rejects.toBeInstanceOf(PropertyValidationError);
      expect(mock.from).not.toHaveBeenCalled();
    },
  );
  it("rejects an empty patch, undefined, unknown ownership and invalid enums without sending", async () => {
    for (const patch of [
      {},
      { city: undefined },
      { user_id: "other" },
      { property_status: "private status" },
    ]) {
      await expect(
        updateProperty("p1", patch as unknown as PropertyPatch, version),
      ).rejects.toBeInstanceOf(PropertyValidationError);
    }
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("two editors with distinct timestamp versions: stale save fails without retry", async () => {
    await updateProperty("p1", { city: "Ipoh" }, version);
    mock.filters = [];
    await expect(updateProperty("p1", { city: "Old draft" }, version)).rejects.toMatchObject({
      code: "PROPERTY_SAVE_CONFLICT",
    });
    expect(mock.row!["city"]).toBe("Ipoh");
    expect(mock.from).toHaveBeenCalledTimes(2);
  });
  it("a patch never reintroduces omitted fields changed by another editor", async () => {
    mock.row!["city"] = "Other editor's city";
    await updateProperty("p1", { asking_price: 500000 }, version);
    expect(mock.row!["city"]).toBe("Other editor's city");
  });
  it("zero visible/matching rows is a generic conflict without an existence claim", async () => {
    mock.row = null;
    await expect(updateProperty("p1", { city: "Ipoh" }, version)).rejects.toBeInstanceOf(
      PropertySaveConflictError,
    );
  });
  it("surfaces a Supabase failure without a fallback write", async () => {
    mock.error = { message: "Request unavailable" };
    await expect(updateProperty("p1", { city: "Ipoh" }, version)).rejects.toThrow(
      "Request unavailable",
    );
    expect(mock.from).toHaveBeenCalledOnce();
  });
  it("documents the timestamp collision limitation instead of claiming revision protection", async () => {
    // Model another writer changing a field while reusing the same timestamp.
    // The current application predicate cannot detect this; future DB revision required.
    mock.row!["city"] = "Concurrent value";
    await updateProperty("p1", { city: "Draft value" }, version);
    expect(mock.row!["city"]).toBe("Draft value");
  });
  it.todo(
    "DATABASE QUALIFICATION: real PostgREST conditional UPDATE under concurrent row locks, RLS and deletion/transfer",
  );
  it.todo(
    "DATABASE DEPENDENCY: database-owned monotonic revision, stale-token collisions, direct/old-client write coverage",
  );
  it.todo(
    "DATABASE ENFORCEMENT: exact final-row unchanged-byte grandfathering, trigger ordering and direct authenticated REST writes",
  );
  it.todo(
    "DATABASE QUALIFICATION: UTF8 scalar differential boundaries, clean install, upgrade, rollback and owner-supplied inventory",
  );
});
