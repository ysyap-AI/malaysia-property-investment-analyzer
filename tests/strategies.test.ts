import { describe, it, expect } from "vitest";
import { evaluateKeep } from "@/lib/strategies/keep";
import { evaluateFlip } from "@/lib/strategies/flip";
import { evaluateHybrid } from "@/lib/strategies/hybrid";
import { assessStrategy } from "@/lib/strategies/suitability";
import { emptyStrategyAssumptions, parseStrategyAssumptions } from "@/lib/strategies/contracts";
import { strategyDebt } from "@/lib/finance/strategy-exit";
import {
  monthlyInvestorIrr,
  sumMoney,
  investorReturns,
  strategyMonthlyAmounts,
} from "@/lib/finance/strategy-return";
import { plan, facts, snapshot, evidencedPlan, date, source } from "./strategies-fixtures";

describe("M6 independent cash-flow strategies", () => {
  it("keeps annual cash flow available without a horizon and preserves known zero rent", () => {
    const a = plan(),
      f = facts();
    a.keep.horizonMonths = null;
    let r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.metrics["annualCashFlow"]?.value).toBe(20400);
    expect(r.metrics["cumulativeCashFlow"]?.value).toBeNull();
    f.monthlyRent = 0;
    a.keep.horizonMonths = 12;
    r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.metrics["potentialAnnualRent"]?.value).toBe(0);
    expect(r.metrics["annualCashFlow"]?.value).toBe(-6000);
    expect(r.metrics["cashFunded"]?.value).toBe(531000);
    f.acquisition = null;
    r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.metrics["annualCashFlow"]?.value).toBe(-6000);
    expect(r.metrics["endingDebt"]?.value).toBe(0);
  });
  it("Keep needs no resale, has no terminal ROI, and reconciles rental-only cash", () => {
    const a = plan(),
      f = facts();
    a.flip.resalePrice = null;
    const r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.missing).toEqual([]);
    expect(r.metrics["potentialAnnualRent"]?.value).toBe(28800);
    expect(r.metrics["effectiveAnnualRent"]?.value).toBe(26400);
    expect(r.metrics["netOperatingIncome"]?.value).toBe(20400);
    expect(r.metrics["annualCashFlow"]?.value).toBe(20400);
    expect(r.metrics["cumulativeCashFlow"]?.value).toBe(102000);
    expect(r.metrics["cashOnCashReturn"]?.value).toBe(3.89);
    expect(r.metrics["initialCash"]?.value).toBe(525000);
    expect(r.metrics["equityRoi"]).toBeUndefined();
    expect(r.metrics["annualizedIrr"]).toBeUndefined();
  });
  it("Flip has no rent dependency, no uplift and reconciles all three funding bridges", () => {
    const a = plan(),
      f = facts();
    f.monthlyRent = null;
    const r = evaluateFlip({ facts: f, common: a.common, assumptions: a.flip });
    expect(r.missing).toEqual([]);
    expect(r.metrics["saleProceeds"]?.value).toBe(574000);
    expect(r.metrics["profit"]?.value).toBe(43000);
    expect(r.metrics["cashFunded"]?.value).toBe(530500);
    expect(r.metrics["equityRoi"]?.value).toBe(8.11);
    expect(sumMoney(r.cashFlows!)).toBe(43000);
    expect(r.metrics["cashReturned"]!.value! - r.metrics["cashFunded"]!.value!).toBe(43000);
    a.flip.resalePrice = null;
    expect(
      evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }).metrics["profit"]?.value,
    ).toBeNull();
  });
  it("Hybrid has its own lead-in and rental-plus-sale cash stream", () => {
    const a = plan(),
      f = facts();
    const r = evaluateHybrid({ facts: f, common: a.common, assumptions: a.hybrid });
    expect(r.missing).toEqual([]);
    expect(r.metrics["holdingRentalIncome"]?.value).toBe(118800);
    expect(r.metrics["cumulativeCashFlow"]?.value).toBe(88800);
    expect(r.metrics["profit"]?.value).toBe(137800);
    expect(r.cashFlows?.slice(1, 7)).toEqual(Array(6).fill(-500));
    expect(r.cashFlows?.[7]).toBe(1700);
    expect(sumMoney(r.cashFlows!)).toBe(137800);
    a.hybrid.nonRentalMonths = null;
    expect(
      evaluateHybrid({ facts: f, common: a.common, assumptions: a.hybrid }).metrics["profit"]
        ?.value,
    ).toBeNull();
    a.hybrid.nonRentalMonths = 60;
    expect(
      evaluateHybrid({ facts: f, common: a.common, assumptions: a.hybrid }).metrics[
        "holdingRentalIncome"
      ]?.value,
    ).toBe(0);
  });
  it("only withholds dependent Keep metrics for missing acquisition or expenses", () => {
    const a = plan(),
      f = facts();
    f.acquisition!.other_cost = null;
    let r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.metrics["cashOnCashReturn"]?.value).toBeNull();
    expect(r.metrics["grossRentalYield"]?.value).toBe(5.76);
    expect(r.metrics["cumulativeCashFlow"]?.value).toBe(102000);
    f.operating!.annual_repair_reserve = null;
    r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.metrics["netOperatingIncome"]?.value).toBeNull();
    expect(r.metrics["potentialAnnualRent"]?.value).toBe(28800);
    expect(r.metrics["grossRentalYield"]?.value).toBe(5.76);
  });
  it("unknown financing is never cash; LTV takes precedence over entered loan", () => {
    const a = plan(),
      f = facts();
    a.common.financingMode = "unknown";
    expect(
      evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }).metrics["profit"]?.value,
    ).toBeNull();
    a.common.financingMode = "conventional";
    f.financing!.loan_amount = 1;
    const d = strategyDebt(f, a.common, 60);
    expect(d.principal).toBe(400000);
    expect(d.payments?.[0]).toBe(1909.66);
    f.financing!.loan_to_value_percent = null;
    expect(strategyDebt(f, a.common, 60).principal).toBe(1);
  });
  it("mortgage carry includes principal once and exit redeems only the remainder", () => {
    const a = plan(),
      f = facts();
    a.common.financingMode = "conventional";
    const r = evaluateFlip({ facts: f, common: a.common, assumptions: a.flip });
    const d = strategyDebt(f, a.common, 12);
    expect(r.metrics["initialCash"]?.value).toBe(125000);
    expect(r.metrics["saleProceeds"]?.value).toBeCloseTo(574000 - d.endingBalance!, 2);
    expect(r.metrics["profit"]?.value).toBeCloseTo(
      600000 - 525000 - 6000 - 16000 - 10000 - d.interest!,
      2,
    );
    expect(sumMoney(r.cashFlows!)).toBe(r.metrics["profit"]?.value);
  });
  it("caps the last payment and stops at zero including early payoff and maturity", () => {
    const a = plan(),
      f = facts();
    a.common.financingMode = "conventional";
    Object.assign(f.financing!, {
      loan_to_value_percent: null,
      loan_amount: 12000,
      annual_interest_rate_percent: 0,
      loan_tenure_years: 1,
    });
    let d = strategyDebt(f, a.common, 24);
    expect(d.endingBalance).toBe(0);
    expect(d.payments?.slice(0, 12)).toEqual(Array(12).fill(1000));
    expect(d.payments?.slice(12)).toEqual(Array(12).fill(0));
    f.financing!.use_user_provided_instalment = true;
    f.financing!.user_provided_monthly_instalment = 5000;
    d = strategyDebt(f, a.common, 24);
    expect(d.payments?.slice(0, 5)).toEqual([5000, 5000, 2000, 0, 0]);
  });
  it.each(["Islamic", "Other", null])("identifies unsupported loan %s", (loan_type) => {
    const a = plan(),
      f = facts();
    a.common.financingMode = "conventional";
    f.financing!.loan_type = loan_type;
    expect(
      evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }).unsupported.length,
    ).toBeGreaterThan(0);
  });
  it("withholds unconfirmed quotes, negative amortisation and quoted maturity balloons", () => {
    const a = plan(),
      f = facts();
    a.common.financingMode = "conventional";
    f.financing!.use_user_provided_instalment = true;
    f.financing!.user_provided_monthly_instalment = 1;
    expect(strategyDebt(f, a.common, 12).unsupported.join()).toMatch(/repay/);
    a.common.quotedPaymentConfirmed = false;
    expect(strategyDebt(f, a.common, 12).unsupported.join()).toMatch(/quoted/);
    a.common.quotedPaymentConfirmed = true;
    Object.assign(f.financing!, {
      loan_amount: 12000,
      loan_to_value_percent: null,
      annual_interest_rate_percent: 0,
      loan_tenure_years: 1,
      user_provided_monthly_instalment: 100,
    });
    expect(strategyDebt(f, a.common, 24).unsupported.join()).toMatch(/balloon/);
  });
  it("unknown tax gives before-tax results and zero tax requires explicit acknowledgment", () => {
    const a = plan(),
      f = facts();
    a.flip.disposalTax = { status: "unknown", amount: null, basis: "" };
    let r = evaluateFlip({ facts: f, common: a.common, assumptions: a.flip });
    expect(r.beforeDisposalTax).toBe(true);
    expect(r.metrics["profit"]?.value).toBe(53000);
    expect(r.metrics["saleProceeds"]?.value).toBeNull();
    expect(r.metrics["beforeTaxSaleProceeds"]?.value).toBe(584000);
    a.flip.disposalTax = { status: "user_estimate", amount: 0, basis: "Reviewed zero" };
    a.flip.zerosAcknowledged = false;
    r = evaluateFlip({ facts: f, common: a.common, assumptions: a.flip });
    expect(r.metrics["profit"]?.value).toBeNull();
  });
  it("does not coerce unknown costs to zero; preserves negative cash, profit and sale proceeds", () => {
    const a = plan(),
      f = facts();
    a.flip.exitCosts.agentFee = null;
    expect(
      evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }).metrics["profit"]?.value,
    ).toBeNull();
    a.flip.exitCosts.agentFee = 12000;
    a.flip.resalePrice = 0;
    const r = evaluateFlip({ facts: f, common: a.common, assumptions: a.flip });
    expect(r.metrics["saleProceeds"]?.value).toBe(-26000);
    expect(r.metrics["profit"]?.value).toBe(-557000);
    expect(r.metrics["cashFunded"]?.value).toBe(557000);
    expect(r.metrics["equityRoi"]?.value).toBe(-100);
  });
  it("refunds require identified refundable acquisition deposits", () => {
    const a = plan(),
      f = facts();
    a.flip.depositRefund = 1000;
    expect(
      evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }).metrics["profit"]?.value,
    ).toBeNull();
    f.acquisition!.utility_deposits = 1000;
    a.flip.refundableDepositBasis = "Identified utility deposit refund";
    expect(
      evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }).metrics["profit"]?.value,
    ).toBe(43000);
  });
  it("annual cash reconciles to cents across monthly allocation", () => {
    expect(sumMoney(strategyMonthlyAmounts(100, 12))).toBe(100);
    const a = plan(),
      f = facts();
    f.operating!.annual_other_operating_expenses = 100;
    const k = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(sumMoney(k.cashFlows!.slice(0, 12))).toBe(k.metrics["annualCashFlow"]?.value);
  });
  it.each([1, 120])("supports horizon %i and fractional occupancy", (horizon) => {
    const a = plan(),
      f = facts();
    a.keep.horizonMonths = horizon;
    a.keep.occupiedMonths = 10.5;
    const r = evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(r.cashFlows).toHaveLength(horizon);
    expect(r.metrics["effectiveAnnualRent"]?.value).toBe(25200);
  });
  it("IRR uses monthly flows, handles negative rates and rejects ambiguous/unconverged roots", () => {
    expect(monthlyInvestorIrr([-100, ...Array(11).fill(0), 110]).value).toBe(10);
    expect(monthlyInvestorIrr([-100, 110]).value).toBeCloseTo(213.84, 2);
    expect(monthlyInvestorIrr([-100, ...Array(11).fill(0), 90]).value).toBe(-10);
    for (const flow of [
      [0, 1],
      [-1, -1],
      [-100, 230, -132],
      [1, -1],
      [NaN, 2],
    ])
      expect(monthlyInvestorIrr(flow).value).toBeNull();
    expect(monthlyInvestorIrr([-100, 110], 0).value).toBeNull();
    expect(investorReturns(0, [0]).equityRoi.value).toBeNull();
  });
  it("withholds IRR until final settlement timing is explicit", () => {
    const a = plan();
    a.flip.settlementAtHorizonConfirmed = false;
    const r = evaluateFlip({ facts: facts(), common: a.common, assumptions: a.flip });
    expect(r.metrics["profit"]?.value).toBe(43000);
    expect(r.metrics["annualizedIrr"]?.value).toBeNull();
  });
});

describe("M6 suitability and strict persistence contract", () => {
  it("rechecks every selling-cost line even when the total stays unchanged", () => {
    const a = evidencedPlan(),
      f = facts(),
      s = snapshot(f);
    a.flip.targets.minimumProfit = 0;
    a.flip.exitCosts.agentFee = 11000;
    a.flip.exitCosts.legalFees = 4000;
    const result = evaluateFlip({ facts: f, common: a.common, assumptions: a.flip });
    expect(result.metrics["profit"]?.value).toBe(43000);
    const suitability = assessStrategy(result, a, s, date);
    expect(suitability.label).toBe("Needs evidence");
    expect(suitability.evidenceReasons.join()).toContain("agentFee");
    expect(suitability.evidenceReasons.join()).toContain("legalFees");
  });
  it("starts blank and does not persist suggestions", () => {
    const a = emptyStrategyAssumptions();
    expect(a.keep.horizonMonths).toBeNull();
    expect(a.hybrid.nonRentalMonths).toBeNull();
    expect(a.flip.depositRefund).toBeNull();
    expect(parseStrategyAssumptions(null)).toBeNull();
    expect(parseStrategyAssumptions(a)).toEqual(a);
  });
  it.each([
    "extra",
    "version",
    "model",
    "negative",
    "horizon",
    "leadIn",
    "tax",
    "source",
    "unsafeUrl",
    "future",
    "origin",
  ])("rejects malformed %s", (kind) => {
    const a = plan() as any;
    if (kind === "extra") a.extra = true;
    if (kind === "version") a.version = 2;
    if (kind === "model") a.modelVersion = "future";
    if (kind === "negative") a.flip.resalePrice = -1;
    if (kind === "horizon") a.keep.horizonMonths = 0.5;
    if (kind === "leadIn") a.hybrid.nonRentalMonths = 61;
    if (kind === "tax") a.flip.disposalTax = { status: "user_estimate", amount: 0, basis: "" };
    if (kind === "source") a.flip.evidence.resalePrice = {};
    if (kind === "unsafeUrl")
      a.flip.evidence.resalePrice = { ...source(600000), sourceUrl: "javascript:alert(1)" };
    if (kind === "future") a.common.acceptedOn = "2099-01-01";
    if (kind === "origin")
      a.flip.evidence.resalePrice = { ...source(600000), origin: "system_estimate" };
    expect(() => parseStrategyAssumptions(a)).toThrow();
  });
  it("enforces input/evidence/targets/pass/fail precedence independently", () => {
    const a = evidencedPlan(),
      f = facts(),
      s = snapshot(f);
    const result = () => evaluateKeep({ facts: f, common: a.common, assumptions: a.keep });
    expect(assessStrategy(result(), a, s, date).label).toBe("Targets not set");
    a.keep.targets.minimumCashOnCash = 3;
    expect(assessStrategy(result(), a, s, date).label).toBe("Meets your targets");
    a.keep.targets.minimumCashOnCash = 4;
    expect(assessStrategy(result(), a, s, date).label).toBe("Outside your targets");
    a.keep.restrictionsAcknowledged = false;
    expect(assessStrategy(result(), a, s, date).label).toBe("Needs evidence");
    f.acquisition!.other_cost = null;
    expect(assessStrategy(result(), a, s, date).label).toBe("Inputs required");
    expect(
      assessStrategy(
        evaluateFlip({ facts: facts(), common: a.common, assumptions: a.flip }),
        a,
        s,
        date,
      ).label,
    ).toBe("Targets not set");
  });
  it("changed values, old evidence, unknown tax and absent rental basis block only relevant suitability", () => {
    const a = evidencedPlan(),
      f = facts(),
      s = snapshot(f);
    a.flip.targets.minimumProfit = 0;
    a.flip.evidence["resalePrice"]!.valueAtReview = 1;
    expect(
      assessStrategy(evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }), a, s, date)
        .label,
    ).toBe("Needs evidence");
    a.flip.evidence["resalePrice"] = { ...source(600000), observedOn: "2020-01-01" };
    expect(
      assessStrategy(evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }), a, s, date)
        .label,
    ).toBe("Needs evidence");
    a.flip.evidence["resalePrice"] = source(600000);
    s.property.evidence_metadata = null;
    expect(
      assessStrategy(evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }), a, s, date)
        .label,
    ).toBe("Meets your targets");
    expect(
      assessStrategy(evaluateKeep({ facts: f, common: a.common, assumptions: a.keep }), a, s, date)
        .label,
    ).toBe("Needs evidence");
    a.flip.disposalTax = { status: "unknown", amount: null, basis: "" };
    expect(
      assessStrategy(evaluateFlip({ facts: f, common: a.common, assumptions: a.flip }), a, s, date)
        .label,
    ).toBe("Needs evidence");
  });
});
