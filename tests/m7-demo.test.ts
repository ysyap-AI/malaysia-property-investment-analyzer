import { describe, it, expect } from "vitest";
import { demoFixture, demoResults } from "./m7-demo/fixture";
import { calculateTotalAcquisitionCost, ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import {
  calculateTotalAnnualOperatingExpenses,
  OPERATING_EXPENSE_FIELDS,
} from "@/lib/finance/operating-expenses";
import { calculateFinancing } from "@/lib/finance/financing";
import { parseStrategyAssumptions } from "@/lib/strategies/contracts";
import { assessStrategy } from "@/lib/strategies/suitability";
import { sumMoney } from "@/lib/finance/strategy-return";
import { parseEvidence } from "@/lib/property/investment-evidence";
import type { PropertySnapshot } from "@/lib/property/property-revision";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import { currentEstimateInputs } from "@/lib/property/evidence-draft-values";
import { evidenceStatus } from "@/lib/property/investment-evidence";

describe("M7 exact synthetic Malaysian demo", () => {
  it("retains the handoff's null manual-principal fingerprint and exposes the existing context review reminder", () => {
    const f = demoFixture();
    const field = "loan_legal_fee";
    const inputs = currentEstimateInputs(f.acquisitionEvidence.fields[field], {
      purchasePrice: 500000,
      financing: f.financing as never,
      available: true,
    });
    expect(f.estimateInputs.loanAmount).toBeNull();
    expect(f.financing.loan_amount).toBe(400000);
    expect(
      evidenceStatus(
        "acquisition_costs",
        field,
        f.acquisition[field],
        f.acquisitionEvidence,
        undefined,
        inputs,
      ),
    ).toBe("System estimate - review calculation context");
  });
  it("retains every itemized input, separate prices and unchanged M3 provenance", () => {
    const f = demoFixture();
    expect(Object.keys(f.acquisition)).toEqual([...ACQUISITION_COST_FIELDS]);
    expect(Object.keys(f.operating)).toEqual([...OPERATING_EXPENSE_FIELDS]);
    expect(calculateTotalAcquisitionCost(f.acquisition)).toMatchObject({
      status: "complete",
      total: 565250,
    });
    expect(calculateTotalAnnualOperatingExpenses(f.operating)).toMatchObject({
      status: "complete",
      total: 8400,
    });
    expect(f.property).toMatchObject({
      asking_price: 520000,
      target_purchase_price: 500000,
      bank_valuation: null,
      expected_monthly_rent: 3000,
    });
    expect(calculateFinancing({ ...f.financing, purchase_price: 500000 })).toMatchObject({
      loanAmount: 400000,
      calculatedMonthlyInstalment: 1909.66,
      annualDebtService: 22915.92,
      downPayment: 100000,
    });
    expect(f.estimate.rulesVersion).toBe("MY-ACQ-2026-10-29.v1");
    for (const [key, fee] of Object.entries(f.estimate.fees)) {
      expect(f.acquisition[key as keyof typeof f.acquisition]).toBe(fee.amount);
      expect(f.acquisitionEvidence.fields[key]).toMatchObject({
        origin: "system_estimate",
        valueAtReview: fee.amount,
        estimate: { inputFingerprint: f.estimate.fingerprint, inputs: f.estimateInputs },
      });
    }
    for (const [section, evidence] of Object.entries({
      properties: f.propertyEvidence,
      acquisition_costs: f.acquisitionEvidence,
      financing: f.financingEvidence,
      operating_expenses: f.operatingEvidence,
    }))
      expect(parseEvidence(section as never, evidence)).toEqual(evidence);
    expect(parseStrategyAssumptions(f.strategy)).toEqual(f.strategy);
    expect(JSON.stringify(f)).not.toMatch(/external_observation|verified_actual|https:\/\//);
  });
  it("reconciles the handoff to cents, including negative Flip and six Hybrid lead-in months", () => {
    const results = demoResults();
    const expected = [
      {
        initialCash: 165250,
        annualCashFlow: 1684.08,
        monthlyCashFlow: 140.34,
        cashOnCashReturn: 1.02,
        cumulativeCashFlow: 8420.4,
        endingDebt: 361790.09,
        cashFunded: 165250,
      },
      {
        initialCash: 165250,
        holdingOperatingExpenses: 8400,
        holdingDebtPayments: 22915.92,
        endingDebt: 392955.85,
        saleProceeds: 189088.15,
        profit: -7477.77,
        cashFunded: 193956.26,
        cashReturned: 186478.49,
        equityRoi: -3.86,
        annualizedIrr: -4.16,
      },
      {
        initialCash: 165250,
        holdingRentalIncome: 148500,
        cumulativeCashFlow: -8079.6,
        endingDebt: 361790.09,
        saleProceeds: 263453.91,
        profit: 90124.31,
        cashFunded: 180907.96,
        cashReturned: 271032.27,
        equityRoi: 49.82,
        annualizedIrr: 8.59,
      },
    ];
    results.forEach((r, index) => {
      expect(r.missing).toEqual([]);
      for (const [key, value] of Object.entries(expected[index]!))
        expect(r.metrics[key], `${r.strategy}.${key}`).toMatchObject({ status: "ok", value });
      if (r.strategy !== "keep") expect(sumMoney(r.cashFlows!)).toBe(r.metrics["profit"]!.value);
    });
  });
  it("keeps all suitability labels at Needs evidence and unknown tax qualified", () => {
    const f = demoFixture();
    const snapshot = {
      property: { ...f.property, revision: 1, evidence_metadata: f.propertyEvidence },
      acquisition_costs: { ...f.acquisition, evidence_metadata: f.acquisitionEvidence },
      financing: { ...f.financing, evidence_metadata: f.financingEvidence },
      operating_expenses: { ...f.operating, evidence_metadata: f.operatingEvidence },
    } as unknown as PropertySnapshot;
    for (const r of demoResults(f))
      expect(assessStrategy(r, f.strategy, snapshot).label).toBe("Needs evidence");
    f.strategy.flip.disposalTax = { status: "unknown", amount: null, basis: "" };
    const flip = demoResults(f)[1]!;
    expect(flip.beforeDisposalTax).toBe(true);
    expect(flip.metrics["profit"]!.value).toBe(4522.23);
    f.strategy.flip.exitCosts.agentFee = null;
    expect(demoResults(f)[1]!.metrics["profit"]!.value).toBeNull();
  });
  it("reloaded JSON produces identical results without changing legacy recommendation outputs", () => {
    const f = demoFixture();
    const reloaded = JSON.parse(JSON.stringify(f)) as typeof f;
    expect(demoResults(reloaded)).toEqual(demoResults(f));
    const input = {
      property: f.property,
      acquisition: f.acquisition,
      financing: f.financing,
      operating: f.operating,
    };
    const { property: beforeProperty, ...before } = analyzeProperty(input);
    const { property: afterProperty, ...after } = analyzeProperty({
      ...input,
      property: { ...f.property, investment_strategy_assumptions: f.strategy },
    });
    expect(after).toEqual(before);
    expect(after.returns.monthlyCashFlow).toMatchObject({ status: "ok", value: 140.34 });
  });
});
