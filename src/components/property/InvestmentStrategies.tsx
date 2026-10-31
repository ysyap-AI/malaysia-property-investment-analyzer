import { revealAndFocus } from "@/hooks/use-source-navigation";
import { validateStrategyEditor } from "@/lib/property/strategy-editor-validation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useFinancialAvailability,
  useFinancialConfirmation,
} from "@/hooks/use-financial-confirmation";
import { useDiscloseSavedDraft } from "@/hooks/use-saved-draft-disclosure";
import { getProperty, propertyKeys } from "@/lib/property/property-api";
import { financialInputLabel } from "@/lib/property/saved-analysis-presentation";
import {
  getPropertySnapshot,
  RevisionWriteError,
  type PropertySnapshot,
} from "@/lib/property/property-revision";
import { saveStrategyAssumptions } from "@/lib/property/strategy-api";
import { trackFinancialWrite } from "@/lib/property/financial-confirmation";
import { supabase } from "@/integrations/supabase/external-client";
import { evidenceEqual, klToday, type EvidenceEntry } from "@/lib/property/investment-evidence";
import {
  EXIT_FIELDS,
  EXIT_LABELS,
  STRATEGIES,
  emptyStrategyAssumptions,
  parseStrategyAssumptions,
  type StrategyAssumptions,
  type StrategyFacts,
  type StrategyId,
  type StrategyMetric,
} from "@/lib/strategies/contracts";
import { evaluateKeep } from "@/lib/strategies/keep";
import { evaluateFlip } from "@/lib/strategies/flip";
import { evaluateHybrid } from "@/lib/strategies/hybrid";
import { assessStrategy } from "@/lib/strategies/suitability";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const names = { keep: "Buy-to-Keep", flip: "Buy-to-Flip", hybrid: "Hybrid — Rent Then Sell" };
const sourceNames: Record<string, string> = {
  ...EXIT_LABELS,
  horizon: "Holding-period basis",
  occupancy: "Occupancy basis",
  leadIn: "Non-rental lead-in basis",
  resalePrice: "Resale-price comparables / valuation basis",
  exitCosts: "Selling-cost quotations (total)",
  disposalTax: "Disposal-tax estimate basis",
  depositRefund: "Refundable-deposit basis",
};
const labels: Record<string, string> = {
  acquisitionTotal: "Total acquisition and project budget",
  initialCash: "Initial investor cash",
  potentialAnnualRent: "Potential annual rent",
  effectiveAnnualRent: "Occupancy-adjusted annual rent",
  grossRentalYield: "Gross rental yield (%)",
  netRentalYield: "Net rental yield on total cost (%)",
  yieldOnTotalCost: "Potential rent yield on total cost (%)",
  netOperatingIncome: "Annual net operating income",
  monthlyCashFlow: "First-year monthly cash flow equivalent",
  annualCashFlow: "First-year annual cash flow",
  cashOnCashReturn: "First-year cash-on-cash return (%)",
  cumulativeCashFlow: "Holding cash flow, excluding sale",
  endingDebt: "Outstanding loan at horizon",
  principalReduction: "Principal reduction (not additional profit)",
  financingInterest: "Interest included in debt payments",
  holdingOperatingExpenses: "Operating expenses over the holding period",
  holdingDebtPayments: "Full loan payments over the holding period",
  monthlyCarryingCosts: "Monthly operating carry, excluding loan payments",
  holdingRentalIncome: "Rental income over the holding period",
  sellingCosts: "Itemised selling expenses",
  disposalTax: "Manual disposal-tax estimate",
  saleProceeds: "Final sale proceeds after entered disposal tax",
  beforeTaxSaleProceeds: "Final sale proceeds BEFORE disposal tax",
  profit: "Net investor profit",
  cashFunded: "Total cash funded",
  cashReturned: "Cash returned / distributed",
  equityRoi: "Funded equity ROI (%)",
  annualizedIrr: "Annualized monthly-cash-flow IRR (%)",
};
export function InvestmentStrategies({
  propertyId,
  onReview,
}: {
  propertyId: string;
  onReview: (section: "property" | "financials", field?: string) => void;
}) {
  const { user } = useAuth();
  return user ? (
    <StrategySession
      key={`${user.id}:${propertyId}`}
      propertyId={propertyId}
      owner={user.id}
      onReview={onReview}
    />
  ) : null;
}
function StrategySession({
  propertyId,
  owner,
  onReview,
}: {
  propertyId: string;
  owner: string;
  onReview: (section: "property" | "financials", field?: string) => void;
}) {
  const client = useQueryClient();
  const property = useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => getProperty(propertyId),
  });
  const snapshot = useQuery({
    queryKey: ["strategy-snapshot", owner, propertyId, property.data?.revision],
    queryFn: () => getPropertySnapshot(propertyId, owner),
    enabled: property.data?.user_id === owner,
  });
  const availability = useFinancialAvailability(
    propertyId,
    [property, snapshot],
    property.data?.user_id,
  );
  const shared = useFinancialConfirmation(owner, propertyId).propertyEvidence;
  const [baseline, setBaseline] = useState<PropertySnapshot | null>(null);
  const [draft, setDraft] = useState<StrategyAssumptions | null>(null);
  const [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(false),
    [status, setStatus] = useState("");
  const [reviewed, setReviewed] = useState<PropertySnapshot | null>(null);
  const editorRoot = useRef<HTMLDivElement>(null);
  const [sourceTarget, setSourceTarget] = useState<StrategyId | null>(null);
  const [editorSelection, setEditorSelection] = useState<StrategyId>("keep");
  const [validation, setValidation] = useState<string[]>([]);
  const [showTargets, setShowTargets] = useState(false);
  const [lifetime] = useState(() => ({ generation: 0 }));
  const pending = useRef(false);
  const blocked = ["pending", "acknowledged", "uncertain"].includes(shared?.outcome ?? "");
  useDiscloseSavedDraft("strategies", !!draft, false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== owner) {
        lifetime.generation++;
        setBaseline(null);
        setDraft(null);
        setReviewed(null);
      }
    });
    return () => {
      lifetime.generation++;
      data.subscription.unsubscribe();
    };
  }, [owner, lifetime]);
  async function open(discardDraft = false) {
    if (pending.current || blocked) return;
    if (draft && !discardDraft) {
      document.getElementById("strategy-editor")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    pending.current = true;
    setBusy(true);
    const generation = lifetime.generation;
    try {
      const s = await getPropertySnapshot(propertyId, owner);
      const a =
        parseStrategyAssumptions(s.property.investment_strategy_assumptions) ??
        emptyStrategyAssumptions();
      if (generation !== lifetime.generation) return;
      setBaseline(s);
      setDraft(a);
      setEditorSelection(a.preferredStrategy ?? "keep");
      setValidation([]);
      setLocked(false);
      setReviewed(null);
      setStatus(
        "Unsaved strategy draft. The cards continue to use saved assumptions. Leaving this page discards the draft.",
      );
    } catch {
      if (generation === lifetime.generation)
        setStatus(
          "Saved strategy assumptions could not be opened. Review saved data; malformed plans cannot be silently replaced.",
        );
    } finally {
      pending.current = false;
      if (generation === lifetime.generation) setBusy(false);
    }
  }
  async function save() {
    if (!baseline || !draft || pending.current || locked || blocked) return;
    const checked = validateStrategyEditor(draft);
    setValidation(checked.issues.map((issue) => issue.message));
    if (!checked.data) {
      const path = checked.issues[0]?.path ?? "";
      const invalidStrategy = path.split(".")[0];
      if (STRATEGIES.includes(invalidStrategy as StrategyId))
        setEditorSelection(invalidStrategy as StrategyId);
      let target: HTMLElement | null = null;
      const parts = path.split(".");
      while (!target && parts.length) {
        target =
          editorRoot.current?.querySelector<HTMLElement>(`[data-field="${parts.join(".")}"]`) ??
          null;
        parts.pop();
      }
      target ??=
        editorRoot.current?.querySelector<HTMLElement>(
          `[data-strategy="${path.split(".")[0]}"] input`,
        ) ?? null;
      if (target) {
        target.setAttribute("aria-invalid", "true");
        target.setAttribute("aria-describedby", "strategy-validation");
        target.addEventListener(
          "input",
          () => {
            target?.removeAttribute("aria-invalid");
            target?.removeAttribute("aria-describedby");
          },
          { once: true },
        );
        revealAndFocus(target);
      }
      setStatus(
        "Some assumptions need correction. Review the highlighted field and errors in the editor.",
      );
      return;
    }
    const valid = checked.data;
    pending.current = true;
    setBusy(true);
    setStatus("Saving strategy assumptions…");
    const generation = lifetime.generation,
      current = () => generation === lifetime.generation;
    let acknowledged = false;
    try {
      const row = await trackFinancialWrite(client, owner, propertyId, "propertyEvidence", () =>
        saveStrategyAssumptions(baseline, valid, owner, current),
      );
      acknowledged = true;
      if (!current()) return;
      const key = propertyKeys.detail(propertyId);
      await client.cancelQueries({ queryKey: key, exact: true });
      const fresh = await client.fetchQuery({
        queryKey: key,
        queryFn: () => getProperty(propertyId),
        staleTime: 0,
        retry: false,
      });
      if (!current()) return;
      if (
        !fresh ||
        fresh.revision !== row["revision"] ||
        !evidenceEqual(fresh.investment_strategy_assumptions, valid)
      )
        throw Error();
      await client.invalidateQueries({ queryKey: ["strategy-snapshot", owner, propertyId] });
      if (!current()) return;
      setBaseline(null);
      setDraft(null);
      setStatus("Strategy assumptions saved and reloaded.");
    } catch (e) {
      if (!current()) return;
      const outcome = e instanceof RevisionWriteError ? e.outcome : "uncertain";
      setLocked(acknowledged || outcome === "uncertain" || outcome === "conflict");
      setStatus(
        acknowledged
          ? "Save acknowledged, but fresh confirmation is unavailable or differs. Draft retained; review saved assumptions."
          : outcome === "conflict"
            ? "This property changed or is unavailable. Draft retained. Discard and reload before another save."
            : outcome === "uncertain"
              ? "Save outcome unknown. Draft retained; do not retry. Review saved assumptions; matching data cannot prove this attempt committed."
              : "Save was not sent or was rejected. Draft retained; review your inputs.",
      );
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  }
  useEffect(() => {
    if (!draft || !sourceTarget) return;
    setEditorSelection(sourceTarget);
    const target =
      editorRoot.current?.querySelector<HTMLElement>(
        `[data-field="${sourceTarget}.evidence.resalePrice.sourceLabel"]`,
      ) ??
      editorRoot.current?.querySelector<HTMLElement>(
        `[data-field="${sourceTarget}.evidence.horizon.sourceLabel"]`,
      ) ??
      null;
    revealAndFocus(target);
    setSourceTarget(null);
  }, [draft, sourceTarget]);
  const s = snapshot.data;
  let saved: StrategyAssumptions | null = null,
    malformed = false;
  try {
    saved = parseStrategyAssumptions(s?.property.investment_strategy_assumptions);
  } catch {
    malformed = true;
  }
  const current =
    availability.current && !locked && s?.property.revision === property.data?.revision;
  const facts: StrategyFacts | null = s
    ? {
        revision: s.property.revision!,
        acquisition: s.acquisition_costs,
        operating: s.operating_expenses,
        financing: s.financing,
        monthlyRent: s.property.expected_monthly_rent,
      }
    : null;
  const results =
    saved && facts && current
      ? [
          evaluateKeep({ facts, common: saved.common, assumptions: saved.keep }),
          evaluateFlip({ facts, common: saved.common, assumptions: saved.flip }),
          evaluateHybrid({ facts, common: saved.common, assumptions: saved.hybrid }),
        ]
      : [];
  return (
    <div className="min-w-0 space-y-5 break-words">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Independent investment strategies</h2>
        <p className="text-sm text-muted-foreground">
          Compare different holding periods, funding needs and outcomes. Preference highlights a
          card; it does not select a winner. Keep retains the property and excludes terminal value,
          so rental-only returns differ from sale returns.
        </p>
        <p className="text-sm">
          Sale prices, exit costs and tax estimates are planning assumptions, not guaranteed or
          professionally assessed values. Rental results are before personal income tax. Sale
          results use only your entered disposal-tax estimate.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || blocked} onClick={() => void open()}>
          Complete assumptions
        </Button>
        <Button variant="outline" onClick={() => onReview("financials")}>
          Review financial inputs
        </Button>
        <Button variant="outline" onClick={() => onReview("property", "expected_monthly_rent")}>
          Review rental sources
        </Button>
        <Button
          variant="outline"
          disabled={busy || blocked}
          onClick={() => {
            setShowTargets(true);
            void open();
          }}
        >
          Edit targets
        </Button>
      </div>
      <p role="status" className="text-sm whitespace-pre-wrap break-words">
        {status}
      </p>
      {!current ? (
        <p role="status">
          Current strategy assessment unavailable.{" "}
          {availability.reason ?? "Refreshing coherent saved property revision."}
        </p>
      ) : malformed ? (
        <p role="alert">
          Strategy data is invalid or unsupported. Current strategy calculations are unavailable.
        </p>
      ) : !saved ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {STRATEGIES.map((id) => (
            <Card key={id}>
              <CardHeader>
                <CardTitle>{names[id]}</CardTitle>
              </CardHeader>
              <CardContent>
                Inputs required — complete and save this strategy’s assumptions.
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      {current && saved && s ? (
        <>
          <p className="text-xs text-muted-foreground">
            Saved property revision {s.property.revision} · Model {saved.modelVersion} ·{" "}
            {saved.common.financingMode} financing · Flat assumptions · Final-settled proceeds, not
            completion-day liquidity.{draft ? " Unsaved edits are excluded from these cards." : ""}
          </p>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {results.map((result) => {
              const suitability = assessStrategy(result, saved, s);
              const important =
                result.strategy === "keep"
                  ? [
                      "initialCash",
                      "annualCashFlow",
                      "cashOnCashReturn",
                      "cumulativeCashFlow",
                      "cashFunded",
                      "endingDebt",
                    ]
                  : ["initialCash", "profit", "cashFunded", "equityRoi", "annualizedIrr"];
              return (
                <Card
                  key={result.strategy}
                  className={
                    saved.preferredStrategy === result.strategy
                      ? "border-primary ring-1 ring-primary"
                      : ""
                  }
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{names[result.strategy]}</CardTitle>
                    <p className="text-sm">
                      {result.horizonMonths ?? "Unknown"} months
                      {saved.preferredStrategy === result.strategy ? " · Your preference" : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="font-medium">{suitability.label}</p>
                    <p className="text-xs">
                      Hypothetical financial projection · Evidence:{" "}
                      {suitability.evidenceReasons.length ? "incomplete" : "ready for review"}
                    </p>
                    {result.beforeDisposalTax ? (
                      <p className="text-sm font-medium">
                        BEFORE disposal tax only. After-tax suitability withheld.
                      </p>
                    ) : null}
                    <dl className="space-y-3">
                      {important.map((k) => (
                        <Metric key={k} name={k} metric={result.metrics[k]} />
                      ))}
                    </dl>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {suitability.reasons.slice(0, 4).map((r, idx) => (
                        <li key={idx}>{financialInputLabel(r)}</li>
                      ))}
                    </ul>
                    {suitability.reasons.length > 4 ? (
                      <details>
                        <summary className="cursor-pointer text-xs">
                          All input and evidence reasons ({suitability.reasons.length})
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {suitability.reasons.map((r, idx) => (
                            <li key={idx}>{financialInputLabel(r)}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    <Button
                      variant="outline"
                      className="max-w-full whitespace-normal"
                      disabled={busy || blocked}
                      onClick={() => {
                        setSourceTarget(result.strategy);
                        setEditorSelection(result.strategy);
                        void open();
                      }}
                    >
                      Review sources for {names[result.strategy]}
                    </Button>
                    <details>
                      <summary className="cursor-pointer text-sm">
                        Saved supporting strategy sources
                      </summary>
                      <div className="mt-2 space-y-3 text-xs">
                        {Object.entries(saved[result.strategy].evidence).map(([key, entry]) =>
                          entry ? (
                            <div key={key}>
                              <p className="font-medium">
                                {sourceNames[key] ?? key}: {entry.sourceLabel ?? "Source not named"}
                              </p>
                              <p>
                                Reviewed value: {entry.valueAtReview} ·{" "}
                                {entry.observedOn ?? "Date missing"}
                              </p>
                              <p>{entry.notes}</p>
                              {entry.sourceUrl ? (
                                <a
                                  className="underline"
                                  href={entry.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Open supporting source
                                </a>
                              ) : null}
                            </div>
                          ) : null,
                        )}
                        {!Object.keys(saved[result.strategy].evidence).length ? (
                          <p>No strategy sources recorded. Record them in Complete assumptions.</p>
                        ) : null}
                      </div>
                    </details>
                    <details>
                      <summary className="cursor-pointer text-sm">
                        Detailed calculation breakdown and cash flows
                      </summary>
                      <dl className="mt-3 space-y-3">
                        {Object.entries(result.metrics)
                          .filter(([key]) => labels[key])
                          .map(([key, m]) => (
                            <Metric key={key} name={key} metric={m} />
                          ))}
                      </dl>
                      {result.cashFlows ? (
                        <div className="mt-3 max-h-64 overflow-auto">
                          <table className="w-full text-xs">
                            <caption>
                              {result.strategy === "keep"
                                ? "Monthly holding cash; excludes upfront funding and sale"
                                : "Investor flows: month 0 funding; final month includes net sale"}
                            </caption>
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>MYR cash flow</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.cashFlows.map((cf, m) => (
                                <tr key={m}>
                                  <td>{result.strategy === "keep" ? m + 1 : m}</td>
                                  <td className="text-right">{format(cf)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                      <p className="mt-3 text-xs">
                        Acquisition includes renovation and contingency once. Full loan payments
                        include interest and principal; only remaining principal is settled on sale.
                        Positive cash is distributed; future deficits require new funding. Deposits
                        require an identified acquisition refund. No tax retention is deducted
                        twice. Vacant months still incur expenses; payments stop at payoff. Keep has
                        no assumed sale or total investment ROI.
                      </p>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
      {draft ? (
        <Card id="strategy-editor" ref={editorRoot}>
          <CardHeader>
            <CardTitle>Strategy assumptions draft</CardTitle>
            <p className="text-sm">
              Blank means unknown. Amounts are MYR. Shared acquisition, renovation, financing and
              annual expenses are edited in Financials. This is a prospective purchase at time zero.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {validation.length ? (
              <div
                id="strategy-validation"
                role="alert"
                className="space-y-1 text-sm text-destructive"
              >
                <p>Correct these fields before saving:</p>
                <ul className="list-disc pl-4">
                  {validation.map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-sm">
              For a complete projection, enter the holding period and relevant rent or resale
              inputs. Blank means unknown; enter zero only when it is an explicit assumption.
              Missing inputs may be saved, but dependent results stay unavailable.
            </p>
            <fieldset disabled={busy || locked || blocked} className="space-y-5">
              <label className="block text-sm">
                Preferred strategy
                <select
                  className="mt-1 block w-full rounded border bg-background p-2"
                  value={draft.preferredStrategy ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      preferredStrategy: (e.target.value as StrategyId) || null,
                    })
                  }
                >
                  <option value="">No preference</option>
                  {STRATEGIES.map((id) => (
                    <option key={id} value={id}>
                      {names[id]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Financing model
                <select
                  className="mt-1 block w-full rounded border bg-background p-2"
                  value={draft.common.financingMode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      common: {
                        ...draft.common,
                        financingMode: e.target
                          .value as StrategyAssumptions["common"]["financingMode"],
                      },
                    })
                  }
                >
                  <option value="unknown">Choose explicitly</option>
                  <option value="cash">Cash purchase</option>
                  <option value="conventional">Conventional monthly amortising loan</option>
                  <option value="unsupported">Other / unsupported schedule</option>
                </select>
              </label>
              {(
                [
                  [
                    "fixedAmortisingConfirmed",
                    "For a loan: fixed rate, monthly amortisation, original purchase principal, no refinancing",
                  ],
                  [
                    "quotedPaymentConfirmed",
                    "Any quoted instalment is consistent with this amortising model",
                  ],
                  [
                    "initialCostsOutsideHorizon",
                    "All acquisition budgets are funded upfront; initial holding costs exclude projected months 1 to H",
                  ],
                  [
                    "flatAssumptionsConfirmed",
                    "Accept flat rent and expenses, spread annual costs monthly and uniform expected occupancy",
                  ],
                ] as const
              ).map(([k, label]) => (
                <Tick
                  key={k}
                  label={label}
                  checked={draft.common[k]}
                  onChange={(v) => setDraft({ ...draft, common: { ...draft.common, [k]: v } })}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft({
                    ...draft,
                    keep: { ...draft.keep, horizonMonths: 60, occupiedMonths: 11 },
                    flip: { ...draft.flip, horizonMonths: 12 },
                    hybrid: { ...draft.hybrid, horizonMonths: 60, occupiedMonths: 11 },
                  })
                }
              >
                Accept suggested horizons (60 / 12 / 60) and occupancy (11 months)
              </Button>
              <div className="flex flex-wrap gap-2" aria-label="Choose strategy to edit">
                {STRATEGIES.map((id) => (
                  <Button
                    key={id}
                    type="button"
                    variant={editorSelection === id ? "default" : "outline"}
                    className="h-auto whitespace-normal"
                    onClick={() => setEditorSelection(id)}
                  >
                    {names[id]}
                  </Button>
                ))}
              </div>
              {STRATEGIES.map((id) => (
                <StrategyEditor
                  key={id}
                  id={id}
                  draft={draft}
                  onChange={setDraft}
                  showTargets={showTargets}
                  selected={editorSelection === id}
                />
              ))}
              <Tick
                label="I have reviewed and accept these planning assumptions and their timing"
                checked={!!draft.common.acceptedOn}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    common: { ...draft.common, acceptedOn: v ? klToday() : null },
                  })
                }
              />
              <Button type="button" onClick={() => void save()}>
                Save strategy assumptions
              </Button>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setDraft(null);
                  setBaseline(null);
                  setLocked(false);
                }}
              >
                Discard strategy draft
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  const generation = lifetime.generation;
                  try {
                    const r = await getPropertySnapshot(propertyId, owner);
                    if (generation === lifetime.generation) {
                      setReviewed(r);
                      setStatus(
                        "Saved assumptions loaded for review. Original draft retained. This read does not confirm an uncertain save.",
                      );
                    }
                  } catch {
                    if (generation === lifetime.generation)
                      setStatus("Saved assumptions unavailable. Draft retained.");
                  }
                }}
              >
                Review saved assumptions
              </Button>
              {locked && !blocked ? (
                <Button variant="outline" disabled={busy} onClick={() => void open(true)}>
                  Discard and reload assumptions
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
      {reviewed ? (
        <details open>
          <summary>Saved assumptions for review — revision {reviewed.property.revision}</summary>
          <SavedPlanReview raw={reviewed.property.investment_strategy_assumptions} />
        </details>
      ) : null}
    </div>
  );
}
const format = (n: number) =>
  new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
function Metric({ name, metric }: { name: string; metric: StrategyMetric | undefined }) {
  return (
    <div className="border-b pb-2">
      <dt className="text-xs text-muted-foreground">{labels[name] ?? name}</dt>
      <dd className="break-words text-sm font-medium">
        {metric?.status === "ok"
          ? `${name.toLowerCase().includes("yield") || name.includes("Return") || name === "equityRoi" || name === "annualizedIrr" ? "" : "RM "}${format(metric.value)}${name.toLowerCase().includes("yield") || name.includes("Return") || name === "equityRoi" || name === "annualizedIrr" ? "%" : ""}`
          : `Unavailable: ${metric && "reason" in metric ? metric.reason : metric && "missingInputs" in metric ? metric.missingInputs.join(", ") : "inputs required"}`}
      </dd>
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  path,
}: {
  path?: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <Input
        data-field={path}
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}
function Tick({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        className="mt-1"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
function StrategyEditor({
  id,
  draft,
  onChange,
  showTargets = false,
  selected = true,
}: {
  id: StrategyId;
  draft: StrategyAssumptions;
  onChange: (v: StrategyAssumptions) => void;
  showTargets?: boolean;
  selected?: boolean;
}) {
  const [expanded, setExpanded] = useState(selected);
  useEffect(() => setExpanded(selected), [selected]);
  const p = draft[id];
  const update = (patch: object) => onChange({ ...draft, [id]: { ...p, ...patch } });
  const sale = id === "keep" ? null : draft[id];
  const sourceValues: Record<string, number | null> = { horizon: p.horizonMonths };
  if (id !== "flip") sourceValues["occupancy"] = draft[id].occupiedMonths;
  if (id === "hybrid") sourceValues["leadIn"] = draft.hybrid.nonRentalMonths;
  if (sale)
    Object.assign(sourceValues, {
      resalePrice: sale.resalePrice,
      ...sale.exitCosts,
      disposalTax: sale.disposalTax.amount,
      depositRefund: sale.depositRefund,
    });
  return (
    <details
      data-strategy={id}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="min-w-0 rounded border p-4"
    >
      <summary className="cursor-pointer font-semibold">
        {names[id]} assumptions, sources and targets
      </summary>
      <div className="mt-4 space-y-4">
        <NumberField
          path={`${id}.horizonMonths`}
          label="Holding period (whole months, 1–120)"
          value={p.horizonMonths}
          onChange={(v) => update({ horizonMonths: v })}
        />
        {id !== "flip" ? (
          <NumberField
            path={`${id}.occupiedMonths`}
            label="Occupied months per year (0–12)"
            value={draft[id].occupiedMonths}
            onChange={(v) => update({ occupiedMonths: v })}
          />
        ) : null}
        {id === "hybrid" ? (
          <>
            <NumberField
              path={`${id}.nonRentalMonths`}
              label="Non-rental lead-in months (enter explicitly, including zero)"
              value={draft.hybrid.nonRentalMonths}
              onChange={(v) => update({ nonRentalMonths: v })}
            />
            <Tick
              label="Rent continues through the sale month after the lead-in"
              checked={draft.hybrid.rentThroughSaleConfirmed}
              onChange={(v) => update({ rentThroughSaleConfirmed: v })}
            />
          </>
        ) : null}
        {sale ? (
          <>
            <NumberField
              path={`${id}.resalePrice`}
              label="Expected resale price for this horizon"
              value={sale.resalePrice}
              onChange={(v) => update({ resalePrice: v })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {EXIT_FIELDS.map((k) => (
                <NumberField
                  key={k}
                  path={`${id}.exitCosts.${k}`}
                  label={EXIT_LABELS[k]}
                  value={sale.exitCosts[k]}
                  onChange={(v) => update({ exitCosts: { ...sale.exitCosts, [k]: v } })}
                />
              ))}
            </div>
            <label className="block text-sm">
              Disposal-tax status
              <select
                className="mt-1 block w-full rounded border bg-background p-2"
                value={sale.disposalTax.status}
                onChange={(e) =>
                  update({
                    disposalTax: {
                      ...sale.disposalTax,
                      status: e.target.value,
                      amount: e.target.value === "unknown" ? null : sale.disposalTax.amount,
                    },
                  })
                }
              >
                <option value="unknown">Unknown — before-disposal-tax projection only</option>
                <option value="user_estimate">User estimate</option>
                <option value="adviser_estimate">Adviser estimate</option>
              </select>
            </label>
            {sale.disposalTax.status !== "unknown" ? (
              <NumberField
                path={`${id}.disposalTax.amount`}
                label="Disposal-tax estimate (enter zero explicitly where justified)"
                value={sale.disposalTax.amount}
                onChange={(v) => update({ disposalTax: { ...sale.disposalTax, amount: v } })}
              />
            ) : null}
            <label className="block space-y-1 text-sm">
              <span>Disposal-tax basis (no automatic RPGT or income-tax classification)</span>
              <Input
                data-field={`${id}.disposalTax.basis`}
                value={sale.disposalTax.basis}
                maxLength={2000}
                onChange={(e) =>
                  update({ disposalTax: { ...sale.disposalTax, basis: e.target.value } })
                }
              />
            </label>
            <NumberField
              path={`${id}.depositRefund`}
              label="Identified acquisition-deposit refund at exit (zero if none)"
              value={sale.depositRefund}
              onChange={(v) => update({ depositRefund: v })}
            />
            <label className="block space-y-1 text-sm">
              <span>Refund basis (exclude tenant deposits)</span>
              <Input
                value={sale.refundableDepositBasis}
                maxLength={2000}
                onChange={(e) => update({ refundableDepositBasis: e.target.value })}
              />
            </label>
            <Tick
              label="I acknowledge every entered zero exit cost, tax or deposit refund as no charge / no refund"
              checked={sale.zerosAcknowledged}
              onChange={(v) => update({ zerosAcknowledged: v })}
            />
            <Tick
              label="Final sale proceeds and final disposal-tax settlement occur at the selected horizon (required for IRR)"
              checked={sale.settlementAtHorizonConfirmed}
              onChange={(v) => update({ settlementAtHorizonConfirmed: v })}
            />
          </>
        ) : null}
        <Tick
          label={
            id === "keep"
              ? "I reviewed material letting restrictions and rental execution risks"
              : id === "flip"
                ? "I reviewed resale restrictions, works schedule and sale execution risks"
                : "I reviewed letting and resale restrictions, lead-in and sale execution risks"
          }
          checked={p.restrictionsAcknowledged}
          onChange={(v) => update({ restrictionsAcknowledged: v })}
        />
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Supporting strategy sources
          </summary>
          <p className="my-2 text-xs text-muted-foreground">
            Record observed comparables, unit/condition differences and timing basis. A resale
            forecast stays an assumption even when supported by observed prices. Source records bind
            to the displayed amount; changing an amount requires source review.
          </p>
          {Object.entries(sourceValues).map(([key, value]) => (
            <SourceEditor
              key={key}
              prefix={`${id}.evidence.${key}`}
              name={key}
              value={value}
              entry={p.evidence[key]}
              onChange={(e) => update({ evidence: { ...p.evidence, [key]: e } })}
            />
          ))}
        </details>
        <details open={showTargets}>
          <summary className="cursor-pointer text-sm font-medium">
            Investor targets — blank means not set
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(id === "keep"
              ? ([
                  ["minimumMonthlyCashFlow", "Minimum monthly cash flow (MYR)"],
                  ["minimumCashOnCash", "Minimum annual cash-on-cash (%)"],
                  ["maximumCashFunded", "Maximum total cash funded (MYR)"],
                ] as const)
              : ([
                  ["minimumProfit", "Minimum net profit (MYR)"],
                  ["minimumEquityRoi", "Minimum funded equity ROI (%)"],
                  ["maximumCashFunded", "Maximum total cash funded (MYR)"],
                ] as const)
            ).map(([k, label]) => (
              <NumberField
                key={k}
                path={`${id}.targets.${k}`}
                label={label}
                value={p.targets[k]}
                onChange={(v) => update({ targets: { ...p.targets, [k]: v } })}
              />
            ))}
          </div>
        </details>
      </div>
    </details>
  );
}
function SourceEditor({
  prefix,
  name,
  value,
  entry,
  onChange,
}: {
  prefix: string;
  name: string;
  value: number | null;
  entry: EvidenceEntry | undefined;
  onChange: (e: EvidenceEntry) => void;
}) {
  const e = entry ?? {
    origin: "user_assumption",
    valueAtReview: value,
    sourceLabel: null,
    sourceUrl: null,
    notes: null,
    observedOn: null,
    verifiedOn: null,
    estimate: null,
  };
  const update = (patch: Partial<EvidenceEntry>) =>
    onChange({ ...e, ...patch, valueAtReview: value });
  return (
    <fieldset disabled={value === null} className="my-3 space-y-2 rounded border p-3">
      <legend className="px-1 text-sm">
        {sourceNames[name] ?? name} · bound amount {value ?? "missing"}
      </legend>
      <label className="block text-xs">
        Source type
        <select
          className="block w-full rounded border bg-background p-2"
          value={e.origin}
          onChange={(ev) => update({ origin: ev.target.value as EvidenceEntry["origin"] })}
        >
          <option value="user_assumption">User planning assumption</option>
          <option value="external_observation">External observation / quotation</option>
          <option value="verified_actual">Actual checked by you</option>
        </select>
      </label>
      {(
        [
          ["sourceLabel", "Named source or planning basis"],
          ["sourceUrl", "Source URL (optional HTTP/HTTPS)"],
          ["notes", "Basis, limitations and comparable differences"],
        ] as const
      ).map(([k, label]) => (
        <label className="block text-xs" key={k}>
          {label}
          <Input
            data-field={`${prefix}.${k}`}
            value={e[k] ?? ""}
            maxLength={k === "sourceLabel" ? 120 : k === "sourceUrl" ? 2048 : 2000}
            onChange={(ev) => update({ [k]: ev.target.value || null })}
          />
        </label>
      ))}
      <label className="block text-xs">
        Observation / review date
        <Input
          type="date"
          max={klToday()}
          data-field={`${prefix}.observedOn`}
          value={e.observedOn ?? ""}
          onChange={(ev) => update({ observedOn: ev.target.value || null })}
        />
      </label>
      {e.origin === "verified_actual" ? (
        <label className="block text-xs">
          Date checked by you
          <Input
            type="date"
            max={klToday()}
            data-field={`${prefix}.verifiedOn`}
            value={e.verifiedOn ?? ""}
            onChange={(ev) => update({ verifiedOn: ev.target.value || null })}
          />
        </label>
      ) : null}
      {e.sourceUrl && /^https?:\/\//.test(e.sourceUrl) ? (
        <a
          href={e.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
        >
          Open supporting source
        </a>
      ) : null}
    </fieldset>
  );
}

function SavedPlanReview({ raw }: { raw: unknown }) {
  let plan;
  try {
    plan = parseStrategyAssumptions(raw);
  } catch {
    return <p>Saved strategy assumptions are invalid or unsupported.</p>;
  }
  if (!plan) return <p>No strategy assumptions saved.</p>;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm">
        Saved financing model: {plan.common.financingMode}. Accepted:{" "}
        {plan.common.acceptedOn ?? "Not accepted"}. Preference:{" "}
        {plan.preferredStrategy ? names[plan.preferredStrategy] : "None"}.
      </p>
      <p className="text-xs">Read-only saved values. The original draft above is retained.</p>
      <fieldset disabled className="space-y-3">
        {STRATEGIES.map((id) => (
          <StrategyEditor key={id} id={id} draft={plan} onChange={() => {}} showTargets />
        ))}
      </fieldset>
    </div>
  );
}
