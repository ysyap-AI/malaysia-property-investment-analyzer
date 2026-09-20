import { describe, expect, it } from "vitest";

import {
  ACQUISITION_COST_FIELDS,
  calculateTotalAcquisitionCost,
  type AcquisitionCostInputs,
} from "@/lib/finance/acquisition";
import { acquisitionCostsSchema, emptyAcquisitionForm } from "@/lib/property/acquisition-fields";

const allKnown: AcquisitionCostInputs = {
  purchase_price: 600000,
  spa_legal_fee: 6500,
  transfer_stamp_duty: 12000,
  loan_legal_fee: 4500,
  loan_stamp_duty: 2700,
  valuation_fee: 1200,
  renovation_cost: 25000,
  furnishing_cost: 18000,
  utility_deposits: 1500,
  maintenance_deposit: 900,
  acquisition_agent_fee: 6000,
  initial_holding_cost: 3000,
  contingency_cost: 5000,
  other_cost: 700,
};

describe("total acquisition cost", () => {
  it("adds every cost when all fields are provided", () => {
    const result = calculateTotalAcquisitionCost(allKnown);
    expect(result.status).toBe("complete");
    expect(result.total).toBe(687000);
    expect(result.missingFields).toEqual([]);
    expect(result.knownFields).toHaveLength(ACQUISITION_COST_FIELDS.length);
  });

  it("treats optional costs entered as zero as real zeros", () => {
    const result = calculateTotalAcquisitionCost({
      ...allKnown,
      renovation_cost: 0,
      furnishing_cost: 0,
      other_cost: 0,
    });
    expect(result.status).toBe("complete");
    expect(result.total).toBe(687000 - 25000 - 18000 - 700);
    expect(result.missingFields).toEqual([]);
  });

  it("reports unknown optional costs instead of counting them as zero", () => {
    const result = calculateTotalAcquisitionCost({
      ...allKnown,
      renovation_cost: null,
      contingency_cost: null,
    });
    expect(result.status).toBe("partial");
    expect(result.missingFields).toEqual(["renovation_cost", "contingency_cost"]);
    expect(result.total).toBe(687000 - 25000 - 5000);
  });

  it("refuses to produce a total when an important cost is missing", () => {
    const result = calculateTotalAcquisitionCost({ ...allKnown, purchase_price: null });
    expect(result.status).toBe("incomplete");
    expect(result.total).toBeNull();
    expect(result.missingFields).toContain("purchase_price");
  });

  it("handles decimal amounts without floating point noise", () => {
    const result = calculateTotalAcquisitionCost({
      purchase_price: 450000.55,
      spa_legal_fee: 5250.1,
      transfer_stamp_duty: 7000.25,
      loan_legal_fee: 3100.2,
      loan_stamp_duty: 1350.4,
      valuation_fee: 800.3,
      renovation_cost: 12000.75,
      furnishing_cost: 9000.05,
      utility_deposits: 1100.15,
      maintenance_deposit: 650.35,
      acquisition_agent_fee: 4500.45,
      initial_holding_cost: 2200.6,
      contingency_cost: 3300.7,
      other_cost: 450.15,
    });
    expect(result.status).toBe("complete");
    expect(result.total).toBe(500705);
  });

  it("rejects negative inputs rather than producing a total", () => {
    const result = calculateTotalAcquisitionCost({ ...allKnown, renovation_cost: -1000 });
    expect(result.status).toBe("invalid");
    expect(result.total).toBeNull();
    expect(result.invalidFields).toEqual(["renovation_cost"]);
  });

  it("treats an empty form entry as unknown, never zero", () => {
    const parsed = acquisitionCostsSchema.parse(emptyAcquisitionForm);
    expect(parsed.purchase_price).toBeNull();
    expect(parsed.other_cost).toBeNull();
    expect(calculateTotalAcquisitionCost(parsed).status).toBe("incomplete");
  });

  it("rejects negative amounts typed into the form", () => {
    const result = acquisitionCostsSchema.safeParse({
      ...emptyAcquisitionForm,
      valuation_fee: "-500",
    });
    expect(result.success).toBe(false);
  });

  it("accepts amounts typed with thousands separators and decimals", () => {
    const parsed = acquisitionCostsSchema.parse({
      ...emptyAcquisitionForm,
      purchase_price: "600,000.50",
    });
    expect(parsed.purchase_price).toBe(600000.5);
  });
});
