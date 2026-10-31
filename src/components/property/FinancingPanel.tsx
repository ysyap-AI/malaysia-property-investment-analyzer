import { EvidenceFields } from "./EvidenceFields";
import { SourcesAndAssumptions } from "./SourcesAndAssumptions";
import { evidenceDraftValues } from "@/lib/property/evidence-draft-values";
import { useFinancialBaseline } from "@/hooks/use-financial-baseline";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";
// Display + entry surface for financing. Contains NO formula: every figure
// comes from src/lib/finance/financing.ts.
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { calculateFinancing } from "@/lib/finance/financing";
import { acquisitionKeys, getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { financingKeys, getFinancing, saveFinancing } from "@/lib/property/financing-api";
import {
  LOAN_TYPES,
  financingRecordToForm,
  financingSchema,
} from "@/lib/property/financing-fields";
import {
  createFinancingEditor,
  financingPriceContext,
  isFinancingRecord,
  FinancingSaveError,
  FINANCING_FAILURE_MESSAGES,
  type FinancingAttempt,
} from "@/lib/property/financing-editor";
import { displayMoney } from "@/lib/property/property-fields";

export function FinancingPanel({ propertyId }: { propertyId: string }) {
  const { user, loading } = useAuth();
  const deletion = usePropertyDeletion(user?.id ?? null, propertyId);
  if (deletionBlocksProperty(deletion.outcome)) return <p role="status">Property deletion requires review. Financial editing is unavailable.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Loading financing inputs...</p>;
  if (!user) return <p role="alert">Sign in to view financing.</p>;
  return (
    <FinancingEditor
      key={JSON.stringify([user.id, propertyId])}
      propertyId={propertyId}
      identityId={user.id}
    />
  );
}

function FinancingEditor({ propertyId, identityId }: { propertyId: string; identityId: string }) {
  const queryClient = useQueryClient();
  const confirmation = useFinancialConfirmation(identityId, propertyId);
  const shared = confirmation.financing;
  const saveBlocked = ["pending", "uncertain", "acknowledged"].includes(shared?.outcome ?? "");
  // Presentation only: neither mode calls into the draft/save lifecycle.
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const save = useMutation({
    retry: false,
    mutationFn: async (attempt: FinancingAttempt) => {
      if (!attempt)
        throw new Error("Unable to load financing inputs. Open the editor before saving.");
      try {
        return await trackFinancialWrite(queryClient, identityId, propertyId, "financing", () =>
          saveFinancing(propertyId, attempt.values, attempt.canDispatch, attempt.revision, attempt.evidence),
        );
      } catch (error) {
        if (error instanceof FinancingSaveError) throw error;
        throw new FinancingSaveError("uncertain");
      }
    },
  });
  const currentContext = () => {
    const query = queryClient.getQueryState<{ purchase_price: number | null } | null>(
      acquisitionKeys.detail(propertyId),
    );
    return financingPriceContext(
      query?.data?.purchase_price,
      query?.status === "success" && query.data !== undefined,
    );
  };
  const [editor] = useState(() =>
    createFinancingEditor(propertyId, {
      context: currentContext,
      save: save.mutateAsync,
      acknowledge: async (row, isCurrent) => {
        await queryClient.cancelQueries({
          queryKey: financingKeys.detail(propertyId),
          exact: true,
        });
        if (isCurrent()) queryClient.setQueryData(financingKeys.detail(propertyId), row);
      },
      refresh: async (isCurrent) => {
        await queryClient.cancelQueries({
          queryKey: financingKeys.detail(propertyId),
          exact: true,
        });
        if (!isCurrent()) throw new Error("Financing review is no longer active.");
        return queryClient.fetchQuery({
          queryKey: financingKeys.detail(propertyId),
          queryFn: async () => {
            const row = await getFinancing(propertyId);
            if (!isCurrent()) throw new Error("Financing review is no longer active.");
            return row;
          },
          staleTime: 0,
          retry: false,
        });
      },
    }),
  );
  const baseline = useFinancialBaseline(propertyId, identityId, (snapshot) => {
    void queryClient.cancelQueries({ queryKey: acquisitionKeys.detail(propertyId), exact: true });
    if (!editor.getSnapshot().active) return;
    queryClient.setQueryData(acquisitionKeys.detail(propertyId), snapshot.acquisition_costs);
    editor.cancel();
    editor.open(snapshot.financing, snapshot.property.revision);
  });
  const draft = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const { editing, values, errors } = draft;
  useDiscloseSavedDraft("financing", editing, draft.outcome === "saved" || draft.outcome === "saved-refresh-failed");
  const busy = draft.outcome === "pending" || draft.reviewing || baseline.loading;
  const {
    data: record,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: financingKeys.detail(propertyId),
    queryFn: () => getFinancing(propertyId),
  });
  const {
    data: acquisition,
    isLoading: acquisitionLoading,
    isFetching: acquisitionFetching,
    error: acquisitionError,
  } = useQuery({
    queryKey: acquisitionKeys.detail(propertyId),
    queryFn: () => getAcquisitionCosts(propertyId),
  });
  useEffect(() => {
    editor.activate();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== identityId) editor.dispose();
    });
    // Capture every availability/price transition, including changes between renders.
    const unsubscribe = queryClient.getQueryCache().subscribe(() => editor.observeContext());
    return () => {
      unsubscribe();
      editor.dispose();
      data.subscription.unsubscribe();
    };
  }, [editor, identityId, queryClient]);
  const context = currentContext();
  const contextChanged =
    draft.contextChanged ||
    (editing && (context.status !== draft.context.status || context.price !== draft.context.price));
  const purchasePrice = editing ? draft.context.price : context.price;
  const displayedValues = editing ? values : financingRecordToForm(record);
  const parsed = financingSchema.safeParse(displayedValues);
  const result = parsed.success
    ? calculateFinancing({ ...parsed.data, purchase_price: purchasePrice })
    : null;
  const set = editor.change;
  const advancedErrors = !!(
    errors.loan_type ||
    errors.user_provided_monthly_instalment ||
    errors.use_user_provided_instalment ||
    errors.bank_quote_verified ||
    errors.financing_notes
  );
  const showAdvanced = mode === "advanced" || advancedErrors;

  const money = (v: number | null | undefined) =>
    v === null || v === undefined ? (
      <StatusBadge status="missing" />
    ) : (
      <span>{displayMoney(v)}</span>
    );

  const inUse = result?.instalmentInUse;
  const numField = (k: keyof typeof values, label: string, hint?: string) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        inputMode="decimal"
        placeholder={hint ?? "Leave blank if unknown"}
        disabled={busy}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-error` : undefined}
        value={String(values[k])}
        onChange={(e) => set(k, e.target.value)}
      />
      {errors[k] ? (
        <p id={`${k}-error`} className="text-xs text-destructive">
          {errors[k]}
        </p>
      ) : null}
    </div>
  );

  if (!draft.active)
    return <p role="alert">The session changed. Reopen this property to continue.</p>;
  if ((error || acquisitionError) && !editing)
    return (
      <p role="alert" className="text-sm text-destructive">
        Unable to load financing inputs. Reload the page to try again.
      </p>
    );
  if ((isLoading || acquisitionLoading) && !editing)
    return <p className="text-sm text-muted-foreground">Loading financing inputs...</p>;

  return (
    <Card>
      {isFetching ||
      acquisitionFetching ||
      writeBlocksCurrent(shared?.outcome) ||
      writeBlocksCurrent(confirmation.acquisition?.outcome) ? (
        <p role="status" className="p-6">
          Last-known saved financing and purchase-price inputs; current confirmation unavailable. An
          open draft retains its adopted price.
        </p>
      ) : null}
      {editing ? <EvidenceFields section="financing" values={evidenceDraftValues("financing", values, undefined, draft.context.price)} metadata={draft.evidence} onChange={editor.changeEvidence} disabled={busy || saveBlocked || draft.outcome === "conflict" || draft.outcome === "uncertain" || draft.outcome === "saved" || draft.outcome === "saved-refresh-failed"} /> : <SourcesAndAssumptions propertyId={propertyId} section="financing" record={record} />}
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Financing</CardTitle>
          <CardDescription>
            Loan details and monthly instalment. The calculated instalment and any bank-quoted
            instalment are kept separately.
          </CardDescription>
        </div>
        {!editing ? (
          <Button
            onClick={() => baseline.load()}
            disabled={
              baseline.loading ||
              isLoading ||
              !!error ||
              acquisitionLoading ||
              !!acquisitionError ||
              (record != null && !isFinancingRecord(record, propertyId))
            }
          >
            {record ? "Edit financing" : "Enter financing"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {baseline.loading ? <p role="status">Loading saved values for editing...</p> : null}
        {baseline.error ? <p role="alert">Saved values could not be loaded. Your draft is retained. Try loading again.</p> : null}
        <FinancingPresentation mode={mode} onChange={setMode} />
        <p className="text-sm text-muted-foreground">
          {editing
            ? draft.outcome === "saved" || draft.outcome === "saved-refresh-failed"
              ? "Confirmed financing inputs; preview uses the adopted purchase price. "
              : "Unsaved draft preview. "
            : "Saved financing inputs. "}
          Blank financing is missing information, not a confirmed cash purchase. Cash-purchase
          analysis is not supported here. These figures do not indicate loan approval or
          eligibility.
        </p>
        {editing ? (
          <p className="text-sm text-muted-foreground">
            Your draft stays in this open editor. Leaving the page or refreshing the browser
            discards it. Preview uses the adopted purchase price; other sections save separately.
          </p>
        ) : null}
        {editing && (error || isLoading) ? (
          <p role="alert">Unable to refresh saved financing. Your open draft is retained.</p>
        ) : null}
        {editing && contextChanged ? (
          <div role="alert" className="space-y-2">
            <p>
              Purchase-price context changed. Your draft and its adopted price are retained. Save is
              paused until you review and adopt an available current price. A dispatched save still
              uses its submitted price.
            </p>
            <p>
              Current purchase price:{" "}
              {context.status === "available"
                ? displayMoney(context.price!)
                : "Unavailable / Missing / Not Verified"}
            </p>
            <Button
              variant="outline"
              disabled={busy || context.status !== "available"}
              onClick={() => editor.adoptPrice()}
            >
              Adopt current purchase price
            </Button>
          </div>
        ) : null}
        {saveBlocked && draft.outcome !== "pending" && draft.outcome !== "uncertain" ? (
          <p role="status">
            This section has an unresolved save confirmation. Current assessments are unavailable;
            Review does not resolve an unknown write.
          </p>
        ) : null}
        {draft.outcome === "pending" ? (
          <p role="status">Saving financing. Waiting for confirmation...</p>
        ) : null}
        {draft.outcome === "invalid" ? (
          <p role="alert">
            Please correct the highlighted fields. Financing amounts must fit the supported numeric
            range.
          </p>
        ) : null}
        {draft.outcome === "saved" ? (
          <p role="status">
            Financing saved and confirmed for the submitted purchase-price context. Other sections
            save separately.
          </p>
        ) : null}
        {draft.outcome === "saved-refresh-failed" ? (
          <p role="alert">
            Financing saved and confirmed, but refreshing saved values failed. The confirmed values
            are retained in this editor.
          </p>
        ) : null}
        {draft.outcome === "not-sent" ||
        draft.outcome === "rejected" ||
      draft.outcome === "conflict" ||
        draft.outcome === "uncertain" ? (
          <p role="alert">{FINANCING_FAILURE_MESSAGES[draft.outcome]}</p>
        ) : null}

        {editing ? (
          <section aria-label="Financing inputs" className="space-y-4 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-medium">How much will you borrow?</h3>
              <p className="text-sm text-muted-foreground">
                Enter loan-to-value or leave it blank and enter a direct loan amount. If both are
                entered, loan-to-value takes precedence, including 0%. Neither field is cleared for
                you. All fields below are user-entered; no rate or tenure is assumed.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {numField("loan_to_value_percent", "Loan-to-value (%)")}
              {numField("loan_amount", "Direct loan amount (RM) — used only with LTV blank")}
              {numField("annual_interest_rate_percent", "Annual interest rate (%)")}
              {numField("loan_tenure_years", "Loan tenure (years)")}
            </div>
          </section>
        ) : null}

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Instalment in use</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold text-foreground">
              {inUse?.amount != null ? displayMoney(inUse.amount) : "Missing / Not Verified"}
            </span>
            {inUse?.source === "user-provided" ? (
              <StatusBadge
                status="user-entered"
              />
            ) : null}
            {inUse?.source === "calculated" ? <StatusBadge status="estimated" /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {inUse?.source === "user-provided"
              ? "Using the bank-quoted instalment you entered."
              : inUse?.source === "calculated"
                ? "Using the calculated instalment (standard amortising loan)."
                : "No instalment available yet — loan amount, interest rate and tenure are all needed, or switch on a bank quote."}
          </p>
          {displayedValues.use_user_provided_instalment ? (
            <p className="mt-2 text-sm">
              Bank-quoted instalment selected in Advanced. A missing quote does not fall back to the
              calculation. Switch to Advanced to review the quote, selection and evidence.
            </p>
          ) : null}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row
            label={
              editing
                ? "Adopted purchase price (draft preview)"
                : "Purchase price (from acquisition costs)"
            }
          >
            {money(purchasePrice)}
          </Row>
          <Row label="Loan amount">
            {money(result?.loanAmount)}
            {result?.loanAmountSource === "from-ltv" ? (
              <span className="ml-2 text-xs text-muted-foreground">
                Calculated from loan-to-value
              </span>
            ) : null}
            {result?.loanAmountSource === "entered" ? (
              <span className="ml-2 text-xs text-muted-foreground">User-entered direct amount</span>
            ) : null}
          </Row>
          <Row label="Down payment (calculated)">{money(result?.downPayment)}</Row>
          <Row label="Calculated monthly instalment">
            {money(result?.calculatedMonthlyInstalment)}
          </Row>
          <div hidden={!showAdvanced}>
            <Row label="Bank-quoted monthly instalment (user-entered)">
              {money(parsed.success ? parsed.data.user_provided_monthly_instalment : null)}
            </Row>
          </div>
          <div hidden={!showAdvanced}>
            <Row label="Annual debt service">{money(result?.annualDebtService)}</Row>
          </div>
        </dl>

        {editing ? (
          <div className="space-y-6 border-t border-border pt-6">
            {advancedErrors && mode === "simple" ? (
              <p role="alert">Advanced inputs have errors and are shown below for correction.</p>
            ) : null}
            <section
              aria-label="Advanced financing inputs"
              hidden={!showAdvanced}
              className="space-y-6"
              onFocusCapture={() => {
                // Keep the revealed section open while the user corrects an error.
                if (advancedErrors) setMode("advanced");
              }}
            >
              <h3 className="text-sm font-medium">Advanced financing details</h3>
              <div className="space-y-2">
                <Label htmlFor="loan_type">Loan type</Label>
                <select
                  id="loan_type"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={busy}
                  aria-invalid={!!errors.loan_type}
                  aria-describedby={errors.loan_type ? "loan_type-error" : undefined}
                  value={values.loan_type}
                  onChange={(e) => set("loan_type", e.target.value)}
                >
                  <option value="">Not recorded</option>
                  {LOAN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.loan_type ? (
                  <p id="loan_type-error" className="text-xs text-destructive">
                    {errors.loan_type}
                  </p>
                ) : null}
              </div>

              <div className="space-y-4 rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">Bank quote (optional)</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {numField(
                    "user_provided_monthly_instalment",
                    "Bank-quoted monthly instalment (RM)",
                  )}
                </div>
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    disabled={busy}
                    checked={values.use_user_provided_instalment}
                    onCheckedChange={(c) => set("use_user_provided_instalment", c)}
                  />
                  Use the bank-quoted instalment instead of the calculated one
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    disabled={busy}
                    checked={values.bank_quote_verified}
                    onCheckedChange={(c) => set("bank_quote_verified", c)}
                  />
                  I have a written quote from the bank (recorded assessment declaration)
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="financing_notes">Financing notes</Label>
                <Textarea
                  id="financing_notes"
                  disabled={busy}
                  aria-invalid={!!errors.financing_notes}
                  aria-describedby={errors.financing_notes ? "financing_notes-error" : undefined}
                  value={values.financing_notes}
                  onChange={(e) => set("financing_notes", e.target.value)}
                />
                {errors.financing_notes ? (
                  <p id="financing_notes-error" className="text-xs text-destructive">
                    {errors.financing_notes}
                  </p>
                ) : null}
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => editor.submit()}
                disabled={
                  busy ||
                  draft.outcome === "uncertain" || draft.outcome === "conflict" ||
                  saveBlocked ||
                  contextChanged ||
                  context.status === "unavailable"
                }
              >
                {draft.outcome === "pending" ? "Saving..." : (draft.evidenceDirty ? "Save values and evidence" : "Save financing")}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => editor.review()}>
                {draft.reviewing ? "Reviewing..." : "Review saved values"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => editor.cancel()}>
                Cancel
              </Button>
            </div>
            {draft.outcome === "conflict" ? (
              <Button variant="outline" onClick={() => baseline.load()} disabled={busy || baseline.loading}>
                Discard draft and reload saved values
              </Button>
            ) : null}
            {draft.review === "failed" ? (
              <p role="alert">Unable to review saved financing. Your draft is retained.</p>
            ) : null}
            {draft.review === "available" ? (
              <section
                aria-label="Saved financing review"
                className="space-y-2 rounded-lg border p-4"
              >
                <p>
                  Saved values from a separate read. This does not prove which attempt committed; no
                  row does not prove a write failed. Your draft has not been replaced.
                </p>
                {draft.reviewed ? (
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(financingRecordToForm(draft.reviewed)).map(([key, value]) => (
                      <Row key={key} label={key.replaceAll("_", " ")}>
                        {typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : value === ""
                            ? "Missing / Not Verified"
                            : value}
                      </Row>
                    ))}
                    <Row label="Saved down payment">{money(draft.reviewed.down_payment)}</Row>
                    <Row label="Saved calculated monthly instalment">
                      {money(draft.reviewed.calculated_monthly_instalment)}
                    </Row>
                  </dl>
                ) : (
                  <p>No saved financing row was returned.</p>
                )}
              </section>
            ) : null}
          </div>
        ) : record?.financing_notes ? (
          <p className="text-sm text-muted-foreground">Notes: {record.financing_notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

// These controls only select a view; they remain usable while the editor is locked.
function FinancingPresentation({
  mode,
  onChange,
}: {
  mode: "simple" | "advanced";
  onChange: (mode: "simple" | "advanced") => void;
}) {
  return (
    <div role="group" aria-label="Financing presentation" className="flex flex-wrap gap-2">
      {(["simple", "advanced"] as const).map((view) => (
        <Button
          key={view}
          variant={mode === view ? "default" : "outline"}
          aria-pressed={mode === view}
          onClick={() => onChange(view)}
        >
          {view === "simple" ? "Simple mode" : "Advanced mode"}
        </Button>
      ))}
    </div>
  );
}
