import { z } from "zod";
import { propertySchema, emptyPropertyForm } from "@/lib/property/property-fields";
import { acquisitionCostsSchema, emptyAcquisitionForm } from "@/lib/property/acquisition-fields";
import { financingSchema, emptyFinancingForm } from "@/lib/property/financing-fields";
import {
  operatingExpensesSchema,
  emptyOperatingExpenseForm,
} from "@/lib/property/operating-expense-fields";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import {
  LOCATION_FIELDS,
  sampleOrigin,
  locationKey,
  defaultEvidenceScenario,
  currentLocationEvidence,
  type EvidenceScenario,
} from "./location-fixtures";

export const sampleSchema = z.object({
  property: propertySchema,
  acquisition: acquisitionCostsSchema,
  financing: financingSchema,
  operating: operatingExpensesSchema,
});
export type SampleDraft = z.input<typeof sampleSchema>;
export type Sample = z.output<typeof sampleSchema>;
export type SampleId = "attractive" | "challenging" | "incomplete" | "blank";

export const PRESETS = [
  {
    id: "attractive",
    name: "A · Meranti Court",
    description: "Favorable assumptions",
    category: "Income opportunity",
  },
  {
    id: "challenging",
    name: "B · Senja Heights",
    description: "Cost and financing pressure",
    category: "Financial stress",
  },
  {
    id: "incomplete",
    name: "C · Rimba Residences",
    description: "Key information missing",
    category: "Incomplete evidence",
  },
] as const;

// Invented amounts only. Every zero is an explicit synthetic assumption.
// These are inputs to the unchanged engines, never hardcoded results.
export function createSample(id: SampleId): SampleDraft {
  const blank: SampleDraft = {
    property: { ...emptyPropertyForm, project_name: "New synthetic sample" },
    acquisition: { ...emptyAcquisitionForm },
    financing: { ...emptyFinancingForm },
    operating: { ...emptyOperatingExpenseForm },
  };
  if (id === "blank") return blank;
  const sample: SampleDraft = {
    property: {
      ...emptyPropertyForm,
      project_name: "Meranti Court · Fictional",
      asking_price: 325000,
      target_purchase_price: 300000,
      bank_valuation: 310000,
      expected_monthly_rent: 2900,
      rent_verification_status: "user-entered",
    },
    acquisition: {
      purchase_price: 300000,
      spa_legal_fee: 4000,
      transfer_stamp_duty: 5000,
      loan_legal_fee: 2000,
      loan_stamp_duty: 1200,
      valuation_fee: 800,
      renovation_cost: 8000,
      furnishing_cost: 6000,
      utility_deposits: 1000,
      maintenance_deposit: 500,
      acquisition_agent_fee: 0,
      initial_holding_cost: 0,
      contingency_cost: 1500,
      other_cost: 0,
    },
    financing: {
      ...emptyFinancingForm,
      loan_to_value_percent: 80,
      annual_interest_rate_percent: 4,
      loan_tenure_years: 30,
      bank_quote_verified: false,
    },
    operating: {
      annual_maintenance_fee: 2400,
      annual_sinking_fund: 240,
      annual_assessment_tax: 600,
      annual_quit_or_parcel_rent: 120,
      annual_landlord_insurance: 240,
      annual_property_management_fee: 0,
      annual_leasing_agent_fee: 0,
      annual_tenancy_documentation: 0,
      annual_repair_reserve: 1200,
      annual_furniture_replacement_reserve: 600,
      annual_cleaning_cost: 300,
      annual_vacancy_utilities: 120,
      annual_bad_debt_allowance: 60,
      annual_other_operating_expenses: 120,
    },
  };
  if (id === "challenging") {
    Object.assign(sample.property, {
      project_name: "Senja Heights · Fictional",
      asking_price: 620000,
      target_purchase_price: 580000,
      bank_valuation: 550000,
      expected_monthly_rent: 2100,
    });
    Object.assign(sample.acquisition, {
      purchase_price: 580000,
      transfer_stamp_duty: 11400,
      renovation_cost: 25000,
      furnishing_cost: 18000,
    });
    Object.assign(sample.financing, {
      loan_to_value_percent: 90,
      annual_interest_rate_percent: 4.8,
    });
    Object.assign(sample.operating, { annual_maintenance_fee: 4800, annual_repair_reserve: 2400 });
  }
  if (id === "incomplete") {
    Object.assign(blank.property, {
      project_name: "Rimba Residences · Fictional",
      asking_price: 410000,
      target_purchase_price: 390000,
    });
    blank.acquisition.purchase_price = 390000;
    Object.assign(blank.property, sampleOrigin(id)!.inputs);
    return blank;
  }
  Object.assign(sample.property, sampleOrigin(id)!.inputs);
  return sample;
}

export type SampleSession = {
  id: SampleId;
  draft: SampleDraft;
  applied: Sample;
  dirty: boolean;
  errors: Record<string, string>;
  location: {
    originVersion: string;
    acknowledgedKey: string | null;
    scenario: EvidenceScenario;
  };
};
export function startSession(id: SampleId): SampleSession {
  const draft = createSample(id);
  return {
    id,
    draft,
    applied: sampleSchema.parse(draft),
    dirty: false,
    errors: {},
    location: {
      originVersion: sampleOrigin(id)?.version ?? "no-sample-origin",
      acknowledgedKey: null,
      scenario: defaultEvidenceScenario(id),
    },
  };
}
export type SessionAction =
  | { type: "select"; id: SampleId }
  | { type: "reset" }
  | { type: "acknowledge-origin" }
  | { type: "restore-location" }
  | { type: "evidence-scenario"; scenario: EvidenceScenario }
  | { type: "edit"; section: keyof SampleDraft; field: string; value: string | boolean }
  | { type: "apply" };

export function sessionReducer(state: SampleSession, action: SessionAction): SampleSession {
  if (action.type === "select") return startSession(action.id);
  if (action.type === "reset") return startSession(state.id);
  if (action.type === "acknowledge-origin") {
    if (currentLocationEvidence(state).status !== "awaiting-origin") return state;
    return {
      ...state,
      location: {
        ...state.location,
        acknowledgedKey: locationKey(state.id, state.location.originVersion, state.draft.property),
      },
    };
  }
  if (action.type === "evidence-scenario")
    return { ...state, location: { ...state.location, scenario: action.scenario } };
  if (action.type === "restore-location") {
    const origin = sampleOrigin(state.id);
    if (!origin) return state;
    return {
      ...state,
      dirty: true,
      errors: {},
      draft: { ...state.draft, property: { ...state.draft.property, ...origin.inputs } },
      location: { ...state.location, originVersion: origin.version, acknowledgedKey: null },
    };
  }
  if (action.type === "edit") {
    return {
      ...state,
      dirty: true,
      errors: {},
      location:
        action.section === "property" && LOCATION_FIELDS.some((field) => field === action.field)
          ? { ...state.location, acknowledgedKey: null }
          : state.location,
      draft: {
        ...state.draft,
        [action.section]: { ...state.draft[action.section], [action.field]: action.value },
      },
    };
  }
  const parsed = sampleSchema.safeParse(state.draft);
  if (!parsed.success)
    return {
      ...state,
      dirty: true,
      errors: Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
      ),
    };
  return { ...state, applied: parsed.data, dirty: false, errors: {} };
}

// Hide results as soon as there is a draft, including after failed validation.
export function currentAnalysis(state: SampleSession) {
  return state.dirty ? null : analyzeProperty(state.applied);
}
