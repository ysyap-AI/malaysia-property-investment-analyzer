import { propertySchema } from "@/lib/property/property-fields";
import { buildFinancingRow, financingSchema } from "@/lib/property/financing-fields";
import {
  estimateMalaysianAcquisition,
  type MalaysianAcquisitionInputs,
} from "@/lib/finance/malaysian-acquisition-estimate";
import {
  appliedEstimateEvidence,
  klToday,
  type EvidenceEntry,
  type SectionEvidence,
} from "@/lib/property/investment-evidence";
import { emptyStrategyAssumptions, type StrategyFacts } from "@/lib/strategies/contracts";
import { evaluateKeep } from "@/lib/strategies/keep";
import { evaluateFlip } from "@/lib/strategies/flip";
import { evaluateHybrid } from "@/lib/strategies/hybrid";

export const DEMO_NAME = "SYNTHETIC — Residensi Contoh PJ — M7 Demo";
export const DEMO_NOTE =
  "SYNTHETIC: Invented demonstration input; not actual market evidence. No real project, address, achieved rent, valuation or bank quote. Sole Malaysian citizen; conventional subsale; no incentive assumed.";

/** The maintained M7 recipe. No fictional external observations or customer data. */
export function demoFixture(reviewDate = klToday()) {
  const source = (value: number): EvidenceEntry => ({
    origin: "user_assumption",
    valueAtReview: value,
    sourceLabel: "SYNTHETIC M7 demo planning sheet",
    sourceUrl: null,
    notes: `${reviewDate}: Invented demonstration input; not actual market evidence.`,
    observedOn: reviewDate,
    verifiedOn: null,
    estimate: null,
  });
  const metadata = (values: object): SectionEvidence => ({
    version: 1,
    fields: Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => typeof value === "number")
        .map(([key, value]) => [key, source(value)]),
    ),
  });
  const property = propertySchema.parse({
    project_name: DEMO_NAME,
    city: "Petaling Jaya",
    state: "Selangor",
    country: "Malaysia",
    property_type: "Condominium",
    title_type: "Strata Title",
    tenure: "freehold",
    built_up_sqft: 900,
    bedrooms: 3,
    bathrooms: 2,
    car_parks: 1,
    asking_price: 520000,
    target_purchase_price: 500000,
    expected_monthly_rent: 3000,
    bank_valuation: null,
    rent_verification_status: "user-entered",
    property_status: "analysing",
    analysis_status: "in_progress",
    notes: DEMO_NOTE,
  });
  const acquisition = {
    purchase_price: 500000,
    spa_legal_fee: 6250,
    transfer_stamp_duty: 9000,
    loan_legal_fee: 5000,
    loan_stamp_duty: 2000,
    valuation_fee: 1500,
    renovation_cost: 20000,
    furnishing_cost: 12000,
    utility_deposits: 1000,
    maintenance_deposit: 1000,
    acquisition_agent_fee: 0,
    initial_holding_cost: 0,
    contingency_cost: 5000,
    other_cost: 2500,
  };
  const financing = buildFinancingRow(
    financingSchema.parse({
      loan_type: "Conventional",
      loan_to_value_percent: 80,
      loan_amount: null,
      annual_interest_rate_percent: 4,
      loan_tenure_years: 30,
      use_user_provided_instalment: false,
      bank_quote_verified: false,
      financing_notes: `${DEMO_NOTE} Fixed rate, monthly amortisation; no refinancing or redemption penalty assumed.`,
    }),
    acquisition.purchase_price,
  );
  const operating = {
    annual_maintenance_fee: 3600,
    annual_sinking_fund: 360,
    annual_assessment_tax: 480,
    annual_quit_or_parcel_rent: 120,
    annual_landlord_insurance: 300,
    annual_property_management_fee: 0,
    annual_leasing_agent_fee: 1200,
    annual_tenancy_documentation: 240,
    annual_repair_reserve: 1200,
    annual_furniture_replacement_reserve: 600,
    annual_cleaning_cost: 0,
    annual_vacancy_utilities: 300,
    annual_bad_debt_allowance: 0,
    annual_other_operating_expenses: 0,
  };
  const estimateInputs: MalaysianAcquisitionInputs = {
    scopeConfirmed: true,
    purchasePrice: 500000,
    marketValue: 500000,
    usePriceAsMarketProxy: true,
    financing: "conventional",
    loanToValuePercent: 80,
    loanAmount: null,
    financingAvailable: true,
  };
  const estimate = estimateMalaysianAcquisition(estimateInputs);
  const applied = appliedEstimateEvidence(
    Object.fromEntries(Object.entries(estimate.fees).map(([key, value]) => [key, value.amount!])),
    estimateInputs,
    estimate.rulesVersion,
    estimate.fingerprint,
  );
  const acquisitionEvidence = metadata(acquisition);
  Object.assign(acquisitionEvidence.fields, applied.fields);
  acquisitionEvidence.fields["other_cost"]!.notes +=
    " Separate SST/legal-disbursement allowance excluded by M3; no overlap with scale fees, duties or valuation.";
  acquisitionEvidence.fields["initial_holding_cost"]!.notes +=
    " Explicit zero: excludes every projected holding month.";
  acquisitionEvidence.fields["acquisition_agent_fee"]!.notes +=
    " Explicit zero: no buyer-paid acquisition fee assumed.";
  for (const key of ["utility_deposits", "maintenance_deposit"])
    acquisitionEvidence.fields[key]!.notes +=
      " Synthetic refundable acquisition deposit, not a tenant deposit.";
  for (const key of Object.keys(applied.fields))
    acquisitionEvidence.fields[key]!.notes =
      `SYNTHETIC M7 demo inputs. ${acquisitionEvidence.fields[key]!.notes}`;
  const strategy = emptyStrategyAssumptions();
  strategy.common = {
    financingMode: "conventional",
    fixedAmortisingConfirmed: true,
    quotedPaymentConfirmed: false,
    initialCostsOutsideHorizon: true,
    flatAssumptionsConfirmed: true,
    acceptedOn: reviewDate,
  };
  Object.assign(strategy.keep, {
    horizonMonths: 60,
    occupiedMonths: 11,
    restrictionsAcknowledged: true,
    targets: {
      ...strategy.keep.targets,
      minimumMonthlyCashFlow: 500,
      minimumCashOnCash: 4,
      maximumCashFunded: 180000,
    },
  });
  for (const id of ["flip", "hybrid"] as const)
    Object.assign(strategy[id], {
      horizonMonths: id === "flip" ? 12 : 60,
      resalePrice: id === "flip" ? 610000 : 650000,
      exitCosts: {
        agentFee: id === "flip" ? 12200 : 13000,
        legalFees: 3500,
        serviceTax: 1256,
        redemptionFees: 0,
        consentOther: 1000,
      },
      disposalTax: {
        status: "user_estimate",
        amount: id === "flip" ? 12000 : 8000,
        basis: "SYNTHETIC; no tax-rate, exemption or eligibility determination",
      },
      depositRefund: 2000,
      refundableDepositBasis:
        "SYNTHETIC: RM1,000 utility plus RM1,000 maintenance acquisition deposits only; excludes tenant deposits.",
      zerosAcknowledged: true,
      settlementAtHorizonConfirmed: true,
      restrictionsAcknowledged: true,
      targets: {
        ...strategy[id].targets,
        minimumProfit: 30000,
        minimumEquityRoi: 15,
        maximumCashFunded: 210000,
      },
    });
  strategy.hybrid.occupiedMonths = 11;
  strategy.hybrid.nonRentalMonths = 6;
  strategy.hybrid.rentThroughSaleConfirmed = true;
  for (const id of ["keep", "flip", "hybrid"] as const) {
    const values: Record<string, number> = { horizon: strategy[id].horizonMonths! };
    if (id !== "flip") values["occupancy"] = strategy[id].occupiedMonths!;
    if (id === "hybrid") values["leadIn"] = 6;
    if (id !== "keep") {
      values["resalePrice"] = strategy[id].resalePrice!;
      values["disposalTax"] = strategy[id].disposalTax.amount!;
      values["depositRefund"] = strategy[id].depositRefund!;
      for (const [key, value] of Object.entries(strategy[id].exitCosts))
        if (value) values[key] = value;
    }
    strategy[id].evidence = metadata(values).fields;
  }
  const propertyEvidence = metadata({
    asking_price: property.asking_price,
    target_purchase_price: property.target_purchase_price,
    expected_monthly_rent: property.expected_monthly_rent,
  });
  const financingEvidence = metadata(
    Object.fromEntries(
      Object.entries(financing).filter(([key]) =>
        [
          "loan_amount",
          "loan_to_value_percent",
          "annual_interest_rate_percent",
          "loan_tenure_years",
        ].includes(key),
      ),
    ),
  );
  const facts: StrategyFacts = {
    revision: 1,
    acquisition,
    financing,
    operating,
    monthlyRent: 3000,
  };
  const operatingEvidence = metadata(operating);
  for (const key of ["annual_leasing_agent_fee", "annual_tenancy_documentation"])
    operatingEvidence.fields[key]!.notes +=
      " Annualized planning budget. Vacancy is represented by occupied months; no duplicate lost-rent charge.";
  return {
    property,
    acquisition,
    financing,
    operating,
    strategy,
    facts,
    propertyEvidence,
    financingEvidence,
    acquisitionEvidence,
    operatingEvidence,
    estimate,
    estimateInputs,
  };
}
export function demoResults(f = demoFixture()) {
  return [
    evaluateKeep({ facts: f.facts, common: f.strategy.common, assumptions: f.strategy.keep }),
    evaluateFlip({ facts: f.facts, common: f.strategy.common, assumptions: f.strategy.flip }),
    evaluateHybrid({ facts: f.facts, common: f.strategy.common, assumptions: f.strategy.hybrid }),
  ];
}
