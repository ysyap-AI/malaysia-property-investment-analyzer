import { describe, expect, it } from "vitest";
import {
  acquisitionCostsNotFinanced,
  annualCashFlow,
  calculateReturns,
  cashOnCashReturn,
  effectiveAnnualRent,
  financedBreakEvenOccupancy,
  grossRentalYield,
  initialCashInvested,
  monthlyCashFlow,
  netOperatingIncome,
  netRentalYield,
  potentialAnnualRent,
  propertyBreakEvenOccupancy,
  round2,
  yieldOnTotalCost,
  type MetricResult,
} from "@/lib/finance/returns";

const val = (r: MetricResult) => (r.status === "ok" ? r.value : r.status);
const missing = (r: MetricResult) => (r.status === "incomplete" ? r.missingInputs : []);

describe("1. potentialAnnualRent", () => {
  it("normal", () => expect(val(potentialAnnualRent(2500))).toBe(30000));
  it("zero rent", () => expect(val(potentialAnnualRent(0))).toBe(0));
  it("missing", () => expect(missing(potentialAnnualRent(null))).toEqual(["monthlyRent"]));
  it("negative invalid", () => expect(val(potentialAnnualRent(-1))).toBe("invalid"));
});

describe("2. effectiveAnnualRent", () => {
  it("normal", () => expect(val(effectiveAnnualRent(2500, 11))).toBe(27500));
  it("boundaries 0 and 12 months", () => {
    expect(val(effectiveAnnualRent(2500, 0))).toBe(0);
    expect(val(effectiveAnnualRent(2500, 12))).toBe(30000);
  });
  it("decimal months", () => expect(val(effectiveAnnualRent(2000, 10.5))).toBe(21000));
  it("missing", () => expect(missing(effectiveAnnualRent(2500, undefined))).toEqual(["occupiedMonths"]));
  it("months over 12 or negative invalid", () => {
    expect(val(effectiveAnnualRent(2500, 13))).toBe("invalid");
    expect(val(effectiveAnnualRent(2500, -1))).toBe("invalid");
  });
  it("12 months equals potential annual rent (monthly/annual consistency)", () =>
    expect(val(effectiveAnnualRent(1837.5, 12))).toBe(val(potentialAnnualRent(1837.5))));
});

describe("3. grossRentalYield", () => {
  it("normal percentage", () => expect(val(grossRentalYield(30000, 500000))).toBe(6));
  it("zero rent", () => expect(val(grossRentalYield(0, 500000))).toBe(0));
  it("division by zero", () => {
    const r = grossRentalYield(30000, 0);
    expect(r.status).toBe("invalid");
    if (r.status === "invalid") expect(r.reason).toMatch(/divide by zero/);
  });
  it("missing", () => expect(missing(grossRentalYield(30000, null))).toEqual(["purchasePrice"]));
  it("rounding to 2dp", () => expect(val(grossRentalYield(20000, 300000))).toBe(6.67));
});

describe("4. yieldOnTotalCost", () => {
  it("normal", () => expect(val(yieldOnTotalCost(30000, 600000))).toBe(5));
  it("differs from gross yield", () =>
    expect(val(yieldOnTotalCost(30000, 550000))).not.toBe(val(grossRentalYield(30000, 500000))));
  it("division by zero", () => expect(val(yieldOnTotalCost(30000, 0))).toBe("invalid"));
  it("missing", () => expect(missing(yieldOnTotalCost(null, 600000))).toEqual(["potentialAnnualRent"]));
});

describe("5. netOperatingIncome", () => {
  it("normal", () => expect(val(netOperatingIncome(27500, 6000))).toBe(21500));
  it("zero expenses", () => expect(val(netOperatingIncome(27500, 0))).toBe(27500));
  it("can be negative", () => expect(val(netOperatingIncome(5000, 6000))).toBe(-1000));
  it("missing expenses NOT treated as zero", () => {
    const r = netOperatingIncome(27500, null);
    expect(r.status).toBe("incomplete");
    expect(missing(r)).toEqual(["annualOperatingExpenses"]);
  });
  it("negative expenses invalid", () => expect(val(netOperatingIncome(27500, -5))).toBe("invalid"));
});

describe("6. netRentalYield", () => {
  it("normal", () => expect(val(netRentalYield(21500, 550000))).toBe(3.91));
  it("zero NOI", () => expect(val(netRentalYield(0, 550000))).toBe(0));
  it("negative NOI gives negative yield", () => expect(val(netRentalYield(-5500, 550000))).toBe(-1));
  it("division by zero", () => expect(val(netRentalYield(21500, 0))).toBe("invalid"));
  it("missing", () => expect(missing(netRentalYield(null, 550000))).toEqual(["noi"]));
});

describe("7. monthlyCashFlow", () => {
  it("normal", () => expect(val(monthlyCashFlow(24000, 1500))).toBe(500));
  it("zero instalment (cash purchase)", () => expect(val(monthlyCashFlow(24000, 0))).toBe(2000));
  it("negative cash flow allowed", () => expect(val(monthlyCashFlow(12000, 1500))).toBe(-500));
  it("missing instalment", () => expect(missing(monthlyCashFlow(24000, null))).toEqual(["monthlyInstalment"]));
  it("negative instalment invalid", () => expect(val(monthlyCashFlow(24000, -1))).toBe("invalid"));
  it("rounding", () => expect(val(monthlyCashFlow(10000, 0))).toBe(833.33));
});

describe("8. annualCashFlow", () => {
  it("normal", () => expect(val(annualCashFlow(24000, 18000))).toBe(6000));
  it("zero debt service", () => expect(val(annualCashFlow(24000, 0))).toBe(24000));
  it("missing", () => expect(missing(annualCashFlow(24000, undefined))).toEqual(["annualDebtService"]));
  it("monthly × 12 equals annual when debt service = instalment × 12", () => {
    const m = val(monthlyCashFlow(24000, 1500)) as number;
    expect(round2(m * 12)).toBe(val(annualCashFlow(24000, 1500 * 12)));
  });
});

describe("9. initialCashInvested (+ costs not financed)", () => {
  it("costs not financed normal", () => expect(val(acquisitionCostsNotFinanced(550000, 500000))).toBe(50000));
  it("costs not financed zero", () => expect(val(acquisitionCostsNotFinanced(500000, 500000))).toBe(0));
  it("total below price invalid", () => expect(val(acquisitionCostsNotFinanced(400000, 500000))).toBe("invalid"));
  it("normal", () => expect(val(initialCashInvested(50000, 50000))).toBe(100000));
  it("zero boundary", () => expect(val(initialCashInvested(0, 0))).toBe(0));
  it("missing", () => expect(missing(initialCashInvested(null, 50000))).toEqual(["downPayment"]));
  it("negative invalid", () => expect(val(initialCashInvested(-1, 50000))).toBe("invalid"));
});

describe("10. cashOnCashReturn", () => {
  it("normal", () => expect(val(cashOnCashReturn(6000, 100000))).toBe(6));
  it("zero cash flow", () => expect(val(cashOnCashReturn(0, 100000))).toBe(0));
  it("negative cash flow", () => expect(val(cashOnCashReturn(-3000, 100000))).toBe(-3));
  it("division by zero", () => expect(val(cashOnCashReturn(6000, 0))).toBe("invalid"));
  it("missing", () => expect(missing(cashOnCashReturn(null, 100000))).toEqual(["annualCashFlow"]));
});

describe("11. propertyBreakEvenOccupancy", () => {
  it("normal", () => expect(val(propertyBreakEvenOccupancy(6000, 30000))).toBe(20));
  it("zero expenses", () => expect(val(propertyBreakEvenOccupancy(0, 30000))).toBe(0));
  it("can exceed 100%", () => expect(val(propertyBreakEvenOccupancy(36000, 30000))).toBe(120));
  it("division by zero", () => expect(val(propertyBreakEvenOccupancy(6000, 0))).toBe("invalid"));
  it("missing", () => expect(missing(propertyBreakEvenOccupancy(null, 30000))).toEqual(["annualOperatingExpenses"]));
});

describe("12. financedBreakEvenOccupancy", () => {
  it("normal", () => expect(val(financedBreakEvenOccupancy(6000, 18000, 30000))).toBe(80));
  it("zero debt equals property-level", () =>
    expect(val(financedBreakEvenOccupancy(6000, 0, 30000))).toBe(val(propertyBreakEvenOccupancy(6000, 30000))));
  it("division by zero", () => expect(val(financedBreakEvenOccupancy(6000, 18000, 0))).toBe("invalid"));
  it("missing", () =>
    expect(missing(financedBreakEvenOccupancy(6000, null, 30000))).toEqual(["annualDebtService"]));
  it("rounding", () => expect(val(financedBreakEvenOccupancy(10000, 0, 30000))).toBe(33.33));
});

describe("calculateReturns (orchestrator, no formulas of its own)", () => {
  const full = {
    monthlyRent: 2500,
    occupiedMonths: 11,
    purchasePrice: 500000,
    totalAcquisitionCost: 550000,
    annualOperatingExpenses: 6000,
    monthlyInstalment: 1500,
    annualDebtService: 18000,
    downPayment: 50000,
  };
  it("full worked example", () => {
    const r = calculateReturns(full);
    expect(val(r.potentialAnnualRent)).toBe(30000);
    expect(val(r.effectiveAnnualRent)).toBe(27500);
    expect(val(r.grossRentalYield)).toBe(6);
    expect(val(r.yieldOnTotalCost)).toBe(5.45);
    expect(val(r.netOperatingIncome)).toBe(21500);
    expect(val(r.netRentalYield)).toBe(3.91);
    expect(val(r.monthlyCashFlow)).toBe(291.67);
    expect(val(r.annualCashFlow)).toBe(3500);
    expect(val(r.initialCashInvested)).toBe(100000);
    expect(val(r.cashOnCashReturn)).toBe(3.5);
    expect(val(r.propertyBreakEvenOccupancy)).toBe(20);
    expect(val(r.financedBreakEvenOccupancy)).toBe(80);
  });
  it("missing rent propagates as missing monthlyRent, not zero", () => {
    const r = calculateReturns({ ...full, monthlyRent: null });
    expect(missing(r.grossRentalYield)).toEqual(["monthlyRent"]);
    expect(missing(r.cashOnCashReturn)).toEqual(["monthlyRent"]);
    expect(r.initialCashInvested.status).toBe("ok");
  });
  it("missing occupancy blocks NOI chain but not gross yield", () => {
    const r = calculateReturns({ ...full, occupiedMonths: null });
    expect(val(r.grossRentalYield)).toBe(6);
    expect(missing(r.netRentalYield)).toEqual(["occupiedMonths"]);
  });
});
