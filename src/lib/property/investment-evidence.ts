import { z } from "zod";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import {
  acquisitionEstimateFingerprint,
  type MalaysianAcquisitionInputs,
} from "@/lib/finance/malaysian-acquisition-estimate";
import { MALAYSIAN_ACQUISITION_RULES } from "@/config/malaysian-acquisition-rules";

export const EVIDENCE_FIELDS = {
  properties: [
    "expected_monthly_rent",
    "asking_price",
    "target_purchase_price",
    "bank_valuation",
    "full_address",
  ],
  acquisition_costs: ACQUISITION_COST_FIELDS,
  financing: [
    "loan_amount",
    "annual_interest_rate_percent",
    "loan_tenure_years",
    "loan_to_value_percent",
    "user_provided_monthly_instalment",
  ],
  operating_expenses: OPERATING_EXPENSE_FIELDS,
} as const;
export type EvidenceSection = keyof typeof EVIDENCE_FIELDS;
export type EvidenceOrigin =
  "user_assumption" | "system_estimate" | "external_observation" | "verified_actual";
export type EvidenceEntry = {
  origin: EvidenceOrigin;
  valueAtReview: number | string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  notes: string | null;
  observedOn: string | null;
  verifiedOn: string | null;
  estimate: {
    rulesVersion: string;
    inputFingerprint: string;
    inputs: MalaysianAcquisitionInputs;
  } | null;
};
export type SectionEvidence<Field extends string = string> = {
  version: 1;
  fields: Partial<Record<Field, EvidenceEntry>>;
};
export const emptyEvidence = (): SectionEvidence => ({ version: 1, fields: {} });
export const klToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const number = z
  .number()
  .finite()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER / 100);
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => v === v.trim(), "Remove surrounding spaces")
    .nullable();
export const estimateInputsSchema = z
  .object({
    scopeConfirmed: z.boolean(),
    purchasePrice: number.nullable(),
    marketValue: number.nullable(),
    usePriceAsMarketProxy: z.boolean(),
    financing: z.enum(["unknown", "cash", "conventional", "unsupported"]),
    loanToValuePercent: number.max(100).nullable(),
    loanAmount: number.nullable(),
    financingAvailable: z.boolean(),
  })
  .strict();
export function evidenceEntrySchema(asOfDate = klToday()) {
  const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v + "T00:00:00Z");
      return (
        Number.isFinite(d.getTime()) &&
        d.toISOString().slice(0, 10) === v &&
        v <= asOfDate &&
        v >= "0001-01-01"
      );
    }, "Use a real date that is not in the future")
    .nullable();
  return z
    .object({
      origin: z.enum([
        "user_assumption",
        "system_estimate",
        "external_observation",
        "verified_actual",
      ]),
      valueAtReview: z.union([
        number,
        z
          .string()
          .min(1)
          .max(2000)
          .refine((v) => v.trim().length > 0, "Use a nonblank bound value"),
        z.null(),
      ]),
      sourceLabel: text(120),
      sourceUrl: text(2048).refine((v) => {
        if (v === null) return true;
        try {
          const u = new URL(v);
          return (
            /^https?:$/.test(u.protocol) &&
            !!u.hostname &&
            !u.username &&
            !u.password &&
            !/\s/.test(v)
          );
        } catch {
          return false;
        }
      }, "Use a valid HTTP or HTTPS URL"),
      notes: text(2000),
      observedOn: date,
      verifiedOn: date,
      estimate: z
        .object({
          rulesVersion: z.string().trim().min(1).max(120),
          inputFingerprint: z.string().min(1).max(2048),
          inputs: estimateInputsSchema,
        })
        .strict()
        .nullable(),
    })
    .strict()
    .superRefine((e, ctx) => {
      const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      if (
        ["external_observation", "verified_actual"].includes(e.origin) &&
        (!e.sourceLabel || !e.observedOn)
      )
        fail("Record a source label and observation date");
      if (
        e.origin === "verified_actual" &&
        (e.valueAtReview === null ||
          !e.verifiedOn ||
          !e.notes ||
          (e.observedOn && e.verifiedOn < e.observedOn))
      )
        fail(
          "Actual records need a known value, notes and a verification date on or after observation",
        );
      if (
        e.origin === "system_estimate"
          ? !e.estimate || typeof e.valueAtReview !== "number"
          : e.estimate !== null
      )
        fail("System estimates require calculator provenance; other origins cannot carry it");
    });
}
export function parseEvidence(
  section: EvidenceSection,
  raw: unknown,
  asOfDate = klToday(),
): SectionEvidence | null {
  if (raw === null || raw === undefined) return null;
  const shape = Object.fromEntries(
    EVIDENCE_FIELDS[section].map((field) => [field, evidenceEntrySchema(asOfDate).optional()]),
  );
  const parsed = z
    .object({ version: z.literal(1), fields: z.object(shape).strict() })
    .strict()
    .parse(raw) as SectionEvidence;
  for (const [field, e] of Object.entries(parsed.fields)) {
    if (!e) continue;
    if (
      e.valueAtReview !== null &&
      (field === "full_address"
        ? typeof e.valueAtReview !== "string"
        : typeof e.valueAtReview !== "number")
    )
      throw Error("Evidence value type does not match field");
    if (
      e.origin === "system_estimate" &&
      (section !== "acquisition_costs" ||
        !["spa_legal_fee", "transfer_stamp_duty", "loan_legal_fee", "loan_stamp_duty"].includes(
          field,
        ))
    )
      throw Error("Unsupported estimate field");
    if (e.estimate) {
      const expected = JSON.parse(acquisitionEstimateFingerprint(e.estimate.inputs)) as unknown[];
      expected[0] = e.estimate.rulesVersion;
      if (!evidenceEqual(JSON.parse(e.estimate.inputFingerprint), expected))
        throw Error("Estimate fingerprint does not match its recorded assumptions");
    }
    if (
      field === "loan_to_value_percent" &&
      typeof e.valueAtReview === "number" &&
      e.valueAtReview > 100
    )
      throw Error("Invalid LTV");
    if (
      field === "annual_interest_rate_percent" &&
      typeof e.valueAtReview === "number" &&
      e.valueAtReview > 30
    )
      throw Error("Invalid interest");
    if (
      field === "loan_tenure_years" &&
      typeof e.valueAtReview === "number" &&
      (!Number.isInteger(e.valueAtReview) || e.valueAtReview < 1 || e.valueAtReview > 50)
    )
      throw Error("Invalid tenure");
  }
  return parsed;
}
export function evidenceEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const x = a as Record<string, unknown>,
    y = b as Record<string, unknown>;
  return (
    Object.keys(x).length === Object.keys(y).length &&
    Object.keys(x).every((k) => Object.hasOwn(y, k) && evidenceEqual(x[k], y[k]))
  );
}
export const EVIDENCE_REVIEW_DAYS = { market: 90, recurring: 365 };
export function evidenceStatus(
  section: EvidenceSection,
  field: string,
  value: unknown,
  raw: unknown,
  asOfDate = klToday(),
  currentInputs?: MalaysianAcquisitionInputs | null,
  intervals = EVIDENCE_REVIEW_DAYS,
): string {
  let metadata;
  try {
    metadata = parseEvidence(section, raw, asOfDate);
  } catch {
    return "Evidence unavailable - review saved source";
  }
  if (value === null || value === undefined || value === "") return "Value missing";
  const e = metadata?.fields[field];
  if (!e) return "Evidence not recorded";
  if (!Object.is(value, e.valueAtReview))
    return e.origin === "system_estimate"
      ? "User assumption - value changed; review prior estimate"
      : "Value changed - review source";
  if (e.origin === "system_estimate") {
    return !e.estimate ||
      e.estimate.rulesVersion !== MALAYSIAN_ACQUISITION_RULES.version ||
      !currentInputs ||
      acquisitionEstimateFingerprint(currentInputs) !== e.estimate.inputFingerprint
      ? "System estimate - review calculation context"
      : "System estimate";
  }
  if (e.origin === "user_assumption") return "Assumption - not independently evidenced";
  const days =
    section === "operating_expenses"
      ? intervals.recurring
      : (section === "properties" && field !== "full_address") ||
          section === "financing" ||
          (section === "acquisition_costs" && e.origin === "external_observation")
        ? intervals.market
        : null;
  if (
    days !== null &&
    e.observedOn &&
    (Date.parse(asOfDate) - Date.parse(e.observedOn)) / 86400000 > days
  )
    return "Review older evidence";
  return e.origin === "verified_actual" ? "Actual - checked by you" : "External observation";
}
export function appliedEstimateEvidence(
  changes: Record<string, number | undefined>,
  inputs: MalaysianAcquisitionInputs,
  rulesVersion: string,
  fingerprint: string,
): SectionEvidence {
  return {
    version: 1,
    fields: Object.fromEntries(
      Object.entries(changes)
        .filter(([, v]) => v !== undefined)
        .map(([field, amount]) => [
          field,
          {
            origin: "system_estimate",
            valueAtReview: amount!,
            sourceLabel: "MPIA Malaysian acquisition estimator",
            sourceUrl: null,
            notes:
              "Provisional estimate; review the calculator scope, market-value assumption and exclusions.",
            observedOn: klToday(),
            verifiedOn: null,
            estimate: { rulesVersion, inputFingerprint: fingerprint, inputs: { ...inputs } },
          } satisfies EvidenceEntry,
        ]),
    ),
  };
}

/** Sources are display data and never reach the financial/scoring orchestrator. */
export function withoutEvidenceMetadata<T extends { evidence_metadata?: unknown }>(
  row: T | null | undefined,
): Omit<T, "evidence_metadata"> | null {
  if (!row) return null;
  const { evidence_metadata: _metadata, ...values } = row;
  return values;
}
