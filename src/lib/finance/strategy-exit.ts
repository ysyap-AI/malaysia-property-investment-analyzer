import { calculateFinancing, calculateDownPayment } from "./financing";
import { acquisitionCostsNotFinanced, initialCashInvested } from "./returns";
import { roundToTwo } from "./rounding";
import {
  EXIT_FIELDS,
  type FlipAssumptions,
  type StrategyFacts,
  type StrategyAssumptions,
} from "@/lib/strategies/contracts";
import { sumMoney } from "./strategy-return";

export function strategyDebt(
  facts: StrategyFacts,
  common: StrategyAssumptions["common"],
  horizon: number | null,
) {
  const missing: string[] = [],
    unsupported: string[] = [];
  const validHorizon =
    horizon !== null && Number.isInteger(horizon) && horizon >= 1 && horizon <= 120;
  const price = facts.acquisition?.purchase_price ?? null;
  let principal: number | null = null,
    payment: number | null = null,
    rate: number | null = null,
    tenure: number | null = null;
  if (common.financingMode === "cash") {
    principal = 0;
    payment = 0;
    rate = 0;
    tenure = 0;
  } else if (common.financingMode === "unknown")
    missing.push("Choose cash or conventional financing explicitly");
  else if (common.financingMode === "unsupported")
    unsupported.push("Loan schedule is unsupported; use a qualified conventional schedule");
  else if (!facts.financing) missing.push("Financing terms");
  else {
    const f = facts.financing;
    const result = calculateFinancing({ ...f, purchase_price: price });
    principal = result.loanAmount;
    payment = result.instalmentInUse.amount;
    rate = f.annual_interest_rate_percent;
    tenure = f.loan_tenure_years;
    if (principal === null || payment === null || rate === null || tenure === null)
      missing.push("Complete financing principal, rate, tenure and instalment");
    if (f.loan_type !== "Conventional")
      unsupported.push("Only an explicitly Conventional loan is supported");
    if (
      !common.fixedAmortisingConfirmed ||
      (f.use_user_provided_instalment && !common.quotedPaymentConfirmed)
    )
      unsupported.push(
        "Confirm fixed monthly amortisation and consistency of any quoted instalment",
      );
    if (
      (rate !== null && (rate < 0 || rate > 30)) ||
      (tenure !== null && (!Number.isInteger(tenure) || tenure < 1 || tenure > 50))
    )
      unsupported.push("Financing terms outside supported range");
  }
  if (
    common.financingMode !== "cash" &&
    principal !== null &&
    (principal < 0 || price == null || principal > price)
  ) {
    missing.push("Loan must finance only the acquisition purchase price");
    principal = null;
  }
  if (!validHorizon) missing.push("Holding period: 1–120 whole months");
  if (
    missing.length ||
    unsupported.length ||
    principal === null ||
    payment === null ||
    rate === null ||
    tenure === null ||
    horizon === null
  )
    return {
      principal,
      payments: null,
      endingBalance: null,
      principalReduction: null,
      interest: null,
      missing,
      unsupported,
    };
  let balance = principal;
  const payments: number[] = [],
    interest: number[] = [];
  const quoted =
    common.financingMode === "conventional" &&
    facts.financing?.use_user_provided_instalment === true;
  // A quote must also be consistent with the declared maturity, even when sale is earlier.
  for (let m = 1; m <= Math.max(horizon, 12, quoted ? tenure * 12 : 0); m++) {
    const dueInterest = roundToTwo((balance * rate) / 1200);
    if (balance > 0 && (payment <= dueInterest || m > tenure * 12)) {
      unsupported.push("Payment does not repay the loan within the stated maturity");
      break;
    }
    const due =
      balance === 0
        ? 0
        : m === tenure * 12
          ? roundToTwo(balance + dueInterest)
          : Math.min(payment, roundToTwo(balance + dueInterest));
    // Calculated instalments may leave a few cents at maturity; a materially different quoted balloon is unsupported.
    if (quoted && m === tenure * 12 && due > payment + 1) {
      unsupported.push("Quoted payment leaves an unsupported balloon at maturity");
      break;
    }
    balance = roundToTwo(balance + dueInterest - due);
    interest.push(dueInterest);
    payments.push(due);
  }
  if (unsupported.length)
    return {
      principal,
      payments: null,
      endingBalance: null,
      principalReduction: null,
      interest: null,
      missing,
      unsupported,
    };
  const endingBalance = roundToTwo(
    principal + sumMoney(interest.slice(0, horizon)) - sumMoney(payments.slice(0, horizon)),
  );
  return {
    principal,
    payments,
    endingBalance,
    principalReduction: roundToTwo(principal - endingBalance),
    interest: sumMoney(interest.slice(0, horizon)),
    missing,
    unsupported,
  };
}
export function strategyInitialCash(
  total: number | null,
  price: number | null,
  principal: number | null,
) {
  const extras = acquisitionCostsNotFinanced(total, price);
  return initialCashInvested(calculateDownPayment(price, principal), extras.value);
}
export function strategyExit(
  a: FlipAssumptions,
  facts: StrategyFacts,
  endingBalance: number | null,
) {
  const missing: string[] = [];
  const costs = EXIT_FIELDS.map((k) => a.exitCosts[k]);
  for (const value of [...costs, a.resalePrice, a.depositRefund, a.disposalTax.amount])
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1_000_000_000_000))
      missing.push("Invalid disposal assumption: use known nonnegative amounts");
  for (const k of EXIT_FIELDS) if (a.exitCosts[k] === null) missing.push(`Exit: ${k}`);
  if (a.resalePrice === null) missing.push("Expected resale price");
  if (a.depositRefund === null)
    missing.push("Refundable deposits (enter and acknowledge zero if none)");
  if (
    (costs.includes(0) || a.depositRefund === 0 || a.disposalTax.amount === 0) &&
    !a.zerosAcknowledged
  )
    missing.push("Acknowledge explicit zero disposal amounts");
  if (a.depositRefund !== null && a.depositRefund > 0) {
    const utility = facts.acquisition?.utility_deposits,
      maintenance = facts.acquisition?.maintenance_deposit;
    if (
      utility == null ||
      maintenance == null ||
      a.depositRefund > utility + maintenance ||
      !a.refundableDepositBasis
    )
      missing.push("Identify refundable acquisition deposits and support the refund amount");
  }
  if (endingBalance === null) missing.push("Supported outstanding principal");
  const taxKnown =
    a.disposalTax.status !== "unknown" && a.disposalTax.amount !== null && !!a.disposalTax.basis;
  const sellingCosts = costs.every((v) => v !== null) ? sumMoney(costs as number[]) : null;
  const beforeTax = missing.length
    ? null
    : sumMoney([a.resalePrice!, -sellingCosts!, -endingBalance!, a.depositRefund!]);
  return {
    missing,
    sellingCosts,
    beforeTax,
    afterTax:
      beforeTax === null || !taxKnown ? null : roundToTwo(beforeTax - a.disposalTax.amount!),
    taxKnown,
  };
}
