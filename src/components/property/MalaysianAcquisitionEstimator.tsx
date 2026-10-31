import { appliedEstimateEvidence, parseEvidence, type SectionEvidence } from "@/lib/property/investment-evidence";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACQUISITION_ESTIMATE_EXCLUSIONS,
  ACQUISITION_UNSUPPORTED_CASES,
  MALAYSIAN_ACQUISITION_RULES,
} from "@/config/malaysian-acquisition-rules";
import {
  estimateMalaysianAcquisition,
  ESTIMATED_ACQUISITION_FIELDS,
  type EstimatedAcquisitionField,
  type MalaysianAcquisitionInputs,
} from "@/lib/finance/malaysian-acquisition-estimate";
import {
  acquisitionEstimateFieldStatus,
  defaultEstimateSelection,
  isBlankAcquisitionValue,
  parseEstimateMoney,
  planAcquisitionEstimateApplication,
  type AppliedAcquisitionEstimates,
} from "@/lib/property/acquisition-estimate-draft";
import {
  ACQUISITION_FIELD_LABELS,
  type AcquisitionCostsFormValues,
} from "@/lib/property/acquisition-fields";
import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { useFinancialConfirmation } from "@/hooks/use-financial-confirmation";
import { writeBlocksCurrent } from "@/lib/property/financial-confirmation";
import { displayMoney } from "@/lib/property/property-fields";

export function MalaysianAcquisitionEstimator({
  propertyId,
  identityId,
  values,
  disabled,
  onApply,
  evidence,
}: {
  propertyId: string;
  identityId: string;
  values: Readonly<AcquisitionCostsFormValues>;
  disabled: boolean;
  evidence?: unknown;
  onApply: (changes: Partial<Record<EstimatedAcquisitionField, number>>, evidence: SectionEvidence) => void;
}) {
  const [restoredEvidence] = useState(() => { try { return parseEvidence("acquisition_costs", evidence); } catch { return null; } });
  const restored = Object.values(restoredEvidence?.fields ?? {}).find(entry => entry?.origin === "system_estimate")?.estimate?.inputs;
  const [opened, setOpened] = useState(false);
  const [scopeConfirmed, setScopeConfirmed] = useState(restored?.scopeConfirmed ?? false);
  const [financing, setFinancing] = useState<MalaysianAcquisitionInputs["financing"]>(restored?.financing ?? "unknown");
  const [marketValue, setMarketValue] = useState(restored?.marketValue == null ? "" : String(restored.marketValue));
  const [proxy, setProxy] = useState(restored?.usePriceAsMarketProxy ?? false);
  const [reviewedFingerprint, setReviewedFingerprint] = useState<string | null>(null);
  const [selected, setSelected] = useState<EstimatedAcquisitionField[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedAcquisitionEstimates>(() => Object.fromEntries(ESTIMATED_ACQUISITION_FIELDS.flatMap(field => {
    const entry = restoredEvidence?.fields[field];
    return entry?.origin === "system_estimate" && entry.estimate && typeof entry.valueAtReview === "number" ? [[field, { amount: entry.valueAtReview, fingerprint: entry.estimate.inputFingerprint }]] : [];
  })));
  const [message, setMessage] = useState("");
  const financial = useFinancialConfirmation(identityId, propertyId);
  const savedFinancing = useQuery({
    queryKey: financingKeys.detail(propertyId),
    queryFn: () => getFinancing(propertyId),
    enabled: opened && financing === "conventional",
  });
  const row = savedFinancing.data;
  const financeBlocked = writeBlocksCurrent(financial.financing?.outcome);
  const unsupportedLoan =
    financing === "conventional" && row?.loan_type && row.loan_type !== "Conventional";
  const input: MalaysianAcquisitionInputs = {
    scopeConfirmed,
    purchasePrice: parseEstimateMoney(values.purchase_price),
    marketValue: parseEstimateMoney(marketValue),
    usePriceAsMarketProxy: proxy,
    financing: unsupportedLoan ? "unsupported" : financing,
    loanToValuePercent: financing === "conventional" ? (row?.loan_to_value_percent ?? null) : null,
    loanAmount: financing === "conventional" ? (row?.loan_amount ?? null) : null,
    financingAvailable:
      financing !== "conventional" ||
      (!!row && !savedFinancing.error && !savedFinancing.isFetching && !financeBlocked),
  };
  const estimate = estimateMalaysianAcquisition(input);
  const staleReview = reviewedFingerprint !== null && reviewedFingerprint !== estimate.fingerprint;
  const replacements = selected.filter(
    (field) => !isBlankAcquisitionValue(values[field]) && estimate.fees[field].amount !== null,
  );
  // A changed amount, selection or input invalidates replacement consent immediately.
  const confirmationKey = JSON.stringify([estimate.fingerprint, selected, values]);
  const staleApplied = ESTIMATED_ACQUISITION_FIELDS.filter(
    (field) =>
      acquisitionEstimateFieldStatus(field, values, applied, estimate.fingerprint) === "stale",
  );
  function reviewEstimates() {
    setReviewedFingerprint(estimate.fingerprint);
    setSelected(defaultEstimateSelection(values, estimate));
    setConfirmation(null);
    setMessage("");
  }
  function applyEstimates() {
    if (disabled || staleReview || reviewedFingerprint === null) return;
    const plan = planAcquisitionEstimateApplication({
      values,
      estimate,
      currentFingerprint: reviewedFingerprint,
      selected,
      confirmedReplacements: confirmation === confirmationKey ? replacements : [],
    });
    if (plan.status !== "ready") return;
    const next = { ...applied };
    for (const field of ESTIMATED_ACQUISITION_FIELDS) {
      const amount = plan.changes[field];
      if (amount !== undefined) next[field] = { amount, fingerprint: estimate.fingerprint };
    }
    onApply(plan.changes, appliedEstimateEvidence(plan.changes, input, estimate.rulesVersion, estimate.fingerprint));
    setApplied(next);
    setSelected([]);
    setConfirmation(null);
    setMessage(
      "Selected estimates applied to your draft. Review the amounts, then Save acquisition costs to persist them.",
    );
  }
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Malaysian acquisition fee estimates</CardTitle>
        <CardDescription>
          Four standard fees with transparent calculation bases. Suggestions change your draft only
          when you apply them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950">
          {ACQUISITION_ESTIMATE_EXCLUSIONS}
        </p>
        {!opened ? (
          <Button type="button" disabled={disabled} onClick={() => setOpened(true)}>
            Estimate Malaysian fees
          </Button>
        ) : (
          <>
            <fieldset disabled={disabled} className="space-y-4">
              <legend className="font-medium">Confirm your transaction</legend>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={scopeConfirmed}
                  onChange={(event) => setScopeConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  I am a Malaysian citizen buying alone as an individual: residential subsale in
                  Peninsular Malaysia, with an issued individual or strata title.
                </span>
              </label>
              <p className="text-muted-foreground">
                {ACQUISITION_UNSUPPORTED_CASES} Leave scope unconfirmed for any unsupported case; no
                fee is suggested.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estimate-financing">Purchase financing</Label>
                  <select
                    id="estimate-financing"
                    value={financing}
                    onChange={(event) =>
                      setFinancing(event.target.value as MalaysianAcquisitionInputs["financing"])
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                  >
                    <option value="unknown">Choose financing</option>
                    <option value="cash">Cash purchase (no loan)</option>
                    <option value="conventional">Conventional MYR housing loan</option>
                    <option value="unsupported">Other / unsupported transaction</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Loan suggestions use saved financing and this draft purchase price. Save any
                    financing changes separately first. A saved LTV takes precedence over an entered
                    loan amount.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimate-market-value">Market value for transfer duty (RM)</Label>
                  <Input
                    id="estimate-market-value"
                    inputMode="decimal"
                    value={marketValue}
                    onChange={(event) => setMarketValue(event.target.value)}
                    placeholder="Enter value if known"
                  />
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={proxy}
                      onChange={(event) => setProxy(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      If market value is blank, use purchase price as a provisional proxy. Actual
                      assessed duty may be higher.
                    </span>
                  </label>
                </div>
              </div>
              {unsupportedLoan ? (
                <p role="alert">
                  Saved financing is marked {row?.loan_type}. This transaction is unsupported;
                  obtain a quotation.
                </p>
              ) : null}
              {financing === "conventional" && (financeBlocked || savedFinancing.error) ? (
                <p role="alert">
                  Saved financing is unavailable or awaiting confirmation. Loan estimates are
                  withheld.
                </p>
              ) : null}
              <Button type="button" variant="outline" onClick={reviewEstimates}>
                {reviewedFingerprint === null
                  ? "Calculate fee suggestions"
                  : "Refresh fee suggestions"}
              </Button>
            </fieldset>
            {reviewedFingerprint !== null ? (
              <>
                {staleReview ? (
                  <p role="status" className="font-medium text-amber-800">
                    Inputs changed. Suggestions below have recalculated. Refresh fee suggestions to
                    review and apply the new amounts; existing draft amounts have not changed.
                  </p>
                ) : null}
                {staleApplied.length ? (
                  <p role="alert" className="font-medium text-amber-800">
                    Stale applied estimates:{" "}
                    {staleApplied.map((field) => ACQUISITION_FIELD_LABELS[field]).join(", ")}.
                    Review these draft amounts before saving.
                  </p>
                ) : null}
                <div className="space-y-3" aria-label="Fee suggestion breakdown">
                  {ESTIMATED_ACQUISITION_FIELDS.map((field) => {
                    const fee = estimate.fees[field];
                    const status = acquisitionEstimateFieldStatus(
                      field,
                      values,
                      applied,
                      estimate.fingerprint,
                    );
                    return (
                      <div key={field} className="rounded-md border bg-background p-3">
                        <label className="flex items-start gap-2 font-medium">
                          <input
                            type="checkbox"
                            checked={selected.includes(field)}
                            disabled={disabled || staleReview || fee.amount === null}
                            onChange={(event) =>
                              setSelected((previous) =>
                                event.target.checked
                                  ? [...previous, field]
                                  : previous.filter((item) => item !== field),
                              )
                            }
                            className="mt-1"
                          />
                          <span>{ACQUISITION_FIELD_LABELS[field]}</span>
                        </label>
                        <dl className="my-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">Current draft</dt>
                            <dd>
                              {isBlankAcquisitionValue(values[field])
                                ? "Unknown / blank"
                                : Number.isNaN(parseEstimateMoney(values[field]))
                                  ? "Invalid / unresolved"
                                  : displayMoney(parseEstimateMoney(values[field]))}{" "}
                              <span className="text-xs">
                                (
                                {status === "manual"
                                  ? "manual value protected"
                                  : status === "stale"
                                    ? "stale estimate"
                                    : status === "estimated"
                                      ? "applied estimate"
                                      : "blank"}
                                )
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Suggested</dt>
                            <dd className="font-semibold">
                              {fee.amount === null ? "Unavailable" : displayMoney(fee.amount)}
                            </dd>
                          </div>
                        </dl>
                        <p className="text-xs text-muted-foreground">{fee.basis}</p>
                      </div>
                    );
                  })}
                </div>
                {replacements.length ? (
                  <label className="flex items-start gap-2 rounded-md border border-amber-300 p-3">
                    <input
                      type="checkbox"
                      checked={confirmation === confirmationKey}
                      disabled={disabled || staleReview}
                      onChange={(event) =>
                        setConfirmation(event.target.checked ? confirmationKey : null)
                      }
                      className="mt-1"
                    />
                    <span>
                      I confirm replacement of the populated values shown above:{" "}
                      {replacements.map((field) => ACQUISITION_FIELD_LABELS[field]).join(", ")}.
                      This includes any explicit zero or manual override selected.
                    </span>
                  </label>
                ) : null}
                <Button
                  type="button"
                  disabled={
                    disabled ||
                    staleReview ||
                    !selected.length ||
                    (replacements.length > 0 && confirmation !== confirmationKey)
                  }
                  onClick={applyEstimates}
                >
                  Apply selected estimates
                </Button>
                {message ? <p role="status">{message}</p> : null}
                <p className="text-xs text-muted-foreground">
                  Rules {MALAYSIAN_ACQUISITION_RULES.version}; reviewed{" "}
                  {MALAYSIAN_ACQUISITION_RULES.reviewedOn}. Current standard rules only; historical
                  transactions are outside this MVP. Estimate provenance and valuation assumptions
                  stay in this open editor; only accepted cost amounts are saved.
                </p>
                <details>
                  <summary className="cursor-pointer font-medium">Official rule sources</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>
                      <a
                        href={MALAYSIAN_ACQUISITION_RULES.transfer.source}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        HASiL: Stamp Act 1949, items 32(a), 22 and 27
                      </a>
                    </li>
                    <li>
                      <a
                        href={MALAYSIAN_ACQUISITION_RULES.amendmentSource}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        HASiL: Finance Act 2025, section 29 (foreign-buyer amendment; excluded)
                      </a>
                    </li>
                    <li>
                      <a
                        href={MALAYSIAN_ACQUISITION_RULES.legal.source}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Malaysian Bar: SRO 2023 (effective 15 July 2023)
                      </a>
                    </li>
                  </ul>
                </details>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
