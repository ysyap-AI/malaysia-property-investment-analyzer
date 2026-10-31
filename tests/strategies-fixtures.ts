import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import {
  emptyStrategyAssumptions,
  type StrategyAssumptions,
  type StrategyFacts,
} from "@/lib/strategies/contracts";
import type { PropertySnapshot } from "@/lib/property/property-revision";
import type { EvidenceEntry } from "@/lib/property/investment-evidence";
export const date = "2026-10-30";
export function plan(): StrategyAssumptions {
  const a = emptyStrategyAssumptions();
  a.common = {
    financingMode: "cash",
    flatAssumptionsConfirmed: true,
    initialCostsOutsideHorizon: true,
    acceptedOn: date,
    fixedAmortisingConfirmed: true,
    quotedPaymentConfirmed: true,
  };
  a.keep.horizonMonths = 60;
  a.keep.occupiedMonths = 11;
  for (const id of ["flip", "hybrid"] as const)
    Object.assign(a[id], {
      horizonMonths: id === "flip" ? 12 : 60,
      resalePrice: 600000,
      exitCosts: {
        agentFee: 12000,
        legalFees: 3000,
        serviceTax: 1000,
        redemptionFees: 0,
        consentOther: 0,
      },
      zerosAcknowledged: true,
      depositRefund: 0,
      settlementAtHorizonConfirmed: true,
      disposalTax: {
        status: "user_estimate",
        amount: 10000,
        basis: "Synthetic planning estimate, classification requires adviser review",
      },
    });
  a.hybrid.occupiedMonths = 11;
  a.hybrid.nonRentalMonths = 6;
  a.hybrid.rentThroughSaleConfirmed = true;
  return a;
}
export function facts(): StrategyFacts {
  return {
    revision: 4,
    monthlyRent: 2400,
    acquisition: {
      ...Object.fromEntries(ACQUISITION_COST_FIELDS.map((k) => [k, 0])),
      purchase_price: 500000,
      renovation_cost: 20000,
      contingency_cost: 5000,
    },
    operating: {
      ...Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((k) => [k, 0])),
      annual_maintenance_fee: 6000,
    },
    financing: {
      loan_type: "Conventional",
      loan_amount: null,
      loan_to_value_percent: 80,
      annual_interest_rate_percent: 4,
      loan_tenure_years: 30,
      use_user_provided_instalment: false,
      user_provided_monthly_instalment: null,
    },
  };
}
export const source = (
  value: number,
  origin: EvidenceEntry["origin"] = "external_observation",
): EvidenceEntry => ({
  origin,
  valueAtReview: value,
  sourceLabel: "Synthetic source",
  sourceUrl: "https://example.test/source",
  notes: "Synthetic local qualification; observed asking comparables, differences reviewed",
  observedOn: date,
  verifiedOn: origin === "verified_actual" ? date : null,
  estimate: null,
});
export function snapshot(f = facts()): PropertySnapshot {
  const metadata = (values: object) => ({
    version: 1,
    fields: Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => [k, source(v)]),
    ),
  });
  return {
    property: {
      id: "p",
      user_id: "owner",
      revision: f.revision,
      expected_monthly_rent: f.monthlyRent,
      investment_strategy_assumptions: null,
      evidence_metadata: {
        version: 1,
        fields: { expected_monthly_rent: source(f.monthlyRent ?? 0) },
      },
    },
    acquisition_costs: f.acquisition && {
      ...f.acquisition,
      evidence_metadata: metadata(f.acquisition),
    },
    financing: f.financing && { ...f.financing, evidence_metadata: metadata(f.financing) },
    operating_expenses: f.operating && { ...f.operating, evidence_metadata: metadata(f.operating) },
  } as unknown as PropertySnapshot;
}
export function evidencedPlan() {
  const a = plan();
  for (const id of ["keep", "flip", "hybrid"] as const) {
    const p = a[id];
    p.restrictionsAcknowledged = true;
    p.evidence["horizon"] = source(p.horizonMonths!, "user_assumption");
    if (id !== "flip") p.evidence["occupancy"] = source(a[id].occupiedMonths!, "user_assumption");
    if (id !== "keep") {
      p.evidence["resalePrice"] = source(a[id].resalePrice!);
      p.evidence["exitCosts"] = source(16000);
      for (const [key, value] of Object.entries(a[id].exitCosts))
        if (value !== null) p.evidence[key] = source(value);
      p.evidence["disposalTax"] = source(10000, "user_assumption");
    }
    if (id === "hybrid")
      p.evidence["leadIn"] = source(a.hybrid.nonRentalMonths!, "user_assumption");
  }
  return a;
}
