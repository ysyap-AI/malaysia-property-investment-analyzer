import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { parseEvidence } from "@/lib/property/investment-evidence";
import { EvidenceFields } from "./EvidenceFields";
import { SourcesAndAssumptions } from "./SourcesAndAssumptions";
import { evidenceDraftValues } from "@/lib/property/evidence-draft-values";
import { useFinancialBaseline } from "@/hooks/use-financial-baseline";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";
// Display + entry surface for acquisition costs.
// This component contains NO financial formula: the total comes from
// src/lib/finance/acquisition.ts.
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
  calculateTotalAcquisitionCost,
  type AcquisitionCostField,
} from "@/lib/finance/acquisition";
import {
  acquisitionKeys,
  getAcquisitionCosts,
  saveAcquisitionCosts,
} from "@/lib/property/acquisition-api";
import {
  ACQUISITION_FIELD_LABELS,
  ACQUISITION_SECTIONS,
  acquisitionRecordToForm,
} from "@/lib/property/acquisition-fields";
import {
  ACQUISITION_FAILURE_MESSAGES,
  AcquisitionSaveError,
  createAcquisitionEditor,
  type AcquisitionAttempt,
} from "@/lib/property/acquisition-editor";
import { displayMoney } from "@/lib/property/property-fields";
import { acquisitionCostsSchema } from "@/lib/property/acquisition-fields";
import { InvestmentStrategyReadiness } from "./InvestmentStrategyReadiness";
import { MalaysianAcquisitionEstimator } from "./MalaysianAcquisitionEstimator";

// Presentation only. Every field keeps the same mounted, controlled input.
const GUIDED_GROUPS = [
  { title: "Purchase", fields: ["purchase_price"], priority: true },
  {
    title: "Renovation & furnishing budgets",
    fields: ["renovation_cost", "furnishing_cost"],
    priority: true,
  },
  {
    title: "Legal & statutory",
    fields: [
      "spa_legal_fee",
      "transfer_stamp_duty",
      "loan_legal_fee",
      "loan_stamp_duty",
      "valuation_fee",
    ],
    priority: false,
  },
  { title: "Deposits", fields: ["utility_deposits", "maintenance_deposit"], priority: false },
  {
    title: "Other acquisition costs",
    fields: ["acquisition_agent_fee", "initial_holding_cost", "contingency_cost", "other_cost"],
    priority: false,
  },
] satisfies { title: string; fields: AcquisitionCostField[]; priority: boolean }[];

export function AcquisitionCostsPanel({ propertyId }: { propertyId: string }) {
  const { user, loading } = useAuth();
  const deletion = usePropertyDeletion(user?.id ?? null, propertyId);
  if (deletionBlocksProperty(deletion.outcome)) return <p role="status">Property deletion requires review. Financial editing is unavailable.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Loading acquisition costs...</p>;
  if (!user) return <p role="alert">Sign in to view acquisition costs.</p>;
  return (
    <AcquisitionCostsEditor
      key={JSON.stringify([user.id, propertyId])}
      propertyId={propertyId}
      identityId={user.id}
    />
  );
}

function AcquisitionCostsEditor({
  propertyId,
  identityId,
}: {
  propertyId: string;
  identityId: string;
}) {
  const queryClient = useQueryClient();
  const evidenceFinancing = useQuery({ queryKey: financingKeys.detail(propertyId), queryFn: () => getFinancing(propertyId) });
  const shared = useFinancialConfirmation(identityId, propertyId).acquisition;
  const saveBlocked = ["pending", "uncertain", "acknowledged"].includes(shared?.outcome ?? "");
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const save = useMutation({
    retry: false,
    mutationFn: async (attempt: AcquisitionAttempt) => {
      if (!attempt)
        throw new Error("Unable to load acquisition costs. Open the editor before saving.");
      try {
        return await trackFinancialWrite(queryClient, identityId, propertyId, "acquisition", () =>
          saveAcquisitionCosts(propertyId, attempt.values, attempt.isCurrent, attempt.revision, attempt.evidence),
        );
      } catch (error) {
        if (error instanceof AcquisitionSaveError) throw error;
        throw new AcquisitionSaveError("uncertain");
      }
    },
  });
  const [editor] = useState(() =>
    createAcquisitionEditor(propertyId, {
      save: save.mutateAsync,
      acknowledge: async (row, isCurrent) => {
        await queryClient.cancelQueries({
          queryKey: acquisitionKeys.detail(propertyId),
          exact: true,
        });
        if (isCurrent()) queryClient.setQueryData(acquisitionKeys.detail(propertyId), row);
      },
      refresh: async (isCurrent) => {
        // A deliberate review must start a read after this action, rather than
        // reusing a background request that may predate the write.
        await queryClient.cancelQueries({
          queryKey: acquisitionKeys.detail(propertyId),
          exact: true,
        });
        if (!isCurrent()) throw new Error("Acquisition review is no longer active.");
        return queryClient.fetchQuery({
          queryKey: acquisitionKeys.detail(propertyId),
          queryFn: async () => {
            const row = await getAcquisitionCosts(propertyId);
            if (!isCurrent()) throw new Error("Acquisition review is no longer active.");
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
    editor.open(snapshot.acquisition_costs, snapshot.property.revision);
  });
  const draft = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const { editing, values, errors } = draft;
  let evidenceAvailable = true;
  try { parseEvidence("acquisition_costs", draft.evidence); } catch { evidenceAvailable = false; }
  useDiscloseSavedDraft("acquisition", editing, draft.outcome === "saved" || draft.outcome === "saved-refresh-failed");
  const busy = draft.outcome === "pending" || draft.reviewing || baseline.loading;

  const {
    data: record,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: acquisitionKeys.detail(propertyId),
    queryFn: () => getAcquisitionCosts(propertyId),
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

  const stored = acquisitionRecordToForm(record);
  const storedNumbers = Object.fromEntries(
    Object.entries(stored).map(([k, v]) => [k, v === "" ? null : Number(v)]),
  ) as Record<AcquisitionCostField, number | null>;
  const result = calculateTotalAcquisitionCost(storedNumbers);
  const reviewValues = editing ? values : stored;
  const reviewNumbers = Object.fromEntries(
    GUIDED_GROUPS.flatMap((group) => group.fields).map((field) => {
      const parsed = acquisitionCostsSchema.shape[field].safeParse(reviewValues[field]);
      return [field, parsed.success ? parsed.data : Number.NaN];
    }),
  ) as Record<AcquisitionCostField, number | null>;
  const reviewResult = editing ? calculateTotalAcquisitionCost(reviewNumbers) : result;

  if (!draft.active)
    return <p role="alert">The session changed. Reopen this property to continue.</p>;
  if (error && !editing)
    return (
      <p role="alert" className="text-sm text-destructive">
        Unable to load acquisition costs. Reload the page to try again.
      </p>
    );
  if (isLoading && !editing)
    return <p className="text-sm text-muted-foreground">Loading acquisition costs...</p>;

  return (
    <div className="space-y-6">
      {editing ? <EvidenceFields section="acquisition_costs" values={evidenceDraftValues("acquisition_costs", values)} metadata={draft.evidence} estimateContext={{ purchasePrice: evidenceDraftValues("acquisition_costs", values)["purchase_price"] as number | null, financing: evidenceFinancing.data ?? null, available: !evidenceFinancing.isError && !evidenceFinancing.isFetching }} onChange={editor.changeEvidence} disabled={busy || saveBlocked || draft.outcome === "conflict" || draft.outcome === "uncertain" || draft.outcome === "saved" || draft.outcome === "saved-refresh-failed"} /> : <SourcesAndAssumptions propertyId={propertyId} section="acquisition_costs" record={record} />}

      {baseline.loading ? <p role="status">Loading saved values for editing...</p> : null}
      {baseline.error ? <p role="alert">Saved values could not be loaded. Your draft is retained. Try loading again.</p> : null}
      {isFetching || writeBlocksCurrent(shared?.outcome) ? (
        <p role="status">Last-known saved acquisition values; current confirmation unavailable.</p>
      ) : null}
      <div role="group" aria-label="Acquisition input presentation" className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "simple" ? "default" : "outline"}
            aria-pressed={mode === "simple"}
            onClick={() => setMode("simple")}
          >
            Simple mode
          </Button>
          <Button
            type="button"
            variant={mode === "advanced" ? "default" : "outline"}
            aria-pressed={mode === "advanced"}
            onClick={() => setMode("advanced")}
          >
            Advanced mode
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {mode === "simple"
            ? "Start with purchase price and any renovation or furnishing budget. Expand each group to enter the remaining costs."
            : "All fourteen individual cost fields are shown."}{" "}
          Switching modes only changes the view. Leave unknown amounts blank; enter zero only when
          you mean zero. Fee suggestions are optional and require explicit application.
        </p>
      </div>
      {editing ? (
        <p className="text-sm text-muted-foreground">
          Your draft stays in this open editor. Leaving the page or refreshing the browser discards
          it.
        </p>
      ) : null}
      {error && editing ? (
        <p role="alert" className="text-sm text-destructive">
          Unable to refresh saved acquisition costs. Your open draft is retained.
        </p>
      ) : null}
      {saveBlocked && draft.outcome !== "pending" && draft.outcome !== "uncertain" ? (
        <p role="status">
          This section has an unresolved save confirmation. Current assessments are unavailable;
          Review does not resolve an unknown write.
        </p>
      ) : null}
      {draft.outcome === "pending" ? (
        <p role="status">Saving acquisition costs. Waiting for confirmation...</p>
      ) : null}
      {draft.outcome === "invalid" ? (
        <p role="alert">
          Please correct the highlighted amounts. The total must also fit the supported numeric
          range.
        </p>
      ) : null}
      {draft.outcome === "saved" ? (
        <p role="status">Acquisition costs saved and confirmed. Other sections save separately.</p>
      ) : null}
      {draft.outcome === "saved-refresh-failed" ? (
        <p role="alert">
          Acquisition costs saved and confirmed, but refreshing saved values failed. The confirmed
          values are retained in this editor.
        </p>
      ) : null}
      {draft.outcome === "not-sent" ||
      draft.outcome === "rejected" ||
      draft.outcome === "conflict" ||
      draft.outcome === "uncertain" ? (
        <p role="alert">{ACQUISITION_FAILURE_MESSAGES[draft.outcome]}</p>
      ) : null}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {result.status === "complete"
                ? "Total Acquisition Cost"
                : "Known acquisition costs subtotal"}{" "}
              (saved)
            </CardTitle>
            <CardDescription>
              Purchase price plus every known acquisition cost. Unknown amounts are left out of the
              total, never counted as zero.
            </CardDescription>
          </div>
          {!editing ? (
            <Button onClick={() => baseline.load()} disabled={isLoading || !!error || baseline.loading}>
              {record ? "Edit costs" : "Enter costs"}
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
              </p>
              {result.status === "incomplete" ? (
                <p className="text-sm text-muted-foreground">
                  No total can be produced until the purchase price is recorded.
                </p>
              ) : null}
              {result.status === "invalid" ? (
                <p className="text-sm text-destructive">
                  One or more stored amounts are not valid, so no total is shown.
                </p>
              ) : null}
              {result.status === "partial" ? (
                <p className="text-sm text-muted-foreground">
                  Known costs only. {result.missingFields.length} cost
                  {result.missingFields.length === 1 ? " is" : "s are"} still Missing / Not
                  Verified. This subtotal is not the final investment cash requirement.
                </p>
              ) : null}
              {result.status === "complete" ? (
                <p className="text-sm text-muted-foreground">
                  Every cost line has a recorded value.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <MalaysianAcquisitionEstimator
          propertyId={propertyId}
          identityId={identityId}
          values={values}
          evidence={draft.evidence}
          disabled={!evidenceAvailable || busy || saveBlocked || (draft.outcome === "uncertain" || draft.outcome === "conflict")}
          onApply={(changes, evidence) => {
            const previous = parseEvidence("acquisition_costs", draft.evidence);
            editor.changeEvidence({ version: 1, fields: { ...previous?.fields, ...evidence.fields } });
            for (const [field, amount] of Object.entries(changes))
              editor.change(field as AcquisitionCostField, String(amount));
          }}
        />
      ) : null}

      {GUIDED_GROUPS.map((section, index) => {
        const visible =
          mode === "advanced" ||
          section.priority ||
          expanded[section.title] ||
          section.fields.some((field) => !!errors[field]);
        return (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>
                {section.priority
                  ? "Enter your own amount when applicable. Unknown stays blank; a confirmed no-cost item can be entered as zero."
                  : `${section.fields.length} individual costs. Review every item, including unknown amounts, below.`}
              </CardDescription>
              {!section.priority && mode === "simple" ? (
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={!!visible}
                  aria-controls={`acquisition-group-${index}`}
                  onClick={() =>
                    setExpanded((previous) => ({ ...previous, [section.title]: !visible }))
                  }
                >
                  {visible ? "Hide" : "Show"} {section.title}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent
              id={`acquisition-group-${index}`}
              hidden={!visible}
              className={
                !visible
                  ? "hidden"
                  : editing
                    ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    : "space-y-3 text-sm"
              }
            >
              {section.fields.map((field) =>
                editing ? (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{ACQUISITION_FIELD_LABELS[field]} (RM)</Label>
                    <Input
                      id={field}
                      inputMode="decimal"
                      placeholder="Leave blank if unknown"
                      value={String(values[field] ?? "")}
                      disabled={busy}
                      aria-invalid={!!errors[field]}
                      aria-describedby={errors[field] ? `${field}-error` : undefined}
                      onChange={(e) => editor.change(field, e.target.value)}
                    />
                    {errors[field] ? (
                      <p id={`${field}-error`} className="text-xs text-destructive">
                        {errors[field]}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div
                    key={field}
                    className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0"
                  >
                    <span className="text-muted-foreground">{ACQUISITION_FIELD_LABELS[field]}</span>
                    {storedNumbers[field] === null ? (
                      <StatusBadge status="missing" />
                    ) : (
                      <span className="text-right font-medium text-foreground">
                        {displayMoney(storedNumbers[field])}
                      </span>
                    )}
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acquisition cost review</CardTitle>
          <CardDescription>
            {editing
              ? "Current draft — not saved. The saved subtotal above changes only after confirmation."
              : "Saved amounts. Recorded values do not establish independent verification."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Known costs{reviewResult.status === "complete" ? " total" : " subtotal"}:{" "}
            {reviewResult.total === null ? "Unavailable" : displayMoney(reviewResult.total)}
          </p>
          <p>
            {reviewResult.knownFields.length} recorded · {reviewResult.missingFields.length} missing
            · {reviewResult.invalidFields.length} invalid / unresolved
          </p>
          {reviewResult.status !== "complete" ? (
            <p>
              Final acquisition total unavailable. Yield on total cost, net rental yield,
              acquisition costs not financed, initial cash invested and cash-on-cash return require
              complete acquisition costs. A partial known subtotal is not the final investment cash
              requirement.
            </p>
          ) : (
            <p>
              All fourteen lines have an amount. Initial cash and returns still depend on the
              required financing, rental and operating inputs.
            </p>
          )}
          <dl className="space-y-2">
            {ACQUISITION_SECTIONS.flatMap((section) => section.fields).map((field) => (
              <div key={field} className="grid gap-1 border-b pb-2 sm:grid-cols-2">
                <dt>{ACQUISITION_FIELD_LABELS[field]}</dt>
                <dd>
                  {reviewResult.invalidFields.includes(field)
                    ? "Invalid / unresolved — correct this amount"
                    : reviewResult.missingFields.includes(field)
                      ? "Missing / Not Verified"
                      : reviewNumbers[field] === 0
                        ? `User-entered zero${editing ? " (draft; not saved)" : " (saved)"}`
                        : `${displayMoney(reviewNumbers[field])}${editing ? " (draft; not saved)" : " (saved)"}`}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {editing ? (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => editor.submit()}
            disabled={!evidenceAvailable || busy || saveBlocked || (draft.outcome === "uncertain" || draft.outcome === "conflict")}
          >
            {draft.outcome === "pending" ? "Saving…" : (draft.evidenceDirty ? "Save values and evidence" : "Save acquisition costs")}
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
                {ACQUISITION_SECTIONS.flatMap((section) => section.fields).map((field) => (
                  <div key={field} className="flex justify-between gap-4">
                    <dt>{ACQUISITION_FIELD_LABELS[field]}</dt>
                    <dd>
                      {draft.reviewed?.[field] === null
                        ? "Missing / Not Verified"
                        : displayMoney(draft.reviewed?.[field])}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>No saved acquisition row was returned by this read.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
      <InvestmentStrategyReadiness
        propertyId={propertyId}
        draftOpen={editing}
        confirmationPending={draft.outcome === "pending" || (draft.outcome === "uncertain" || draft.outcome === "conflict")}
      />
    </div>
  );
}
