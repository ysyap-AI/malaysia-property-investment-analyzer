import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquisitionCostsSchema,
  type AcquisitionCostsRecord,
} from "@/lib/property/acquisition-fields";
import { getAcquisitionCosts, saveAcquisitionCosts } from "@/lib/property/acquisition-api";
import {
  ACQUISITION_FAILURE_MESSAGES,
  AcquisitionSaveError,
} from "@/lib/property/acquisition-editor";

// M4 replaces the old read-latest/write contract. These are mocked API checks, not database proof.
const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: { from, rpc } }));
const propertyId = "synthetic-property";
const values = acquisitionCostsSchema.parse({ purchase_price: 234.5, spa_legal_fee: 0 });
const saved = { ...values, id: "synthetic-row", property_id: propertyId } as AcquisitionCostsRecord;
const sensitive = "PRIVATE_SQL_PAYLOAD";
const call = (revision: number | null = 7, current = () => true) =>
  saveAcquisitionCosts(propertyId, values, current, revision);
beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: { record: saved, revision: 8 }, error: null });
});
describe("acquisition revision API contract (mocked Supabase)", () => {
  it("sends one conditional RPC with the editor revision and no fresh read", async () => {
    await expect(call()).resolves.toEqual(saved);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("m4_write_property", {
      p_id: propertyId,
      p_revision: 7,
      p_table: "acquisition_costs",
      p_values: values,
    });
    expect(from).not.toHaveBeenCalled();
    expect(rpc.mock.calls[0]![1].p_values.spa_legal_fee).toBe(0);
    expect(rpc.mock.calls[0]![1].p_values.other_cost).toBeNull();
  });
  it.each([null, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "invalid/missing baseline %s is not sent",
    async (revision) => {
      await expect(call(revision)).rejects.toMatchObject({ outcome: "not-sent" });
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("identity/editor/price-context veto prevents dispatch", async () => {
    await expect(call(7, () => false)).rejects.toMatchObject({ outcome: "not-sent" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("PT409 is a conflict with no read-latest fallback or retry", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PT409", message: sensitive } });
    const error = await call().catch((e) => e);
    expect(error).toMatchObject({ outcome: "conflict" });
    expect(String(error)).not.toContain(sensitive);
    expect(rpc).toHaveBeenCalledOnce();
    expect(from).not.toHaveBeenCalled();
  });
  it.each(["23502", "23503", "23505", "23514", "42501", "22001", "22003", "22023", "22P02"])(
    "explicit rejection %s remains private",
    async (code) => {
      rpc.mockResolvedValue({
        data: null,
        error: { code, message: sensitive, details: sensitive },
      });
      const error = await call().catch((e) => e);
      expect(error).toMatchObject({ outcome: "rejected" });
      expect(String(error) + JSON.stringify(error)).not.toContain(sensitive);
      expect(error).not.toHaveProperty("cause");
      expect(rpc).toHaveBeenCalledOnce();
    },
  );
  it.each(["", "PGRST116", "PGRST000", "57014", "40001", "unknown"])(
    "unknown %s stays uncertain",
    async (code) => {
      rpc.mockResolvedValue({ data: null, error: { code, message: sensitive } });
      await expect(call()).rejects.toMatchObject({ outcome: "uncertain" });
      expect(rpc).toHaveBeenCalledOnce();
    },
  );
  it.each([new Error(sensitive), sensitive, null])(
    "lost/rejected promise remains uncertain (%s)",
    async (reason) => {
      rpc.mockRejectedValue(reason);
      await expect(call()).rejects.toMatchObject({ outcome: "uncertain" });
      expect(rpc).toHaveBeenCalledOnce();
    },
  );
  it.each([
    null,
    undefined,
    { ...saved, property_id: "other" },
    { ...saved, purchase_price: Infinity },
    { id: "row", property_id: propertyId },
    { ...saved, purchase_price: 999 },
  ])("invalid/mismatched acknowledgment is uncertain (%s)", async (record) => {
    rpc.mockResolvedValue({ data: { record, revision: 8 }, error: null });
    await expect(call()).rejects.toMatchObject({ outcome: "uncertain" });
  });
  it.each([
    null,
    {},
    { record: saved },
    { record: saved, revision: 7 },
    { record: saved, revision: 9 },
  ])("missing/mismatched revision is uncertain (%s)", async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(call()).rejects.toMatchObject({ outcome: "uncertain" });
  });
  it("copies payload before transport can outlive the draft", async () => {
    const draft = { ...values };
    const pending = saveAcquisitionCosts(propertyId, draft, () => true, 7);
    draft.purchase_price = 999;
    await pending;
    expect(rpc.mock.calls[0]![1].p_values.purchase_price).toBe(values.purchase_price);
  });
  it.each([null, undefined, { id: "row" }, { ...saved, property_id: "other" }])(
    "read validates absence and malformed rows (%s)",
    async (data) => {
      const read = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      };
      read.select.mockReturnValue(read);
      read.eq.mockReturnValue(read);
      from.mockReturnValue(read);
      if (data === null) await expect(getAcquisitionCosts(propertyId)).resolves.toBeNull();
      else await expect(getAcquisitionCosts(propertyId)).rejects.toThrow(/Unable to load/);
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("read failure never discloses backend text", async () => {
    const read = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockRejectedValue(Error(sensitive)),
    };
    read.select.mockReturnValue(read);
    read.eq.mockReturnValue(read);
    from.mockReturnValue(read);
    await expect(getAcquisitionCosts(propertyId)).rejects.not.toThrow(sensitive);
  });
});
