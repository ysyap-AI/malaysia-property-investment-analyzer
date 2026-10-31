import { describe, expect, it } from "vitest";
import {
  estimateLoanStampDuty,
  estimateMalaysianAcquisition,
  estimateScaleLegalFee,
  estimateTransferDuty,
  type MalaysianAcquisitionInputs,
} from "@/lib/finance/malaysian-acquisition-estimate";
import {
  acquisitionEstimateFieldStatus,
  defaultEstimateSelection,
  parseEstimateMoney,
  planAcquisitionEstimateApplication,
} from "@/lib/property/acquisition-estimate-draft";
import {
  emptyAcquisitionForm,
  acquisitionCostsSchema,
  type AcquisitionCostsRecord,
} from "@/lib/property/acquisition-fields";
import { AcquisitionSaveError, createAcquisitionEditor } from "@/lib/property/acquisition-editor";

const base: MalaysianAcquisitionInputs = {
  scopeConfirmed: true,
  purchasePrice: 600000,
  marketValue: 610000,
  usePriceAsMarketProxy: false,
  financing: "conventional",
  loanToValuePercent: 90,
  loanAmount: 100000,
  financingAvailable: true,
};
describe("Malaysian statutory scales", () => {
  it.each([
    [0.01, 1],
    [100, 1],
    [100.01, 2],
    [99999.99, 1000],
    [100000, 1000],
    [100000.01, 1002],
    [499999.99, 9000],
    [500000, 9000],
    [500000.01, 9003],
    [999999.99, 24000],
    [1000000, 24000],
    [1000000.01, 24004],
    [1000100, 24004],
    [1000100.01, 24008],
  ])("transfer duty at RM%s is RM%s", (basis, duty) =>
    expect(estimateTransferDuty(basis)).toBe(duty),
  );
  it.each([
    [0.01, 500],
    [39999.99, 500],
    [40000, 500],
    [40000.8, 500.01],
    [500000, 6250],
    [500000.5, 6250.01],
    [1000000, 11250],
    [7500000, 76250],
    [7500000.01, null],
  ])("undiscounted legal scale at RM%s is %s", (basis, fee) =>
    expect(estimateScaleLegalFee(basis)).toBe(fee),
  );
  it.each([
    [0.01, 5],
    [999.99, 5],
    [1000, 5],
    [1000.01, 10],
    [540000, 2700],
    [540000.01, 2705],
  ])("loan duty at RM%s is RM%s", (basis, duty) => expect(estimateLoanStampDuty(basis)).toBe(duty));
  it.each([null, 0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    "invalid/missing basis %s stays unavailable",
    (basis) => {
      for (const calculate of [estimateTransferDuty, estimateScaleLegalFee, estimateLoanStampDuty])
        expect(calculate(basis)).toBeNull();
    },
  );
});
describe("estimate inputs and financing", () => {
  it("uses higher market value and existing LTV precedence", () => {
    const result = estimateMalaysianAcquisition(base);
    expect(result.loanAmount).toBe(540000);
    expect(result.fees.transfer_stamp_duty.amount).toBe(12300);
    expect(result.fees.spa_legal_fee.amount).toBe(7250);
    expect(result.fees.loan_legal_fee.amount).toBe(6650);
    expect(result.fees.loan_stamp_duty.amount).toBe(2700);
    expect(result.fees.spa_legal_fee.basis).toContain(
      "Solicitor may instead use adjudicated value",
    );
  });
  it("requires market value or an explicit proxy; invalid supplied values do not use proxy", () => {
    expect(
      estimateMalaysianAcquisition({ ...base, marketValue: null }).fees.transfer_stamp_duty.amount,
    ).toBeNull();
    expect(
      estimateMalaysianAcquisition({ ...base, marketValue: null, usePriceAsMarketProxy: true }).fees
        .transfer_stamp_duty.amount,
    ).toBe(12000);
    for (const value of [0, -1, NaN])
      expect(
        estimateMalaysianAcquisition({ ...base, marketValue: value, usePriceAsMarketProxy: true })
          .fees.transfer_stamp_duty.amount,
      ).toBeNull();
    expect(
      estimateMalaysianAcquisition({ ...base, marketValue: 100000 }).fees.transfer_stamp_duty
        .amount,
    ).toBe(12000);
  });
  it("uses entered loan only when LTV is absent; no fallback from invalid or zero LTV", () => {
    expect(estimateMalaysianAcquisition({ ...base, loanToValuePercent: null }).loanAmount).toBe(
      100000,
    );
    for (const ltv of [0, -1, 101, NaN, Infinity])
      expect(
        estimateMalaysianAcquisition({ ...base, loanToValuePercent: ltv }).fees.loan_stamp_duty
          .amount,
      ).toBeNull();
    for (const loan of [null, 0, -1, 600001, NaN])
      expect(
        estimateMalaysianAcquisition({ ...base, loanToValuePercent: null, loanAmount: loan })
          .loanAmount,
      ).toBeNull();
  });
  it("cash explicitly gives two zeros; absent/unconfirmed financing does not imply cash", () => {
    expect(
      estimateMalaysianAcquisition({ ...base, financing: "cash", financingAvailable: false }).fees
        .loan_legal_fee.amount,
    ).toBe(0);
    expect(
      estimateMalaysianAcquisition({ ...base, financing: "cash" }).fees.loan_stamp_duty.amount,
    ).toBe(0);
    for (const input of [{ financing: "unknown" as const }, { financingAvailable: false }]) {
      const result = estimateMalaysianAcquisition({ ...base, ...input });
      expect(result.fees.loan_stamp_duty.amount).toBeNull();
      expect(result.fees.spa_legal_fee.amount).toBe(7250);
    }
  });
  it("never estimates unsupported or unconfirmed transactions", () => {
    for (const input of [
      { scopeConfirmed: false },
      { financing: "unsupported" as const },
      { purchasePrice: null },
      { purchasePrice: 0 },
      { purchasePrice: NaN },
    ])
      expect(
        Object.values(estimateMalaysianAcquisition({ ...base, ...input }).fees).every(
          (fee) => fee.amount === null,
        ),
      ).toBe(true);
  });
  it("withholds negotiated fees independently while retaining verified stamp duty", () => {
    const result = estimateMalaysianAcquisition({
      ...base,
      purchasePrice: 8000000,
      marketValue: 8000000,
      loanToValuePercent: 100,
    });
    expect(result.fees.spa_legal_fee.amount).toBeNull();
    expect(result.fees.loan_legal_fee.amount).toBeNull();
    expect(result.fees.loan_stamp_duty.amount).toBe(40000);
  });
  it("parses blanks, explicit zero and malformed inputs distinctly", () => {
    expect(parseEstimateMoney(" ")).toBeNull();
    expect(parseEstimateMoney("0")).toBe(0);
    expect(parseEstimateMoney("600,000")).toBe(600000);
    expect(parseEstimateMoney("1,5")).toBeNaN();
    expect(parseEstimateMoney("-1")).toBeNaN();
  });
});
describe("draft suggestion protection", () => {
  const estimate = estimateMalaysianAcquisition(base);
  const values = {
    ...emptyAcquisitionForm,
    purchase_price: "600000",
    spa_legal_fee: "0",
    loan_legal_fee: "1234",
  };
  const plan = (
    overrides: Partial<Parameters<typeof planAcquisitionEstimateApplication>[0]> = {},
  ) =>
    planAcquisitionEstimateApplication({
      values,
      estimate,
      currentFingerprint: estimate.fingerprint,
      selected: ["spa_legal_fee", "transfer_stamp_duty", "loan_legal_fee"],
      confirmedReplacements: [],
      ...overrides,
    });
  it("selects only blanks, protecting manual amounts and explicit zero", () => {
    expect(defaultEstimateSelection(values, estimate)).toEqual([
      "transfer_stamp_duty",
      "loan_stamp_duty",
    ]);
    expect(plan().status).toBe("confirmation-required");
    expect(plan().changes).toEqual({});
    expect(plan({ confirmedReplacements: ["spa_legal_fee", "loan_legal_fee"] }).changes).toEqual({
      spa_legal_fee: 7250,
      transfer_stamp_duty: 12300,
      loan_legal_fee: 6650,
    });
    expect(values.spa_legal_fee).toBe("0");
  });
  it.each([
    { purchasePrice: 700000 },
    { loanToValuePercent: 80 },
    { loanAmount: 200000 },
    { financing: "cash" as const },
    { financingAvailable: false },
    { marketValue: 620000 },
  ])("marks changed inputs stale and prevents application %j", (change) => {
    const changed = estimateMalaysianAcquisition({ ...base, ...change });
    expect(plan({ currentFingerprint: changed.fingerprint }).status).toBe("stale");
    expect(
      acquisitionEstimateFieldStatus(
        "spa_legal_fee",
        { ...values, spa_legal_fee: 7250 },
        { spa_legal_fee: { amount: 7250, fingerprint: estimate.fingerprint } },
        changed.fingerprint,
      ),
    ).toBe("stale");
  });
  it("manual overrides remain protected across recalculation and no unavailable amount is applied", () => {
    expect(
      acquisitionEstimateFieldStatus(
        "spa_legal_fee",
        values,
        { spa_legal_fee: { amount: 7250, fingerprint: estimate.fingerprint } },
        estimate.fingerprint,
      ),
    ).toBe("manual");
    const unavailable = estimateMalaysianAcquisition({ ...base, scopeConfirmed: false });
    expect(
      plan({
        estimate: unavailable,
        currentFingerprint: unavailable.fingerprint,
        confirmedReplacements: ["spa_legal_fee", "loan_legal_fee"],
      }).changes,
    ).toEqual({});
  });
  it("applies through the existing editor, preserves other blanks/zeros and retains uncertain-write handling", async () => {
    const propertyId = "test-property";
    let saved: AcquisitionCostsRecord | null = null;
    let uncertain = true;
    const editor = createAcquisitionEditor(propertyId, {
      save: async (attempt) => {
        if (uncertain) throw new AcquisitionSaveError("uncertain");
        saved = {
          ...attempt.values,
          id: "test-row",
          property_id: propertyId,
        } as AcquisitionCostsRecord;
        return saved;
      },
      acknowledge: async () => {},
      refresh: async () => saved,
    });
    editor.open(null);
    editor.change("purchase_price", "600000");
    editor.change("other_cost", "0");
    const changes = plan({ values: editor.getSnapshot().values }).changes;
    for (const [field, value] of Object.entries(changes))
      editor.change(field as "spa_legal_fee", String(value));
    expect(saved).toBeNull();
    expect(editor.getSnapshot().values.valuation_fee).toBe("");
    expect(editor.getSnapshot().values.other_cost).toBe("0");
    const before = editor.getSnapshot().values;
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("uncertain");
    await editor.review();
    expect(editor.getSnapshot().values).toBe(before);
    await editor.submit();
    expect(saved).toBeNull();
    editor.cancel();
    editor.open(null);
    for (const [field, value] of Object.entries(before))
      editor.change(field as "purchase_price", String(value));
    uncertain = false;
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("saved");
    expect(acquisitionCostsSchema.parse(editor.getSnapshot().values).spa_legal_fee).toBe(7250);
    expect(editor.getSnapshot().baseline?.other_cost).toBe(0);
  });
});
