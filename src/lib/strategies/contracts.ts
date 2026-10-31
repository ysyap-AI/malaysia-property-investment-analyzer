import { z } from "zod";
import { evidenceEntrySchema, klToday } from "@/lib/property/investment-evidence";
import type { AcquisitionCostInputs } from "@/lib/finance/acquisition";
import type { OperatingExpenseInputs } from "@/lib/finance/operating-expenses";
import type { FinancingInputs } from "@/lib/finance/financing";
import type { MetricResult } from "@/lib/finance/returns";

export const STRATEGY_MODEL = "m6-v1";
export const STRATEGIES = ["keep", "flip", "hybrid"] as const;
export type StrategyId = (typeof STRATEGIES)[number];
export const EXIT_FIELDS = [
  "agentFee",
  "legalFees",
  "serviceTax",
  "redemptionFees",
  "consentOther",
] as const;
export const EXIT_LABELS = {
  agentFee: "Selling agent fee",
  legalFees: "Seller legal fees and disbursements",
  serviceTax: "Applicable service taxes",
  redemptionFees: "Redemption / lock-in charges",
  consentOther: "Consent and other disposal costs",
};
export const STRATEGY_EVIDENCE_KEYS = [
  "horizon",
  "occupancy",
  "leadIn",
  "resalePrice",
  "exitCosts",
  "disposalTax",
  "depositRefund",
  ...EXIT_FIELDS,
] as const;
const money = z.number().finite().min(0).max(1_000_000_000_000).nullable();
const target = z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000).nullable();
const horizon = z.number().int().min(1).max(120).nullable();
const occupancy = z.number().min(0).max(12).nullable();
const date = () =>
  z
    .string()
    .refine(
      (v) =>
        /^\d{4}-\d{2}-\d{2}$/.test(v) &&
        v >= "0001-01-01" &&
        v <= klToday() &&
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
    )
    .nullable();
const evidence = () =>
  z
    .object(
      Object.fromEntries(
        STRATEGY_EVIDENCE_KEYS.map((k) => [
          k,
          evidenceEntrySchema()
            .refine(
              (e) => e.origin !== "system_estimate" && typeof e.valueAtReview === "number",
              "Record a manual numeric assumption or observation",
            )
            .optional(),
        ]),
      ),
    )
    .strict();
const targets = z
  .object({
    minimumMonthlyCashFlow: target,
    minimumCashOnCash: target,
    minimumProfit: target,
    minimumEquityRoi: target,
    maximumCashFunded: money,
  })
  .strict();
const base = () => ({
  horizonMonths: horizon,
  restrictionsAcknowledged: z.boolean(),
  targets,
  evidence: evidence(),
});
const sale = () => ({
  ...base(),
  resalePrice: money,
  exitCosts: z
    .object({
      agentFee: money,
      legalFees: money,
      serviceTax: money,
      redemptionFees: money,
      consentOther: money,
    })
    .strict(),
  zerosAcknowledged: z.boolean(),
  disposalTax: z
    .object({
      status: z.enum(["unknown", "user_estimate", "adviser_estimate"]),
      amount: money,
      basis: z.string().trim().max(2000),
    })
    .strict(),
  depositRefund: money,
  refundableDepositBasis: z.string().trim().max(2000),
  settlementAtHorizonConfirmed: z.boolean(),
});
export const strategyAssumptionsSchema = () =>
  z
    .object({
      version: z.literal(1),
      modelVersion: z.literal(STRATEGY_MODEL),
      preferredStrategy: z.enum(STRATEGIES).nullable(),
      common: z
        .object({
          financingMode: z.enum(["unknown", "cash", "conventional", "unsupported"]),
          fixedAmortisingConfirmed: z.boolean(),
          quotedPaymentConfirmed: z.boolean(),
          initialCostsOutsideHorizon: z.boolean(),
          flatAssumptionsConfirmed: z.boolean(),
          acceptedOn: date(),
        })
        .strict(),
      keep: z.object({ ...base(), occupiedMonths: occupancy }).strict(),
      flip: z.object(sale()).strict(),
      hybrid: z
        .object({
          ...sale(),
          occupiedMonths: occupancy,
          nonRentalMonths: z.number().int().min(0).max(120).nullable(),
          rentThroughSaleConfirmed: z.boolean(),
        })
        .strict(),
    })
    .strict()
    .superRefine((a, ctx) => {
      if (
        a.hybrid.nonRentalMonths !== null &&
        a.hybrid.horizonMonths !== null &&
        a.hybrid.nonRentalMonths > a.hybrid.horizonMonths
      )
        ctx.addIssue({
          code: "custom",
          path: ["hybrid", "nonRentalMonths"],
          message: "Lead-in cannot exceed the holding period",
        });
      for (const id of ["flip", "hybrid"] as const) {
        const t = a[id].disposalTax;
        if (
          (t.status === "unknown") !== (t.amount === null) ||
          (t.status !== "unknown" && !t.basis)
        )
          ctx.addIssue({
            code: "custom",
            path: [id, "disposalTax"],
            message: "Known tax requires an amount and basis; unknown tax must stay blank",
          });
      }
    });
export type StrategyAssumptions = z.infer<ReturnType<typeof strategyAssumptionsSchema>>;
export type KeepAssumptions = StrategyAssumptions["keep"];
export type FlipAssumptions = StrategyAssumptions["flip"];
export type HybridAssumptions = StrategyAssumptions["hybrid"];
export const parseStrategyAssumptions = (raw: unknown): StrategyAssumptions | null =>
  raw == null ? null : strategyAssumptionsSchema().parse(raw);
const blankTargets = () => ({
  minimumMonthlyCashFlow: null,
  minimumCashOnCash: null,
  minimumProfit: null,
  minimumEquityRoi: null,
  maximumCashFunded: null,
});
const blankBase = () => ({
  horizonMonths: null,
  restrictionsAcknowledged: false,
  targets: blankTargets(),
  evidence: {},
});
const blankSale = () => ({
  ...blankBase(),
  resalePrice: null,
  exitCosts: {
    agentFee: null,
    legalFees: null,
    serviceTax: null,
    redemptionFees: null,
    consentOther: null,
  },
  zerosAcknowledged: false,
  disposalTax: { status: "unknown" as const, amount: null, basis: "" },
  depositRefund: null,
  refundableDepositBasis: "",
  settlementAtHorizonConfirmed: false,
});
/** Blank persisted contract. Suggestions are applied only by an explicit editor action. */
export const emptyStrategyAssumptions = (): StrategyAssumptions => ({
  version: 1,
  modelVersion: STRATEGY_MODEL,
  preferredStrategy: null,
  common: {
    financingMode: "unknown",
    fixedAmortisingConfirmed: false,
    quotedPaymentConfirmed: false,
    initialCostsOutsideHorizon: false,
    flatAssumptionsConfirmed: false,
    acceptedOn: null,
  },
  keep: { ...blankBase(), occupiedMonths: null },
  flip: blankSale(),
  hybrid: {
    ...blankSale(),
    occupiedMonths: null,
    nonRentalMonths: null,
    rentThroughSaleConfirmed: false,
  },
});
export type StrategyFacts = {
  revision: number;
  acquisition: AcquisitionCostInputs | null;
  operating: OperatingExpenseInputs | null;
  financing: (Omit<FinancingInputs, "purchase_price"> & { loan_type?: string | null }) | null;
  monthlyRent: number | null;
};
export type KeepInputs = {
  facts: StrategyFacts;
  common: StrategyAssumptions["common"];
  assumptions: KeepAssumptions;
};
export type FlipInputs = {
  facts: StrategyFacts;
  common: StrategyAssumptions["common"];
  assumptions: FlipAssumptions;
};
export type HybridInputs = {
  facts: StrategyFacts;
  common: StrategyAssumptions["common"];
  assumptions: HybridAssumptions;
};
export type StrategyMetric = MetricResult | { status: "unsupported"; value: null; reason: string };
export type StrategyResult = {
  strategy: StrategyId;
  modelVersion: string;
  revision: number;
  horizonMonths: number | null;
  metrics: Record<string, StrategyMetric>;
  missing: string[];
  unsupported: string[];
  cashFlows: number[] | null;
  beforeDisposalTax: boolean;
};
export type KeepResult = StrategyResult & { strategy: "keep" };
export type FlipResult = StrategyResult & { strategy: "flip" };
export type HybridResult = StrategyResult & { strategy: "hybrid" };
