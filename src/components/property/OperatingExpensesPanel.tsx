import { EvidenceFields } from "./EvidenceFields";
import { SourcesAndAssumptions } from "./SourcesAndAssumptions";
import { evidenceDraftValues } from "@/lib/property/evidence-draft-values";
import { useFinancialBaseline } from "@/hooks/use-financial-baseline";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";
// Operating-expense entry only; annual conversion and totals use the frozen shared engine.
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFinancialConfirmation } from "@/hooks/use-financial-confirmation";
import { useDiscloseSavedDraft } from "@/hooks/use-saved-draft-disclosure";
import { trackFinancialWrite, writeBlocksCurrent } from "@/lib/property/financial-confirmation";
import { supabase } from "@/integrations/supabase/external-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateTotalAnnualOperatingExpenses,
  OPERATING_EXPENSE_FIELDS,
  monthlyToAnnual,
  type OperatingExpenseField,
} from "@/lib/finance/operating-expenses";
import {
  getOperatingExpenses,
  operatingExpenseKeys,
  saveOperatingExpenses,
} from "@/lib/property/operating-expenses-api";
import {
  OPERATING_EXPENSE_LABELS,
  OPERATING_EXPENSE_SECTIONS,
  operatingExpenseRecordToForm,
  operatingExpensesSchema,
  annualiseInput,
  type EntryBasis,
} from "@/lib/property/operating-expense-fields";
import {
  OPERATING_EXPENSES_FAILURE_MESSAGES,
  OperatingExpensesSaveError,
  createOperatingExpensesEditor,
  type OperatingExpensesAttempt,
} from "@/lib/property/operating-expenses-editor";
import { displayMoney } from "@/lib/property/property-fields";

export function OperatingExpensesPanel({ propertyId }: { propertyId: string }) {
  const { user, loading } = useAuth();
  const deletion = usePropertyDeletion(user?.id ?? null, propertyId);
  if (deletionBlocksProperty(deletion.outcome)) return <p role="status">Property deletion requires review. Financial editing is unavailable.</p>;
  if (loading)
    return <p className="text-sm text-muted-foreground">Loading operating expenses...</p>;
  if (!user) return <p role="alert">Sign in to view operating expenses.</p>;
  return (
    <OperatingExpensesEditor
      key={JSON.stringify([user.id, propertyId])}
      propertyId={propertyId}
      identityId={user.id}
    />
  );
}

function OperatingExpensesEditor({
  propertyId,
  identityId,
}: {
  propertyId: string;
  identityId: string;
}) {
  const queryClient = useQueryClient();
  const shared = useFinancialConfirmation(identityId, propertyId).expenses;
  const saveBlocked = ["pending", "uncertain", "acknowledged"].includes(shared?.outcome ?? "");
  // Visibility only. The accepted editor retains ownership of drafts, bases and baselines.
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const save = useMutation({
    retry: false,
    mutationFn: async (attempt: OperatingExpensesAttempt) => {
      if (!attempt)
        throw new Error("Unable to load operating expenses. Open the editor before saving.");
      try {
        return await trackFinancialWrite(queryClient, identityId, propertyId, "expenses", () =>
          saveOperatingExpenses(propertyId, attempt.values, attempt.isCurrent, attempt.revision, attempt.evidence),
        );
      } catch (error) {
        if (error instanceof OperatingExpensesSaveError) throw error;
        throw new OperatingExpensesSaveError("uncertain");
      }
    },
  });
  const [editor] = useState(() =>
    createOperatingExpensesEditor(propertyId, {
      save: save.mutateAsync,
      acknowledge: async (row, isCurrent) => {
        await queryClient.cancelQueries({
          queryKey: operatingExpenseKeys.detail(propertyId),
          exact: true,
        });
        if (isCurrent()) queryClient.setQueryData(operatingExpenseKeys.detail(propertyId), row);
      },
      refresh: async (isCurrent) => {
        // A deliberate review must start a read after this action, rather than
        // reusing a background request that may predate the write.
        await queryClient.cancelQueries({
          queryKey: operatingExpenseKeys.detail(propertyId),
          exact: true,
        });
        if (!isCurrent()) throw new Error("Operating-expenses review is no longer active.");
        return queryClient.fetchQuery({
          queryKey: operatingExpenseKeys.detail(propertyId),
          queryFn: async () => {
            const row = await getOperatingExpenses(propertyId);
            if (!isCurrent()) throw new Error("Operating-expenses review is no longer active.");
            return row;
          },
          staleTime: 0,
          retry: false,
        });
      },
    }),
  );
  const baseline = useFinancialBaseline(propertyId, identityId, async (snapshot) => {
    editor.cancel();
    editor.open(snapshot.operating_expenses, snapshot.property.revision);
  });
  const draft = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const { editing, values, bases, errors } = draft;
  useDiscloseSavedDraft("expenses", editing, draft.outcome === "saved" || draft.outcome === "saved-refresh-failed");
  const busy = draft.outcome === "pending" || draft.reviewing || baseline.loading;
  useEffect(() => {
    const first = OPERATING_EXPENSE_FIELDS.find((field) => errors[field]);
    if (first && typeof document !== "undefined") document.getElementById(first)?.focus();
  }, [errors]);

  const {
    data: record,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: operatingExpenseKeys.detail(propertyId),
    queryFn: () => getOperatingExpenses(propertyId),
  });

  useEffect(() => {
    editor.activate();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== identityId) editor.dispose();
    });
    return () => {
      editor.dispose();
      data.subscription.unsubscribe();
    };
  }, [editor, identityId]);

  const stored = operatingExpenseRecordToForm(record);
  const storedNumbers = Object.fromEntries(
    Object.entries(stored).map(([k, v]) => [k, v === "" ? null : Number(v)]),
  ) as Record<OperatingExpenseField, number | null>;
  const result = calculateTotalAnnualOperatingExpenses(storedNumbers);

  function previewAnnual(field: OperatingExpenseField): string | null {
    if (bases[field] !== "monthly") return null;
    const parsed = operatingExpensesSchema.safeParse(values);
    if (!parsed.success || parsed.data[field] === null) return null;
    const annual = monthlyToAnnual(parsed.data[field]);
    return annual !== null && Number.isFinite(annual) ? displayMoney(annual) : null;
  }

  if (!draft.active)
    return <p role="alert">The session changed. Reopen this property to continue.</p>;
  if (error && !editing)
    return (
      <p role="alert" className="text-sm text-destructive">
        Unable to load operating expenses. Reload the page to try again.
      </p>
    );
  if (isLoading && !editing)
    return <p className="text-sm text-muted-foreground">Loading operating expenses...</p>;

  return (
    <div className="space-y-6">
      {editing ? <EvidenceFields section="operating_expenses" values={evidenceDraftValues("operating_expenses", values, bases)} metadata={draft.evidence} onChange={editor.changeEvidence} disabled={busy || saveBlocked || draft.outcome === "conflict" || draft.outcome === "uncertain" || draft.outcome === "saved" || draft.outcome === "saved-refresh-failed"} /> : <SourcesAndAssumptions propertyId={propertyId} section="operating_expenses" record={record} />}

      {baseline.loading ? <p role="status">Loading saved values for editing...</p> : null}
      {baseline.error ? <p role="alert">Saved values could not be loaded. Your draft is retained. Try loading again.</p> : null}
      {isFetching || writeBlocksCurrent(shared?.outcome) ? (
        <p role="status">Last-known saved operating values; current confirmation unavailable.</p>
      ) : null}
      <ExpensePresentation mode={mode} onChange={setMode} />
      {editing ? (
        <p className="text-sm text-muted-foreground">
          Your draft stays in this open editor. Leaving the page or refreshing the browser discards
          it.
        </p>
      ) : null}
      {error && editing ? (
        <p role="alert" className="text-sm text-destructive">
          Unable to refresh saved operating expenses. Your open draft is retained.
        </p>
      ) : null}
      {saveBlocked && draft.outcome !== "pending" && draft.outcome !== "uncertain" ? (
        <p role="status">
          This section has an unresolved save confirmation. Current assessments are unavailable;
          Review does not resolve an unknown write.
        </p>
      ) : null}
      {draft.outcome === "pending" ? (
        <p role="status">Saving operating expenses. Waiting for confirmation...</p>
      ) : null}
      {draft.outcome === "invalid" ? (
        <p role="alert">
          Please correct the highlighted amounts. The total must also fit the supported numeric
          range.
        </p>
      ) : null}
      {draft.outcome === "saved" ? (
        <p role="status">Operating expenses saved and confirmed. Other sections save separately.</p>
      ) : null}
      {draft.outcome === "saved-refresh-failed" ? (
        <p role="alert">
          Operating expenses saved and confirmed, but refreshing saved values failed. The confirmed
          values are retained in this editor.
        </p>
      ) : null}
      {draft.outcome === "not-sent" ||
      draft.outcome === "rejected" ||
      draft.outcome === "conflict" ||
      draft.outcome === "uncertain" ? (
        <p role="alert">{OPERATING_EXPENSES_FAILURE_MESSAGES[draft.outcome]}</p>
      ) : null}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {result.status === "partial"
                ? "Saved known annual expenses subtotal"
                : "Saved annual operating expenses"}
            </CardTitle>
            <CardDescription>
              Every amount is stored per year. Unknown expenses are left out of the total, never
              counted as zero — an entered 0 means a confirmed "no such expense".
            </CardDescription>
          </div>
          {!editing ? (
            <Button onClick={() => baseline.load()} disabled={isLoading || !!error || baseline.loading}>
              {record ? "Edit expenses" : "Enter expenses"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {error || isLoading ? (
            <p className="text-sm text-muted-foreground">Current saved total unavailable.</p>
          ) : (
            <>
              <p className="text-3xl font-semibold text-foreground">
                {result.total === null ? "Missing / Not Verified" : displayMoney(result.total)}
                {result.total === null ? null : (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">per year</span>
                )}
              </p>
              {result.status === "unknown" ? (
                <p className="text-sm text-muted-foreground">
                  No expense has been recorded yet, so no total can be produced.
                </p>
              ) : null}
              {result.status === "invalid" ? (
                <p className="text-sm text-destructive">
                  One or more stored amounts are not valid, so no total is shown.
                </p>
              ) : null}
              {result.status === "partial" ? (
                <p className="text-sm text-muted-foreground">
                  Known expenses only. {result.missingFields.length} line
                  {result.missingFields.length === 1 ? " is" : "s are"} still Missing / Not
                  Verified. This subtotal is not the final net operating cost. Missing costs
                  withhold complete operating-cost and dependent net-return analysis.
                </p>
              ) : null}
              {result.status === "complete" ? (
                <p className="text-sm text-muted-foreground">
                  Every expense line has a recorded value
                  {result.zeroFields.length > 0
                    ? `, including ${result.zeroFields.length} confirmed as zero.`
                    : "."}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {OPERATING_EXPENSE_SECTIONS.map((section, index) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
            {index > 0 && mode === "simple" ? (
              <ExpenseDisclosure
                title={section.title}
                contentId={`expenses-group-${index}`}
                expanded={
                  !!expanded[section.title] || section.fields.some((field) => !!errors[field])
                }
                hasErrors={section.fields.some((field) => !!errors[field])}
                onToggle={() =>
                  setExpanded((previous) => ({
                    ...previous,
                    [section.title]:
                      section.fields.some((field) => !!errors[field]) || !previous[section.title],
                  }))
                }
              />
            ) : null}
          </CardHeader>
          <CardContent
            id={`expenses-group-${index}`}
            onFocusCapture={() => {
              // Keep a revealed field mounted and visible as typing clears validation errors.
              if (index > 0 && mode === "simple" && !expanded[section.title])
                setExpanded((previous) => ({ ...previous, [section.title]: true }));
            }}
            style={
              index > 0 &&
              mode === "simple" &&
              !expanded[section.title] &&
              !section.fields.some((field) => !!errors[field])
                ? { display: "none" }
                : undefined
            }
            hidden={
              index > 0 &&
              mode === "simple" &&
              !expanded[section.title] &&
              !section.fields.some((field) => !!errors[field])
            }
            className={editing ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3 text-sm"}
          >
            {section.fields.map((field) =>
              editing ? (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{OPERATING_EXPENSE_LABELS[field]} (RM)</Label>
                  <Input
                    id={field}
                    inputMode="decimal"
                    placeholder="Leave blank if unknown"
                    value={String(values[field] ?? "")}
                    disabled={busy}
                    aria-invalid={!!errors[field]}
                    aria-describedby={errors[field] ? field + "-error" : undefined}
                    onChange={(e) => editor.change(field, e.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {(["annual", "monthly"] as EntryBasis[]).map((basis) => (
                      <button
                        key={basis}
                        type="button"
                        disabled={busy}
                        aria-pressed={bases[field] === basis}
                        aria-label={
                          OPERATING_EXPENSE_LABELS[field] +
                          (basis === "annual" ? " per year" : " per month")
                        }
                        onClick={() => editor.changeBasis(field, basis)}
                        className={
                          bases[field] === basis
                            ? "rounded-md bg-primary px-2 py-1 text-primary-foreground"
                            : "rounded-md border border-border px-2 py-1 text-muted-foreground"
                        }
                      >
                        {basis === "annual" ? "Per year" : "Per month"}
                      </button>
                    ))}
                    {previewAnnual(field) ? (
                      <span className="text-muted-foreground">
                        = {previewAnnual(field)} per year
                      </span>
                    ) : null}
                  </div>
                  {errors[field] ? (
                    <p id={field + "-error"} className="text-xs text-destructive">
                      {errors[field]}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div
                  key={field}
                  className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">{OPERATING_EXPENSE_LABELS[field]}</span>
                  {error || isLoading ? (
                    <span>Saved value unavailable</span>
                  ) : storedNumbers[field] === null ? (
                    <StatusBadge status="missing" />
                  ) : (
                    <span className="text-right font-medium text-foreground">
                      {displayMoney(storedNumbers[field])} / year
                    </span>
                  )}
                </div>
              ),
            )}
          </CardContent>
        </Card>
      ))}

      <ExpenseCompleteness
        values={editing ? values : stored}
        bases={editing ? bases : undefined}
        editing={editing}
        unavailable={!editing && (!!error || isLoading)}
        confirmed={draft.outcome === "saved" || draft.outcome === "saved-refresh-failed"}
      />

      {editing ? (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => editor.submit()}
            disabled={busy || saveBlocked || (draft.outcome === "uncertain" || draft.outcome === "conflict")}
          >
            {draft.outcome === "pending" ? "Saving…" : (draft.evidenceDirty ? "Save values and evidence" : "Save operating expenses")}
          </Button>
          <Button variant="outline" onClick={() => editor.cancel()} disabled={busy}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => editor.review()} disabled={busy}>
            {draft.reviewing ? "Reviewing saved values…" : "Review saved values"}
          </Button>
        </div>
      ) : null}
      {editing && draft.outcome === "uncertain" ? (
        <p className="text-sm text-muted-foreground">
          Saving is paused for this draft. Review the saved values, then Cancel deliberately if you
          choose to close it. Review never resubmits or replaces your draft.
        </p>
      ) : null}
      {editing && draft.outcome === "conflict" ? (
        <Button variant="outline" onClick={() => baseline.load()} disabled={busy || baseline.loading}>
          Discard draft and reload saved values
        </Button>
      ) : null}
      {editing && draft.review === "failed" ? (
        <p role="alert">Saved values could not be reviewed. Your draft is retained.</p>
      ) : null}
      {editing && draft.review === "available" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved values from the latest review</CardTitle>
            <CardDescription>
              This read shows current state only. Matching values do not prove which attempt
              committed; no row does not prove a write failed. Your draft has not been replaced by
              this review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {draft.reviewed ? (
              <dl className="space-y-2 text-sm">
                {OPERATING_EXPENSE_SECTIONS.flatMap((section) => section.fields).map((field) => (
                  <div key={field} className="flex justify-between gap-4">
                    <dt>{OPERATING_EXPENSE_LABELS[field]}</dt>
                    <dd>
                      {draft.reviewed?.[field] === null
                        ? "Missing / Not Verified"
                        : displayMoney(draft.reviewed?.[field]) + " / year"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>No saved operating-expense row was returned by this read.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ExpensePresentation({
  mode,
  onChange,
}: {
  mode: "simple" | "advanced";
  onChange: (mode: "simple" | "advanced") => void;
}) {
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Operating-expense entry mode" className="flex flex-wrap gap-2">
        {(["simple", "advanced"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            data-presentation
            variant={mode === option ? "default" : "outline"}
            aria-pressed={mode === option}
            onClick={() => onChange(option)}
          >
            {option === "simple" ? "Simple mode" : "Advanced mode"}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Start with building charges, taxes and insurance you know. Other recurring expenses can be
        expanded below, or use Advanced mode to see all fourteen lines together. These groups do not
        imply that a charge applies to your property. Leave unknown amounts blank; enter zero only
        when you confirm no expense. Each line has its own yearly or monthly basis. Switching views
        only changes what is visible; it never saves or converts your draft.
      </p>
    </div>
  );
}

function ExpenseDisclosure({
  title,
  contentId,
  expanded,
  hasErrors,
  onToggle,
}: {
  title: string;
  contentId: string;
  expanded: boolean;
  hasErrors: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        data-presentation
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
      >
        {expanded ? "Hide" : "Show"} {title}
      </Button>
      {hasErrors ? (
        <p className="text-sm text-destructive">
          This group stays open until its highlighted amounts are corrected.
        </p>
      ) : null}
    </div>
  );
}

function ExpenseCompleteness({
  values,
  bases,
  editing,
  unavailable,
  confirmed,
}: {
  values: Parameters<typeof operatingExpensesSchema.safeParse>[0];
  bases: Parameters<typeof annualiseInput>[1] | undefined;
  editing: boolean;
  unavailable: boolean;
  confirmed: boolean;
}) {
  // Parse and annualize through the same schema/helpers as Save; never sum in the UI.
  const entries = OPERATING_EXPENSE_FIELDS.map((field) => {
    const raw = (values as Record<string, unknown>)[field];
    const parsed = operatingExpensesSchema.safeParse({ [field]: raw });
    const annual = parsed.success
      ? (bases ? annualiseInput(parsed.data, bases) : parsed.data)[field]
      : Number.NaN;
    const checked = calculateTotalAnnualOperatingExpenses({ [field]: annual });
    return {
      field,
      annual,
      invalid: checked.status === "invalid",
      enteredZero: parsed.success && parsed.data[field] === 0,
    };
  });
  const result = calculateTotalAnnualOperatingExpenses(
    Object.fromEntries(entries.map(({ field, annual }) => [field, annual])),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">All fourteen expense lines: completeness review</CardTitle>
        <CardDescription>
          {editing
            ? confirmed
              ? "Confirmed draft amounts. "
              : "Unsaved draft amounts. "
            : "Saved annual amounts. "}
          Recorded amounts are user entered, not independently verified. Blank lines remain unknown.
          This checklist is separate from the read-only Review saved values action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-3 text-sm">
          {entries.map(({ field, annual, invalid, enteredZero }) => (
            <li
              key={field}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-border pb-2"
            >
              <span>{OPERATING_EXPENSE_LABELS[field]}</span>
              <span
                data-expense-state={
                  unavailable
                    ? "unavailable"
                    : invalid
                      ? "invalid"
                      : annual === null
                        ? "missing"
                        : enteredZero
                          ? "zero"
                          : "known"
                }
              >
                {unavailable
                  ? "Saved value unavailable"
                  : invalid
                    ? "Invalid / unresolved"
                    : annual === null
                      ? "Missing / Not Verified"
                      : enteredZero
                        ? "User-entered zero: RM 0 / year"
                        : `User-entered amount: ${displayMoney(annual)} / year${annual === 0 ? " (rounded from a non-zero entry)" : ""}`}
              </span>
            </li>
          ))}
        </ul>
        {!unavailable ? (
          <p className="text-sm text-muted-foreground">
            {result.status === "partial"
              ? `Known annual expenses subtotal: ${displayMoney(result.total)}. ${result.missingFields.length} unresolved lines; final net operating cost is unavailable.`
              : result.status === "complete"
                ? `All fourteen lines recorded. Annual operating expenses: ${displayMoney(result.total)}.`
                : result.status === "invalid"
                  ? "Invalid or unresolved amounts: no draft subtotal is available. Correct the amounts and supported numeric range."
                  : "All expenses are unknown. No subtotal or final operating cost is available."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
