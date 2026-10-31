import { describe, expect, it } from "vitest";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import { acquisitionCostsSchema } from "@/lib/property/acquisition-fields";
import { operatingExpensesSchema } from "@/lib/property/operating-expense-fields";
import { emptyPropertyForm, propertySchema } from "@/lib/property/property-fields";
import {
  appliedEstimateEvidence,
  EVIDENCE_FIELDS,
  evidenceEqual,
  evidenceStatus,
  parseEvidence,
  withoutEvidenceMetadata,
  type EvidenceEntry,
} from "@/lib/property/investment-evidence";
import {
  acquisitionEstimateFingerprint,
  estimateMalaysianAcquisition,
  type MalaysianAcquisitionInputs,
} from "@/lib/finance/malaysian-acquisition-estimate";
import { currentEstimateInputs, evidenceDraftValues } from "@/lib/property/evidence-draft-values";
import { defaultOperatingExpenseBases } from "@/lib/property/operating-expense-fields";
import { financingRecord } from "./financing-save-fixtures";
const day = "2026-10-30";
const entry = (patch: Partial<EvidenceEntry> = {}): EvidenceEntry => ({
  origin: "external_observation",
  valueAtReview: 2200,
  sourceLabel: "Agent listing",
  sourceUrl: "https://example.test/listing",
  notes: "Advertised rent, not achieved rent",
  observedOn: day,
  verifiedOn: null,
  estimate: null,
  ...patch,
});
const metadata = (e = entry(), field = "expected_monthly_rent") => ({
  version: 1 as const,
  fields: { [field]: e },
});
const inputs: MalaysianAcquisitionInputs = {
  scopeConfirmed: true,
  purchasePrice: 500000,
  marketValue: null,
  usePriceAsMarketProxy: true,
  financing: "cash",
  loanToValuePercent: null,
  loanAmount: null,
  financingAvailable: true,
};
describe("M5 strict source contract", () => {
  it("excludes metadata from production analysis inputs while preserving numerical/declaration values", () => {
    const input = {
      expected_monthly_rent: 0,
      bank_valuation: null,
      rent_verification_status: "listing-data",
      evidence_metadata: metadata(),
    };
    expect(withoutEvidenceMetadata(input)).toEqual({
      expected_monthly_rent: 0,
      bank_valuation: null,
      rent_verification_status: "listing-data",
    });
    expect(withoutEvidenceMetadata(null)).toBeNull();
  });

  it("accepts all four origins without inferring any from a value", () => {
    expect(parseEvidence("properties", metadata())).toEqual(metadata());
    expect(
      parseEvidence("properties", metadata(entry({ origin: "user_assumption" }))),
    ).toBeTruthy();
    expect(
      parseEvidence(
        "properties",
        metadata(
          entry({
            origin: "verified_actual",
            verifiedOn: day,
            notes: "Checked executed tenancy for this unit",
          }),
        ),
      ),
    ).toBeTruthy();
    const estimate = estimateMalaysianAcquisition(inputs);
    const applied = appliedEstimateEvidence(
      { spa_legal_fee: estimate.fees.spa_legal_fee.amount! },
      inputs,
      estimate.rulesVersion,
      estimate.fingerprint,
    );
    expect(parseEvidence("acquisition_costs", applied)).toEqual(applied);
    expect(evidenceStatus("properties", "expected_monthly_rent", 2200, null, day)).toBe(
      "Evidence not recorded",
    );
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "ftp://example.test",
    "https://",
    "https://user:secret@example.test",
    "https://example.test/a b",
  ])("rejects unsafe/malformed URL %s", (sourceUrl) =>
    expect(() => parseEvidence("properties", metadata(entry({ sourceUrl })), day)).toThrow(),
  );
  it.each(["2026-02-30", "2026-13-01", "2026-10-31", "2026-1-02", "not-a-date", "0000-01-01"])(
    "rejects invalid or future date %s",
    (observedOn) =>
      expect(() => parseEvidence("properties", metadata(entry({ observedOn })), day)).toThrow(),
  );
  it.each([
    { origin: "independently_verified" },
    { extra: true },
    { sourceLabel: "x".repeat(121) },
    { notes: "x".repeat(2001) },
    { observedOn: null },
    { sourceLabel: null },
    { valueAtReview: Infinity },
    { valueAtReview: -1 },
    { valueAtReview: "2200" },
    { verifiedOn: "2026-11-01" },
  ])("rejects invalid entries %#", (patch) =>
    expect(() =>
      parseEvidence("properties", metadata({ ...entry(), ...patch } as EvidenceEntry), day),
    ).toThrow(),
  );
  it("rejects missing keys, unknown sections, manufactured system origin and incomplete actuals", () => {
    for (const raw of [
      { version: 2, fields: {} },
      { version: 1, fields: { injected: entry() } },
      { version: 1, fields: {}, other: 1 },
      metadata({ origin: "user_assumption" } as EvidenceEntry),
      metadata(entry({ origin: "system_estimate" })),
      metadata(entry({ origin: "verified_actual", notes: null, verifiedOn: day })),
      metadata(entry({ origin: "verified_actual", verifiedOn: "2026-10-29" })),
      metadata(entry({ origin: "verified_actual", valueAtReview: null, verifiedOn: day })),
    ])
      expect(() => parseEvidence("properties", raw, day)).toThrow();
  });
  it("preserves NULL and explicit zero and uses exact bindings", () => {
    const m = metadata(entry({ valueAtReview: 0, origin: "user_assumption" }));
    expect(evidenceStatus("properties", "expected_monthly_rent", null, m, day)).toBe(
      "Value missing",
    );
    expect(evidenceStatus("properties", "expected_monthly_rent", 0, m, day)).toContain(
      "Assumption",
    );
    expect(evidenceStatus("properties", "expected_monthly_rent", 0.01, m, day)).toContain(
      "Value changed",
    );
    expect(evidenceStatus("properties", "expected_monthly_rent", 2200, {}, day)).toContain(
      "unavailable",
    );
    expect(parseEvidence("properties", null)).toBeNull();
    expect(parseEvidence("properties", undefined)).toBeNull();
    const address = metadata(
      entry({ valueAtReview: "  Unit 1, Example Court  ", origin: "user_assumption" }),
      "full_address",
    );
    expect(parseEvidence("properties", address)?.fields["full_address"]?.valueAtReview).toBe(
      "  Unit 1, Example Court  ",
    );
  });
  it("compares metadata structurally after JSON reload, independent of key order", () => {
    const e = entry();
    const reordered = Object.fromEntries(Object.entries(e).reverse());
    expect(
      evidenceEqual(metadata(), { fields: { expected_monthly_rent: reordered }, version: 1 }),
    ).toBe(true);
    expect(evidenceEqual(metadata(), metadata(entry({ valueAtReview: null })))).toBe(false);
    expect(parseEvidence("properties", JSON.parse(JSON.stringify(metadata())))).toEqual(metadata());
  });
  it("uses strict 90/365 day boundaries and never expires historical acquisition actuals", () => {
    expect(
      evidenceStatus(
        "properties",
        "expected_monthly_rent",
        2200,
        metadata(entry({ observedOn: "2026-08-01" })),
        day,
      ),
    ).toBe("External observation");
    expect(
      evidenceStatus(
        "properties",
        "expected_monthly_rent",
        2200,
        metadata(entry({ observedOn: "2026-07-31" })),
        day,
      ),
    ).toBe("Review older evidence");
    expect(
      evidenceStatus(
        "acquisition_costs",
        "spa_legal_fee",
        2200,
        metadata(entry({ observedOn: "2026-07-31" }), "spa_legal_fee"),
        day,
      ),
    ).toBe("Review older evidence");
    const bill = (observedOn: string) =>
      metadata(
        entry({
          observedOn,
          valueAtReview: 0,
          origin: "verified_actual",
          verifiedOn: day,
          notes: "Checked bill",
        }),
        "annual_maintenance_fee",
      );
    expect(
      evidenceStatus("operating_expenses", "annual_maintenance_fee", 0, bill("2025-10-30"), day),
    ).toContain("checked by you");
    expect(
      evidenceStatus("operating_expenses", "annual_maintenance_fee", 0, bill("2025-10-29"), day),
    ).toBe("Review older evidence");
    expect(
      evidenceStatus(
        "acquisition_costs",
        "purchase_price",
        2200,
        metadata(
          entry({ origin: "verified_actual", observedOn: "2000-01-01", verifiedOn: day }),
          "purchase_price",
        ),
        day,
      ),
    ).toContain("checked by you");
  });
  it("retains M3 context on reload and reviews changed dependencies/rules/manual amounts", () => {
    const estimate = estimateMalaysianAcquisition(inputs),
      amount = estimate.fees.spa_legal_fee.amount!;
    const applied = JSON.parse(
      JSON.stringify(
        appliedEstimateEvidence(
          { spa_legal_fee: amount },
          inputs,
          estimate.rulesVersion,
          estimate.fingerprint,
        ),
      ),
    );
    // This fixture is assessed as of `day`; the real apply helper records today's date.
    applied.fields.spa_legal_fee.observedOn = day;
    expect(evidenceStatus("acquisition_costs", "spa_legal_fee", amount, applied, day, inputs)).toBe(
      "System estimate",
    );
    expect(
      evidenceStatus("acquisition_costs", "spa_legal_fee", amount, applied, day, {
        ...inputs,
        purchasePrice: 510000,
      }),
    ).toContain("review calculation context");
    expect(
      evidenceStatus("acquisition_costs", "spa_legal_fee", amount + 1, applied, day, inputs),
    ).toContain("User assumption");
    expect(evidenceStatus("acquisition_costs", "spa_legal_fee", amount, applied, day)).toContain(
      "review calculation context",
    );
    applied.fields.spa_legal_fee.estimate.rulesVersion = "old-rules";
    const oldFingerprint = JSON.parse(applied.fields.spa_legal_fee.estimate.inputFingerprint);
    oldFingerprint[0] = "old-rules";
    applied.fields.spa_legal_fee.estimate.inputFingerprint = JSON.stringify(oldFingerprint);
    expect(
      evidenceStatus("acquisition_costs", "spa_legal_fee", amount, applied, day, inputs),
    ).toContain("review calculation context");
    const conventional = { ...inputs, financing: "conventional" as const, loanAmount: 400000 };
    const e = appliedEstimateEvidence(
      { loan_stamp_duty: 2000 },
      conventional,
      estimate.rulesVersion,
      acquisitionEstimateFingerprint(conventional),
    ).fields["loan_stamp_duty"];
    const changed = currentEstimateInputs(e, {
      purchasePrice: 500000,
      financing: { ...financingRecord(), loan_amount: 410000 },
      available: true,
    });
    expect(changed?.loanAmount).toBe(410000);
    expect(changed?.marketValue).toBeNull();
    expect(changed?.usePriceAsMarketProxy).toBe(true);
  });
  it("binds expense evidence to canonical annual amounts and covers all approved fields", () => {
    expect(
      evidenceDraftValues(
        "operating_expenses",
        { annual_maintenance_fee: 300 },
        { ...defaultOperatingExpenseBases, annual_maintenance_fee: "monthly" },
      )["annual_maintenance_fee"],
    ).toBe(3600);
    expect(Object.values(EVIDENCE_FIELDS).map((f) => f.length)).toEqual([5, 14, 5, 14]);
  });
  it("freezes every analysis/scenario/score/confidence/risk/recommendation result for metadata-only edits", () => {
    const property = {
      ...propertySchema.parse({
        ...emptyPropertyForm,
        project_name: "Synthetic",
        expected_monthly_rent: 2200,
      }),
      id: "p",
      user_id: "owner",
      revision: 1,
      created_at: day,
      updated_at: day,
    };
    const acquisition = {
      ...acquisitionCostsSchema.parse({ purchase_price: 500000 }),
      id: "a",
      property_id: "p",
      created_at: day,
      updated_at: day,
    };
    const operating = {
      ...operatingExpensesSchema.parse({ annual_maintenance_fee: 3600 }),
      id: "o",
      property_id: "p",
      created_at: day,
      updated_at: day,
    };
    const financing = financingRecord();
    const before = analyzeProperty({ property, acquisition, operating, financing });
    const withMetadata = {
      property: { ...property, evidence_metadata: metadata() },
      acquisition: {
        ...acquisition,
        evidence_metadata: metadata(entry({ valueAtReview: 500000 }), "purchase_price"),
      },
      operating: {
        ...operating,
        evidence_metadata: metadata(entry({ valueAtReview: 3600 }), "annual_maintenance_fee"),
      },
      financing,
    };
    const after = analyzeProperty(withMetadata);
    // analyzeProperty returns raw property for presentation; compare all analytical outputs.
    const { property: _p1, ...resultsBefore } = before,
      { property: _p2, ...resultsAfter } = after;
    expect(resultsAfter).toEqual(resultsBefore);
  });
});
