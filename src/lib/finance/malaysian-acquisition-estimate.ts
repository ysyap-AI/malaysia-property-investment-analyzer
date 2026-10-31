import { MALAYSIAN_ACQUISITION_RULES as RULES } from "@/config/malaysian-acquisition-rules";
import { calculateFinancing } from "./financing";
import { decimal, isSafeFinancialNumber } from "./rounding";

export const ESTIMATED_ACQUISITION_FIELDS = [
  "transfer_stamp_duty",
  "spa_legal_fee",
  "loan_legal_fee",
  "loan_stamp_duty",
] as const;
export type EstimatedAcquisitionField = (typeof ESTIMATED_ACQUISITION_FIELDS)[number];
export type MalaysianAcquisitionInputs = {
  scopeConfirmed: boolean;
  purchasePrice: number | null;
  marketValue: number | null;
  usePriceAsMarketProxy: boolean;
  financing: "unknown" | "cash" | "conventional" | "unsupported";
  loanToValuePercent: number | null;
  loanAmount: number | null;
  financingAvailable: boolean;
};
export type FeeSuggestion = { amount: number | null; basis: string };
export type MalaysianAcquisitionEstimate = {
  rulesVersion: string;
  fingerprint: string;
  fees: Record<EstimatedAcquisitionField, FeeSuggestion>;
  loanAmount: number | null;
};
const positive = (n: number | null): n is number => isSafeFinancialNumber(n) && n > 0;
const money = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Fractional RM100/RM1,000 units round UP; never round the duty percentage instead. */
export function estimateTransferDuty(value: number | null): number | null {
  if (!positive(value)) return null;
  let lower = 0;
  let duty = 0;
  for (const band of RULES.transfer.bands) {
    const portion = Math.max(0, Math.min(value, band.upTo) - lower);
    duty += Math.ceil(portion / RULES.transfer.unit) * band.dutyPerUnit;
    lower = band.upTo;
  }
  return isSafeFinancialNumber(duty) ? duty : null;
}

/** Full undiscounted scale; above RM7.5m requires negotiation, so no invented fee. */
export function estimateScaleLegalFee(value: number | null): number | null {
  const r = RULES.legal;
  if (!positive(value) || value > r.negotiationAbove) return null;
  const fee = decimal(Math.min(value, r.firstBand))
    .multiply(decimal(r.firstRate))
    .add(decimal(Math.max(0, value - r.firstBand)).multiply(decimal(r.remainingRate)))
    .round();
  return Number.isFinite(fee) ? Math.max(r.minimum, fee) : null;
}

export function estimateLoanStampDuty(value: number | null): number | null {
  if (!positive(value)) return null;
  return Math.ceil(value / RULES.loanStamp.unit) * RULES.loanStamp.dutyPerUnit;
}

export function acquisitionEstimateFingerprint(input: MalaysianAcquisitionInputs): string {
  return JSON.stringify(
    [
      RULES.version,
      input.scopeConfirmed,
      input.purchasePrice,
      input.marketValue,
      input.usePriceAsMarketProxy,
      input.financing,
      input.loanToValuePercent,
      input.loanAmount,
      input.financingAvailable,
    ],
    (_key, value: unknown) =>
      typeof value === "number" && !Number.isFinite(value) ? "invalid" : value,
  );
}

export function estimateMalaysianAcquisition(
  input: MalaysianAcquisitionInputs,
): MalaysianAcquisitionEstimate {
  const unavailable = (basis: string): FeeSuggestion => ({ amount: null, basis });
  const fees = Object.fromEntries(
    ESTIMATED_ACQUISITION_FIELDS.map((field) => [
      field,
      unavailable("Confirm the supported transaction scope to estimate fees."),
    ]),
  ) as MalaysianAcquisitionEstimate["fees"];
  const result = {
    rulesVersion: RULES.version,
    fingerprint: acquisitionEstimateFingerprint(input),
    fees,
    loanAmount: null as number | null,
  };
  if (!input.scopeConfirmed || input.financing === "unsupported") {
    if (input.financing === "unsupported")
      for (const field of ESTIMATED_ACQUISITION_FIELDS)
        fees[field] = unavailable(
          "Unsupported transaction. Enter a professional quotation manually.",
        );
    return result;
  }
  if (!positive(input.purchasePrice)) {
    for (const field of ESTIMATED_ACQUISITION_FIELDS)
      fees[field] = unavailable("Enter a valid purchase price greater than zero.");
    return result;
  }
  const price = input.purchasePrice;
  fees.spa_legal_fee = {
    amount: estimateScaleLegalFee(price),
    basis:
      price > RULES.legal.negotiationAbove
        ? "Above RM7.5 million: obtain a negotiated legal quotation."
        : `Purchase-price basis ${money(price)}; 1.25% of first RM500,000 + 1% of next RM7m; minimum RM500. Full scale before discounts and SST. Solicitor may instead use adjudicated value.`,
  };
  const market =
    input.marketValue === null && input.usePriceAsMarketProxy ? price : input.marketValue;
  fees.transfer_stamp_duty = positive(market)
    ? {
        amount: estimateTransferDuty(Math.max(price, market)),
        basis: `Higher of price ${money(price)} and ${input.marketValue === null ? "assumed market value" : "entered market value"} ${money(market)}. 1% / 2% / 3% / 4% bands at RM100k / RM500k / RM1m; each RM100 or part. For a transfer under a duly stamped SPA, market value is at SPA execution (s12A(b)). ${input.marketValue === null ? "Price proxy only; actual JPPH/Collector valuation may increase duty." : "Entered value is not an official assessment."}`,
      }
    : unavailable(
        "Enter a positive market value or explicitly use price as a provisional market-value proxy.",
      );

  if (input.financing === "cash") {
    fees.loan_legal_fee = {
      amount: 0,
      basis: "Cash purchase explicitly selected: no housing loan.",
    };
    fees.loan_stamp_duty = {
      amount: 0,
      basis: "Cash purchase explicitly selected: no loan instrument.",
    };
    return result;
  }
  let reason = "Choose cash or a conventional MYR housing loan.";
  if (input.financing === "conventional") {
    const loan = input.financingAvailable
      ? calculateFinancing({
          purchase_price: price,
          loan_to_value_percent: input.loanToValuePercent,
          loan_amount: input.loanAmount,
          annual_interest_rate_percent: null,
          loan_tenure_years: null,
          user_provided_monthly_instalment: null,
          use_user_provided_instalment: false,
        })
      : null;
    const amount = loan?.loanAmount ?? null;
    if (positive(amount) && amount <= price) {
      result.loanAmount = amount;
      const basis = `${money(amount)} from ${loan?.loanAmountSource === "from-ltv" ? "saved LTV applied to this draft price (takes precedence over entered loan)" : "saved entered loan amount"}.`;
      fees.loan_legal_fee = {
        amount: estimateScaleLegalFee(amount),
        basis:
          amount > RULES.legal.negotiationAbove
            ? "Above RM7.5 million: obtain a negotiated legal quotation."
            : `${basis} Principal loan instrument only; full 1.25% / 1% scale, minimum RM500, before discounts and SST.`,
      };
      fees.loan_stamp_duty = {
        amount: estimateLoanStampDuty(amount),
        basis: `${basis} RM5 per RM1,000 or part, principal instrument only (no additional minimum).`,
      };
      return result;
    }
    reason =
      "Loan estimate unavailable: save and confirm valid financing first. Loan must be positive and no greater than price; LTV takes precedence. Zero loan does not imply cash.";
  }
  fees.loan_legal_fee = unavailable(reason);
  fees.loan_stamp_duty = unavailable(reason);
  return result;
}
