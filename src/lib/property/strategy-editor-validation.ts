import { strategyAssumptionsSchema } from "@/lib/strategies/contracts";

const labels: Record<string, string> = {
  keep: "Keep",
  flip: "Flip",
  hybrid: "Hybrid",
  common: "Shared assumptions",
  horizonMonths: "holding period",
  occupiedMonths: "occupied months per year",
  nonRentalMonths: "non-rental lead-in months",
  resalePrice: "resale price",
  exitCosts: "selling costs",
  agentFee: "agent fee",
  legalFees: "legal fees",
  serviceTax: "service taxes",
  redemptionFees: "redemption charges",
  consentOther: "other disposal costs",
  disposalTax: "disposal-tax estimate",
  amount: "amount",
  basis: "basis",
  targets: "investor targets",
  minimumMonthlyCashFlow: "minimum monthly cash flow",
  minimumCashOnCash: "minimum annual cash-on-cash",
  minimumProfit: "minimum profit",
  minimumEquityRoi: "minimum equity ROI",
  maximumCashFunded: "maximum cash funded",
  evidence: "supporting sources",
  sourceUrl: "source URL",
  sourceLabel: "source label",
  observedOn: "review date",
  verifiedOn: "date checked",
  acceptedOn: "acceptance date",
};
export function validateStrategyEditor(raw: unknown) {
  const result = strategyAssumptionsSchema().safeParse(raw);
  if (result.success) return { data: result.data, issues: [] };
  return {
    data: null,
    issues: result.error.issues.map((issue) => ({
      path:
        issue.path.at(-1) === "disposalTax" && raw && typeof raw === "object"
          ? `${issue.path.join(".")}.${(raw as Record<string, { disposalTax?: { amount?: unknown } }>)[String(issue.path[0])]?.disposalTax?.amount == null ? "amount" : "basis"}`
          : issue.path.join("."),
      message: `${issue.path
        .map(
          (part) =>
            labels[String(part)] ??
            String(part)
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .toLowerCase(),
        )
        .join(" — ")}: ${
        issue.code === "too_small"
          ? `enter ${issue.minimum} or more.`
          : issue.code === "too_big"
            ? `enter ${issue.maximum} or less.`
            : issue.code === "invalid_type"
              ? "enter a valid number in the indicated range (whole months for holding periods)."
              : issue.message
      }`,
    })),
  };
}
