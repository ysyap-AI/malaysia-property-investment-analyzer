// Engine A — Rental income, return and break-even calculations.
// THE authoritative place for these formulas. Screens and other modules must
// call these functions; never re-implement them elsewhere.
// Pure TypeScript. No React, no database, no network, no AI, no randomness.
// Unknown values arrive as `null`/`undefined` and are NEVER treated as zero.

import { decimal, isSafeFinancialNumber, roundToTwo as round2 } from "./rounding";
export { round2 };

export type MetricResult =
  | { status: "ok"; value: number }
  | { status: "incomplete"; value: null; missingInputs: string[] }
  | { status: "invalid"; value: null; invalidInputs: string[]; reason: string };

type Input = number | null | undefined;
type Rule = "nonNegative" | "positive" | "any" | "months";

/**
 * Shared guard: collects missing inputs first, then invalid ones.
 * "positive" is used for divisors so division by zero is reported, not computed.
 */
function check(inputs: Record<string, [Input, Rule]>): MetricResult | null {
  const missing = Object.entries(inputs)
    .filter(([, [v]]) => v === null || v === undefined)
    .map(([k]) => k);
  if (missing.length) return { status: "incomplete", value: null, missingInputs: missing };
  const invalid: string[] = [];
  let divByZero = false;
  for (const [k, [v, rule]] of Object.entries(inputs)) {
    if (!isSafeFinancialNumber(v)) {
      invalid.push(k);
      continue;
    }
    const n = v as number;
    if (rule === "nonNegative" && n < 0) invalid.push(k);
    if (rule === "positive" && n <= 0) {
      invalid.push(k);
      if (n === 0) divByZero = true;
    }
    if (rule === "months" && (n < 0 || n > 12)) invalid.push(k);
  }
  if (invalid.length) {
    return {
      status: "invalid",
      value: null,
      invalidInputs: invalid,
      reason: divByZero
        ? "Cannot divide by zero"
        : "Expected a finite number in the supported range (nonnegative costs; occupied months between 0 and 12)",
    };
  }
  return null;
}

const ok = (value: number): MetricResult => {
  const rounded = round2(value);
  return Number.isFinite(rounded)
    ? { status: "ok", value: rounded }
    : { status: "invalid", value: null, invalidInputs: ["result"], reason: "Result exceeds the supported numeric range" };
};

/** 1. Potential Annual Rent = Monthly Rent × 12 */
export function potentialAnnualRent(monthlyRent: Input): MetricResult {
  return check({ monthlyRent: [monthlyRent, "nonNegative"] }) ?? ok(decimal(monthlyRent as number).multiply(decimal(12)).round());
}

/** 2. Effective Annual Rent = Monthly Rent × Expected Occupied Months (0–12) */
export function effectiveAnnualRent(monthlyRent: Input, occupiedMonths: Input): MetricResult {
  return (
    check({ monthlyRent: [monthlyRent, "nonNegative"], occupiedMonths: [occupiedMonths, "months"] }) ??
    ok(decimal(monthlyRent as number).multiply(decimal(occupiedMonths as number)).round())
  );
}

/** 3. Gross Rental Yield (%) = Potential Annual Rent / Purchase Price × 100 */
export function grossRentalYield(potentialAnnualRentValue: Input, purchasePrice: Input): MetricResult {
  return (
    check({
      potentialAnnualRent: [potentialAnnualRentValue, "nonNegative"],
      purchasePrice: [purchasePrice, "positive"],
    }) ?? ok(decimal(potentialAnnualRentValue as number).divide(decimal(purchasePrice as number)).multiply(decimal(100)).round())
  );
}

/** 4. Yield on Total Cost (%) = Potential Annual Rent / Total Acquisition Cost × 100 */
export function yieldOnTotalCost(potentialAnnualRentValue: Input, totalAcquisitionCost: Input): MetricResult {
  return (
    check({
      potentialAnnualRent: [potentialAnnualRentValue, "nonNegative"],
      totalAcquisitionCost: [totalAcquisitionCost, "positive"],
    }) ?? ok(decimal(potentialAnnualRentValue as number).divide(decimal(totalAcquisitionCost as number)).multiply(decimal(100)).round())
  );
}

/** 5. NOI = Effective Annual Rent − Annual Operating Expenses (may be negative) */
export function netOperatingIncome(effectiveAnnualRentValue: Input, annualOperatingExpenses: Input): MetricResult {
  return (
    check({
      effectiveAnnualRent: [effectiveAnnualRentValue, "nonNegative"],
      annualOperatingExpenses: [annualOperatingExpenses, "nonNegative"],
    }) ?? ok(decimal(effectiveAnnualRentValue as number).subtract(decimal(annualOperatingExpenses as number)).round())
  );
}

/** 6. Net Rental Yield (%) = NOI / Total Acquisition Cost × 100 */
export function netRentalYield(noi: Input, totalAcquisitionCost: Input): MetricResult {
  return (
    check({ noi: [noi, "any"], totalAcquisitionCost: [totalAcquisitionCost, "positive"] }) ??
    ok(decimal(noi as number).divide(decimal(totalAcquisitionCost as number)).multiply(decimal(100)).round())
  );
}

/** 7. Monthly Cash Flow = NOI / 12 − Monthly Loan Instalment */
export function monthlyCashFlow(noi: Input, monthlyInstalment: Input): MetricResult {
  return (
    check({ noi: [noi, "any"], monthlyInstalment: [monthlyInstalment, "nonNegative"] }) ??
    ok(decimal(noi as number).divide(decimal(12)).subtract(decimal(monthlyInstalment as number)).round())
  );
}

/** 8. Annual Cash Flow = NOI − Annual Debt Service */
export function annualCashFlow(noi: Input, annualDebtService: Input): MetricResult {
  return (
    check({ noi: [noi, "any"], annualDebtService: [annualDebtService, "nonNegative"] }) ??
    ok(decimal(noi as number).subtract(decimal(annualDebtService as number)).round())
  );
}

/**
 * Acquisition costs not financed = Total Acquisition Cost − Purchase Price
 * (all the fees and extras on top of the price, which the loan does not cover).
 */
export function acquisitionCostsNotFinanced(totalAcquisitionCost: Input, purchasePrice: Input): MetricResult {
  const bad = check({
    totalAcquisitionCost: [totalAcquisitionCost, "nonNegative"],
    purchasePrice: [purchasePrice, "nonNegative"],
  });
  if (bad) return bad;
  const diff = (totalAcquisitionCost as number) - (purchasePrice as number);
  if (diff < 0) {
    return {
      status: "invalid",
      value: null,
      invalidInputs: ["totalAcquisitionCost"],
      reason: "Total acquisition cost is lower than the purchase price",
    };
  }
  return ok(decimal(totalAcquisitionCost as number).subtract(decimal(purchasePrice as number)).round());
}

/** 9. Initial Cash Invested = Down Payment + Acquisition Costs Not Financed */
export function initialCashInvested(downPayment: Input, costsNotFinanced: Input): MetricResult {
  return (
    check({
      downPayment: [downPayment, "nonNegative"],
      acquisitionCostsNotFinanced: [costsNotFinanced, "nonNegative"],
    }) ?? ok(decimal(downPayment as number).add(decimal(costsNotFinanced as number)).round())
  );
}

/** 10. Cash-on-Cash Return (%) = Annual Cash Flow / Initial Cash Invested × 100 */
export function cashOnCashReturn(annualCashFlowValue: Input, initialCash: Input): MetricResult {
  return (
    check({ annualCashFlow: [annualCashFlowValue, "any"], initialCashInvested: [initialCash, "positive"] }) ??
    ok(decimal(annualCashFlowValue as number).divide(decimal(initialCash as number)).multiply(decimal(100)).round())
  );
}

/** 11. Property-Level Break-Even Occupancy (%) = Annual OpEx / Potential Annual Rent × 100 */
export function propertyBreakEvenOccupancy(annualOperatingExpenses: Input, potentialAnnualRentValue: Input): MetricResult {
  return (
    check({
      annualOperatingExpenses: [annualOperatingExpenses, "nonNegative"],
      potentialAnnualRent: [potentialAnnualRentValue, "positive"],
    }) ?? ok(decimal(annualOperatingExpenses as number).divide(decimal(potentialAnnualRentValue as number)).multiply(decimal(100)).round())
  );
}

/** 12. Financed Break-Even Occupancy (%) = (Annual OpEx + Annual Debt Service) / Potential Annual Rent × 100 */
export function financedBreakEvenOccupancy(
  annualOperatingExpenses: Input,
  annualDebtService: Input,
  potentialAnnualRentValue: Input,
): MetricResult {
  return (
    check({
      annualOperatingExpenses: [annualOperatingExpenses, "nonNegative"],
      annualDebtService: [annualDebtService, "nonNegative"],
      potentialAnnualRent: [potentialAnnualRentValue, "positive"],
    }) ??
    ok(decimal(annualOperatingExpenses as number).add(decimal(annualDebtService as number)).divide(decimal(potentialAnnualRentValue as number)).multiply(decimal(100)).round())
  );
}

// ---------------------------------------------------------------------------
// Orchestrator: chains the functions above. It contains NO formulas of its own.
// A metric that depends on an unavailable metric reports that metric as missing.
// ---------------------------------------------------------------------------

export type ReturnsInputs = {
  monthlyRent: Input;
  occupiedMonths: Input;
  purchasePrice: Input;
  totalAcquisitionCost: Input;
  annualOperatingExpenses: Input;
  monthlyInstalment: Input;
  annualDebtService: Input;
  downPayment: Input;
};

export type ReturnsResult = {
  potentialAnnualRent: MetricResult;
  effectiveAnnualRent: MetricResult;
  grossRentalYield: MetricResult;
  yieldOnTotalCost: MetricResult;
  netOperatingIncome: MetricResult;
  netRentalYield: MetricResult;
  monthlyCashFlow: MetricResult;
  annualCashFlow: MetricResult;
  acquisitionCostsNotFinanced: MetricResult;
  initialCashInvested: MetricResult;
  cashOnCashReturn: MetricResult;
  propertyBreakEvenOccupancy: MetricResult;
  financedBreakEvenOccupancy: MetricResult;
};

function dep(r: MetricResult): number | null {
  return r.status === "ok" ? r.value : null;
}

/** Replaces a dependency's generic input name with its own missing inputs when upstream failed. */
function explain(result: MetricResult, upstream: Record<string, MetricResult>): MetricResult {
  if (result.status !== "incomplete") return result;
  const expanded = result.missingInputs.flatMap((name) => {
    const u = upstream[name];
    if (!u || u.status === "ok") return [name];
    return u.status === "incomplete" ? u.missingInputs : [`${name} (invalid)`];
  });
  return { ...result, missingInputs: Array.from(new Set(expanded)) };
}

export function calculateReturns(i: ReturnsInputs): ReturnsResult {
  const par = potentialAnnualRent(i.monthlyRent);
  const ear = effectiveAnnualRent(i.monthlyRent, i.occupiedMonths);
  const noi = explain(netOperatingIncome(dep(ear), i.annualOperatingExpenses), {
    effectiveAnnualRent: ear,
  });
  const acf = explain(annualCashFlow(dep(noi), i.annualDebtService), { noi });
  const cnf = acquisitionCostsNotFinanced(i.totalAcquisitionCost, i.purchasePrice);
  const ici = explain(initialCashInvested(i.downPayment, dep(cnf)), { acquisitionCostsNotFinanced: cnf });
  const parV = dep(par);
  return {
    potentialAnnualRent: par,
    effectiveAnnualRent: ear,
    grossRentalYield: explain(grossRentalYield(parV, i.purchasePrice), { potentialAnnualRent: par }),
    yieldOnTotalCost: explain(yieldOnTotalCost(parV, i.totalAcquisitionCost), { potentialAnnualRent: par }),
    netOperatingIncome: noi,
    netRentalYield: explain(netRentalYield(dep(noi), i.totalAcquisitionCost), { noi }),
    monthlyCashFlow: explain(monthlyCashFlow(dep(noi), i.monthlyInstalment), { noi }),
    annualCashFlow: acf,
    acquisitionCostsNotFinanced: cnf,
    initialCashInvested: ici,
    cashOnCashReturn: explain(cashOnCashReturn(dep(acf), dep(ici)), {
      annualCashFlow: acf,
      initialCashInvested: ici,
    }),
    propertyBreakEvenOccupancy: explain(propertyBreakEvenOccupancy(i.annualOperatingExpenses, parV), {
      potentialAnnualRent: par,
    }),
    financedBreakEvenOccupancy: explain(
      financedBreakEvenOccupancy(i.annualOperatingExpenses, i.annualDebtService, parV),
      { potentialAnnualRent: par },
    ),
  };
}
