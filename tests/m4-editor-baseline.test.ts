import { describe, expect, it, vi } from "vitest";
import {
  createAcquisitionEditor,
  AcquisitionSaveError,
  type AcquisitionAttempt,
} from "@/lib/property/acquisition-editor";
import {
  createFinancingEditor,
  FinancingSaveError,
  type FinancingAttempt,
} from "@/lib/property/financing-editor";
import {
  createOperatingExpensesEditor,
  OperatingExpensesSaveError,
  type OperatingExpensesAttempt,
} from "@/lib/property/operating-expenses-editor";
import {
  acquisitionCostsSchema,
  type AcquisitionCostsRecord,
} from "@/lib/property/acquisition-fields";
import { expenseRow } from "./operating-expenses-save-fixtures";
import { financingRecord, propertyId } from "./financing-save-fixtures";

const acquisition = (price = 100): AcquisitionCostsRecord =>
  ({
    ...acquisitionCostsSchema.parse({ purchase_price: price, spa_legal_fee: 0 }),
    id: "a",
    property_id: propertyId,
  }) as AcquisitionCostsRecord;

describe("M4 baseline revisions remain attached to drafts", () => {
  for (const section of ["acquisition", "financing", "expenses"] as const) {
    function setup() {
      const save = vi.fn(async (_attempt: unknown): Promise<never> => {
        throw new Error("Unexpected save");
      });
      const refresh = vi.fn(async (): Promise<unknown> => null);
      const ports = { save, acknowledge: async () => {} };
      if (section === "acquisition") {
        const editor = createAcquisitionEditor(propertyId, {
          ...ports,
          refresh: async () => (await refresh()) as AcquisitionCostsRecord | null,
        });
        return {
          editor,
          save,
          refresh,
          row: acquisition(),
          changed: acquisition(999),
          open: (revision: number) => editor.open(acquisition(), revision),
          blank: (revision: number) => editor.open(null, revision),
          change: () => editor.change("purchase_price", "250"),
          failure: (outcome: "conflict" | "uncertain") => new AcquisitionSaveError(outcome),
        };
      }
      if (section === "financing") {
        const editor = createFinancingEditor(propertyId, {
          ...ports,
          refresh: async () => (await refresh()) as ReturnType<typeof financingRecord> | null,
          context: () => ({ status: "available", price: 1000 }),
        });
        return {
          editor,
          save,
          refresh,
          row: financingRecord(),
          changed: financingRecord(999),
          open: (revision: number) => editor.open(financingRecord(), revision),
          blank: (revision: number) => editor.open(null, revision),
          change: () => editor.change("loan_amount", "250"),
          failure: (outcome: "conflict" | "uncertain") => new FinancingSaveError(outcome),
        };
      }
      const editor = createOperatingExpensesEditor(propertyId, {
        ...ports,
        refresh: async () => (await refresh()) as ReturnType<typeof expenseRow> | null,
      });
      return {
        editor,
        save,
        refresh,
        row: expenseRow(),
        changed: expenseRow(999),
        open: (revision: number) => editor.open(expenseRow(), revision),
        blank: (revision: number) => editor.open(null, revision),
        change: () => editor.change("annual_maintenance_fee", "250"),
        failure: (outcome: "conflict" | "uncertain") => new OperatingExpensesSaveError(outcome),
      };
    }
    it.each([false, true])(
      `${section}: populated/absent baseline carries revision to submission (absent=%s)`,
      async (absent) => {
        const h = setup();
        if (absent) h.blank(7);
        else h.open(7);
        h.change();
        h.save.mockRejectedValue(h.failure("conflict"));
        await h.editor.submit();
        const attempt = h.save.mock.calls[0]![0] as
          AcquisitionAttempt | FinancingAttempt | OperatingExpensesAttempt;
        expect(attempt.revision).toBe(7);
        expect(Object.isFrozen(attempt)).toBe(true);
        expect(h.editor.getSnapshot().revision).toBe(7);
        expect(h.editor.getSnapshot().outcome).toBe("conflict");
      },
    );
    it.each(["conflict", "uncertain"] as const)(
      `${section}: %s preserves draft through edits and review without rebasing/resubmitting`,
      async (outcome) => {
        const h = setup();
        h.open(5);
        h.change();
        h.save.mockRejectedValue(h.failure(outcome));
        await h.editor.submit();
        const before = h.editor.getSnapshot().values;
        h.refresh.mockResolvedValue(h.changed);
        await h.editor.review();
        expect(h.editor.getSnapshot().values).toEqual(before);
        expect(h.editor.getSnapshot().baseline).toEqual(h.row);
        expect(h.editor.getSnapshot().revision).toBe(5);
        h.change();
        await h.editor.submit();
        expect(h.save).toHaveBeenCalledOnce();
        expect(h.editor.getSnapshot().outcome).toBe(outcome);
        // Deliberate discard/open starts a new baseline; review alone never does.
        h.editor.cancel();
        h.open(9);
        expect(h.editor.getSnapshot().revision).toBe(9);
      },
    );
    it(`${section}: identity disposal removes the draft and revision`, () => {
      const h = setup();
      h.open(5);
      h.change();
      h.editor.dispose();
      expect(h.editor.getSnapshot()).toMatchObject({
        active: false,
        editing: false,
        baseline: null,
        revision: null,
      });
    });
  }
});
