import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSectionEvidence } from "@/lib/property/evidence-api";
import { saveAcquisitionCosts } from "@/lib/property/acquisition-api";
import { saveFinancing } from "@/lib/property/financing-api";
import { saveOperatingExpenses } from "@/lib/property/operating-expenses-api";
import { createAcquisitionEditor, AcquisitionSaveError } from "@/lib/property/acquisition-editor";
import { createFinancingEditor, FinancingSaveError } from "@/lib/property/financing-editor";
import {
  createOperatingExpensesEditor,
  OperatingExpensesSaveError,
} from "@/lib/property/operating-expenses-editor";
import {
  acquisitionCostsSchema,
  type AcquisitionCostsRecord,
} from "@/lib/property/acquisition-fields";
import { makePropertyAttempt } from "@/lib/property/property-edit";
import { updateProperty, deleteProperty } from "@/lib/property/property-api";
import { makeDeleteAttempt } from "@/lib/property/property-delete";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyRecord,
} from "@/lib/property/property-fields";
import { type PropertySnapshot } from "@/lib/property/property-revision";
import { type EvidenceSection, type SectionEvidence } from "@/lib/property/investment-evidence";
import { financingRecord, financingValues } from "./financing-save-fixtures";
import { expenseRow } from "./operating-expenses-save-fixtures";
const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { rpc, auth: { getUser } },
}));
const metadata = (field: string, value = 0): SectionEvidence => ({
  version: 1,
  fields: {
    [field]: {
      origin: "user_assumption",
      valueAtReview: value,
      sourceLabel: null,
      sourceUrl: null,
      notes: "Synthetic assumption",
      observedOn: null,
      verifiedOn: null,
      estimate: null,
    },
  },
});
const property = (): PropertyRecord => ({
  ...propertySchema.parse({
    ...emptyPropertyForm,
    project_name: "M5 synthetic",
    expected_monthly_rent: 0,
  }),
  id: "synthetic-property",
  user_id: "owner",
  revision: 7,
  created_at: "2026-10-30T00:00:00Z",
  updated_at: "2026-10-30T00:00:00Z",
  evidence_metadata: null,
});
const acq = (): AcquisitionCostsRecord =>
  ({
    ...acquisitionCostsSchema.parse({ purchase_price: 1000, spa_legal_fee: 0 }),
    id: "a",
    property_id: "synthetic-property",
  }) as AcquisitionCostsRecord;
const snapshot = (): PropertySnapshot => ({
  property: property(),
  acquisition_costs: acq(),
  financing: financingRecord(),
  operating_expenses: expenseRow(),
});
beforeEach(() => {
  rpc.mockReset();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
});
describe("M5 evidence-only API and acknowledgment", () => {
  it.each([
    ["properties", "expected_monthly_rent"],
    ["acquisition_costs", "purchase_price"],
    ["financing", "loan_amount"],
    ["operating_expenses", "annual_maintenance_fee"],
  ] as const)("%s submits only metadata with original shared revision", async (section, field) => {
    const s = snapshot(),
      evidence = metadata(field),
      row = section === "properties" ? { ...s.property, revision: 8 } : s[section];
    rpc.mockResolvedValue({
      data: { revision: 8, record: { ...row, evidence_metadata: structuredClone(evidence) } },
      error: null,
    });
    await saveSectionEvidence(s, section, evidence, "owner", () => true);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("m4_write_property", {
      p_id: s.property.id,
      p_revision: 7,
      p_table: section,
      p_values: { evidence_metadata: evidence },
    });
  });
  it.each(["other", null])("identity %s cannot dispatch", async (id) => {
    getUser.mockResolvedValue({ data: { user: id ? { id } : null }, error: null });
    await expect(
      saveSectionEvidence(
        snapshot(),
        "properties",
        metadata("expected_monthly_rent"),
        "owner",
        () => true,
      ),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not create absent financial rows or send expired drafts", async () => {
    await expect(
      saveSectionEvidence(
        { ...snapshot(), acquisition_costs: null },
        "acquisition_costs",
        metadata("purchase_price"),
        "owner",
        () => true,
      ),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    await expect(
      saveSectionEvidence(
        snapshot(),
        "properties",
        metadata("expected_monthly_rent"),
        "owner",
        () => false,
      ),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    {
      revision: 8,
      record: {
        ...property(),
        revision: 8,
        expected_monthly_rent: 99,
        evidence_metadata: metadata("expected_monthly_rent"),
      },
    },
    { revision: 9, record: property() },
    { revision: 8, record: { ...property(), revision: 8, evidence_metadata: {} } },
  ])("mismatched acknowledgment stays uncertain", async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(
      saveSectionEvidence(
        snapshot(),
        "properties",
        metadata("expected_monthly_rent"),
        "owner",
        () => true,
      ),
    ).rejects.toMatchObject({ outcome: "uncertain" });
    expect(rpc).toHaveBeenCalledOnce();
  });
  it.each([
    ["PT409", "conflict"],
    ["23514", "rejected"],
    ["57014", "uncertain"],
  ])("classifies %s without retry", async (code, outcome) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(
      saveSectionEvidence(
        snapshot(),
        "properties",
        metadata("expected_monthly_rent"),
        "owner",
        () => true,
      ),
    ).rejects.toMatchObject({ outcome });
    expect(rpc).toHaveBeenCalledOnce();
  });
  it("lost response remains uncertain", async () => {
    rpc.mockRejectedValue(Error("lost"));
    await expect(
      saveSectionEvidence(
        snapshot(),
        "properties",
        metadata("expected_monthly_rent"),
        "owner",
        () => true,
      ),
    ).rejects.toMatchObject({ outcome: "uncertain" });
  });
  it("property combined save and delete accept structurally equal reloaded metadata", async () => {
    const evidence = metadata("expected_monthly_rent", 2200),
      row = {
        ...property(),
        revision: 8,
        expected_monthly_rent: 2200,
        evidence_metadata: structuredClone(evidence),
      };
    rpc.mockResolvedValueOnce({ data: { record: row, revision: 8 }, error: null });
    await expect(
      updateProperty(
        makePropertyAttempt("owner", property(), {
          expected_monthly_rent: 2200,
          evidence_metadata: evidence,
        }),
        () => true,
      ),
    ).resolves.toEqual(row);
    rpc.mockResolvedValueOnce({ data: structuredClone(row), error: null });
    await expect(
      deleteProperty(makeDeleteAttempt("owner", row), () => true),
    ).resolves.toBeUndefined();
  });
});
describe("M5 combined financial saves", () => {
  it("acquisition persists metadata in the single value RPC", async () => {
    const evidence = metadata("purchase_price", 1000),
      row = { ...acq(), evidence_metadata: evidence };
    rpc.mockResolvedValue({ data: { record: structuredClone(row), revision: 8 }, error: null });
    await saveAcquisitionCosts(
      "synthetic-property",
      acquisitionCostsSchema.parse({ purchase_price: 1000, spa_legal_fee: 0 }),
      () => true,
      7,
      evidence,
    );
    expect(rpc.mock.calls[0]![1].p_values.evidence_metadata).toEqual(evidence);
    expect(rpc).toHaveBeenCalledOnce();
  });
  it.each(["financing", "expenses"])(
    "%s persists combined values and metadata",
    async (section) => {
      const evidence = metadata(
        section === "financing" ? "loan_amount" : "annual_maintenance_fee",
        200,
      );
      rpc.mockResolvedValue({
        data: {
          record: {
            ...(section === "financing" ? financingRecord() : expenseRow()),
            evidence_metadata: structuredClone(evidence),
          },
          revision: 8,
        },
        error: null,
      });
      if (section === "financing")
        await saveFinancing("synthetic-property", financingValues(), () => true, 7, evidence);
      else {
        const row = expenseRow();
        await saveOperatingExpenses("synthetic-property", row, () => true, 7, evidence);
      }
      expect(rpc.mock.calls[0]![1].p_values.evidence_metadata).toEqual(evidence);
      expect(rpc).toHaveBeenCalledOnce();
    },
  );
  it("rejects malformed metadata before sending a value save", async () => {
    await expect(
      saveAcquisitionCosts(
        "synthetic-property",
        acquisitionCostsSchema.parse({ purchase_price: 1000 }),
        () => true,
        7,
        { version: 2, fields: {} } as unknown as SectionEvidence,
      ),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    expect(rpc).not.toHaveBeenCalled();
  });
});
describe("M5 evidence shares the financial editor lifetime and revision", () => {
  for (const section of ["acquisition_costs", "financing", "operating_expenses"] as const) {
    function setup(outcome: "conflict" | "uncertain" = "conflict") {
      const save = vi.fn(async (_a: unknown): Promise<never> => {
        throw section === "acquisition_costs"
          ? new AcquisitionSaveError(outcome)
          : section === "financing"
            ? new FinancingSaveError(outcome)
            : new OperatingExpensesSaveError(outcome);
      });
      const ports = { save, acknowledge: async () => {}, refresh: async () => null };
      if (section === "acquisition_costs") {
        const editor = createAcquisitionEditor("synthetic-property", ports);
        editor.open(acq(), 7);
        return { editor, save, field: "purchase_price" };
      }
      if (section === "financing") {
        const editor = createFinancingEditor("synthetic-property", {
          ...ports,
          context: () => ({ status: "available", price: 1000 }),
        });
        editor.open(financingRecord(), 7);
        return { editor, save, field: "loan_amount" };
      }
      const editor = createOperatingExpensesEditor("synthetic-property", ports);
      editor.open(expenseRow(), 7);
      return { editor, save, field: "annual_maintenance_fee" };
    }
    it.each(["conflict", "uncertain"] as const)(
      `${section}: %s preserves evidence and original revision; identity disposal clears it`,
      async (outcome) => {
        const h = setup(outcome),
          evidence = metadata(h.field);
        h.editor.changeEvidence(evidence);
        await h.editor.submit();
        expect(h.save.mock.calls[0]![0]).toMatchObject({ revision: 7, evidence });
        expect(h.editor.getSnapshot()).toMatchObject({ outcome, revision: 7, evidence });
        await h.editor.review();
        expect(h.editor.getSnapshot().evidence).toEqual(evidence);
        expect(h.editor.getSnapshot().revision).toBe(7);
        h.editor.dispose();
        expect(h.editor.getSnapshot()).toMatchObject({ active: false, evidence: null });
      },
    );
  }
});
