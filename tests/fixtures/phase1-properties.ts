import type { RentEvidence } from "@/config/confidence";
import { DEFAULT_SCENARIOS, type ScenarioAssumptions, type ScenarioKey } from "@/config/scenarios";
import type { AcquisitionCostField } from "@/lib/finance/acquisition";
import type { FinancingInputs } from "@/lib/finance/financing";
import type { OperatingExpenseField } from "@/lib/finance/operating-expenses";

export const PROPERTY_FIXTURE_IDS = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10"] as const;
export type PropertyFixtureId = (typeof PROPERTY_FIXTURE_IDS)[number];

type UnavailableModule = {
  status: "unavailable";
  placeholderOnly: true;
  evidence: null;
};

/** Synthetic development inputs, never real property evidence or database seeds. */
export type PropertyFixture = {
  id: PropertyFixtureId;
  name: string;
  description: string;
  synthetic: true;
  property: {
    expected_monthly_rent: number | null;
    rent_verification_status: RentEvidence;
    target_purchase_price: number;
    bank_valuation: number | null;
  };
  acquisitionCosts: Record<AcquisitionCostField, number | null>;
  operatingExpenses: Record<OperatingExpenseField, number | null>;
  financing: Omit<FinancingInputs, "purchase_price"> & { bank_quote_verified: boolean };
  scenarios: Record<ScenarioKey, ScenarioAssumptions>;
  futureModules: Record<"legal" | "location" | "rentalComparables" | "transactions" | "buildingInspection" | "externalData", UnavailableModule>;
  placeholderFocus: "legal" | "location" | null;
};

function baseline(): PropertyFixture {
  const unavailable = (): UnavailableModule => ({ status: "unavailable", placeholderOnly: true, evidence: null });
  return {
    id: "P01",
    name: "Strong high-yield property",
    description: "Complete synthetic financial inputs with positive base and bear cash flow.",
    synthetic: true,
    property: { expected_monthly_rent: 3500, rent_verification_status: "verified", target_purchase_price: 300000, bank_valuation: 300000 },
    // Explicit costs total RM 330,000. Zero means a known zero in this synthetic case.
    acquisitionCosts: {
      purchase_price: 300000, spa_legal_fee: 4000, transfer_stamp_duty: 5000,
      loan_legal_fee: 2000, loan_stamp_duty: 1200, valuation_fee: 800,
      renovation_cost: 8000, furnishing_cost: 6000, utility_deposits: 1000,
      maintenance_deposit: 500, acquisition_agent_fee: 0, initial_holding_cost: 0,
      contingency_cost: 1500, other_cost: 0,
    },
    // All expenses are annual MYR; total RM 6,000.
    operatingExpenses: {
      annual_maintenance_fee: 2400, annual_sinking_fund: 240,
      annual_assessment_tax: 600, annual_quit_or_parcel_rent: 120,
      annual_landlord_insurance: 240, annual_property_management_fee: 0,
      annual_leasing_agent_fee: 0, annual_tenancy_documentation: 0,
      annual_repair_reserve: 1200, annual_furniture_replacement_reserve: 600,
      annual_cleaning_cost: 300, annual_vacancy_utilities: 120,
      annual_bad_debt_allowance: 60, annual_other_operating_expenses: 120,
    },
    financing: {
      loan_to_value_percent: 80, loan_amount: null, annual_interest_rate_percent: 4,
      loan_tenure_years: 30, user_provided_monthly_instalment: null,
      use_user_provided_instalment: false, bank_quote_verified: true,
    },
    scenarios: structuredClone(DEFAULT_SCENARIOS),
    futureModules: {
      legal: unavailable(), location: unavailable(), rentalComparables: unavailable(),
      transactions: unavailable(), buildingInspection: unavailable(), externalData: unavailable(),
    },
    placeholderFocus: null,
  };
}

/** Each call returns independent mutable inputs, including nested scenario settings. */
export function createPropertyFixture(id: PropertyFixtureId): PropertyFixture {
  const f = baseline();
  f.id = id;
  switch (id) {
    case "P01": break;
    case "P02":
      f.name = "Negative cash-flow property";
      f.description = "Lower rent does not cover expenses and debt service.";
      f.property.expected_monthly_rent = 1500;
      break;
    case "P03":
      f.name = "High-vacancy property";
      f.description = "Stress assumptions only: 8 vacant months in base, 9 in bear, 7 in bull; no local-market evidence.";
      f.scenarios.base.vacancyMonths = 8;
      f.scenarios.bear.vacancyMonths = 9;
      f.scenarios.bull.vacancyMonths = 7;
      break;
    case "P04":
      f.name = "High-maintenance property";
      f.description = "Known annual maintenance of RM 24,000; no claim of building defects.";
      f.operatingExpenses.annual_maintenance_fee = 24000;
      break;
    case "P05":
      f.name = "Overpriced property";
      f.description = "Synthetic bank valuation is 20% below target price; no transaction-comparable or market-value claim.";
      f.property.bank_valuation = 240000;
      break;
    case "P06":
      f.name = "Property with missing rent";
      f.description = "Unknown rent stays null and blocks dependent financial results.";
      f.property.expected_monthly_rent = null;
      f.property.rent_verification_status = "missing";
      break;
    case "P07":
      f.name = "Property with missing maintenance cost";
      f.description = "Unknown maintenance stays null, distinct from a confirmed zero expense.";
      f.operatingExpenses.annual_maintenance_fee = null;
      break;
    case "P08":
      f.name = "Property with a legal-risk placeholder";
      f.description = "Legal module unavailable; placeholder only, with no asserted legal risk or clearance.";
      f.placeholderFocus = "legal";
      break;
    case "P09":
      f.name = "Property with a weak-location placeholder";
      f.description = "Location module unavailable; placeholder only, with no asserted location weakness or strength.";
      f.placeholderFocus = "location";
      break;
    case "P10":
      f.name = "Property with low data confidence";
      f.description = "Same financial numbers as P01, but rent evidence and valuation are missing and financing is unverified.";
      f.property.rent_verification_status = "missing";
      f.property.bank_valuation = null;
      f.financing.bank_quote_verified = false;
      break;
    default:
      throw new Error(`Unknown property fixture: ${id}`);
  }
  return f;
}

export function createPropertyFixtures(): PropertyFixture[] {
  return PROPERTY_FIXTURE_IDS.map(createPropertyFixture);
}
