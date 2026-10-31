import { useSourceNavigation, revealAndFocus } from "@/hooks/use-source-navigation";
import {
  currentEstimateInputs,
  evidenceLabel,
  evidenceValue,
  type EstimateReviewContext,
} from "@/lib/property/evidence-draft-values";
import { useEffect, useRef, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EVIDENCE_FIELDS,
  emptyEvidence,
  evidenceStatus,
  parseEvidence,
  type EvidenceEntry,
  type EvidenceSection,
  type SectionEvidence,
} from "@/lib/property/investment-evidence";
import type { MalaysianAcquisitionInputs } from "@/lib/finance/malaysian-acquisition-estimate";

export function EvidenceFields({
  section,
  values,
  metadata,
  onChange,
  disabled,
  actionLabel = "Use source in draft",
  currentInputs,
  estimateContext,
}: {
  section: EvidenceSection;
  values: Record<string, unknown>;
  metadata: unknown;
  onChange?: ((next: SectionEvidence) => void) | undefined;
  disabled?: boolean | undefined;
  actionLabel?: string;
  currentInputs?: MalaysianAcquisitionInputs | null | undefined;
  estimateContext?: EstimateReviewContext | undefined;
}) {
  const [field, setField] = useState<string>(EVIDENCE_FIELDS[section][0]);
  const request = useSourceNavigation();
  const selector = useRef<HTMLSelectElement>(null);
  const editable = !!onChange;
  useEffect(() => {
    if (request?.section !== section || !editable) return;
    if (!(EVIDENCE_FIELDS[section] as readonly string[]).includes(request.field)) return;
    setField(request.field);
    revealAndFocus(selector.current);
  }, [request, section, editable]);
  let parsed: SectionEvidence | null;
  try {
    parsed = parseEvidence(section, metadata);
  } catch {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources &amp; assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <p role="alert">
            Evidence unavailable - saved metadata could not be read. Reload to retry. Existing
            sources have been preserved.
          </p>
        </CardContent>
      </Card>
    );
  }
  const fields = [...EVIDENCE_FIELDS[section]];
  return (
    <Card id={`sources-${section}`}>
      <CardHeader>
        <CardTitle className="text-base">Sources &amp; assumptions</CardTitle>
        <CardDescription>
          Calculation inputs can be complete while evidence is still missing. Sources support your
          assumptions; they do not guarantee future rent or returns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          {section === "operating_expenses"
            ? "Amounts and evidence are bound to saved annual expenses (RM), including when entered monthly. "
            : "Amounts are read-only here. "}
          Calculated totals, down payment, instalments and returns are calculated from saved
          assumptions. Recorded assessment declarations are separate from these sources.
        </p>
        {section === "financing" ? (
          <p className="text-xs text-muted-foreground">
            When LTV is entered, the existing calculator derives loan amount from purchase price and
            LTV. That principal is calculated from assumptions, not a directly observed bank
            advance. The quoted instalment remains separate.
          </p>
        ) : null}
        <div className="rounded-md border p-3">
          <EvidenceLine
            section={section}
            field={fields[0]!}
            values={values}
            metadata={metadata}
            currentInputs={currentInputs}
            estimateContext={estimateContext}
          />
          <details className="mt-3">
            <summary className="cursor-pointer text-primary">
              Other sources ({fields.length - 1})
            </summary>
            <div className="mt-3 space-y-3">
              {fields.slice(1).map((f) => (
                <EvidenceLine
                  key={f}
                  section={section}
                  field={f}
                  values={values}
                  metadata={metadata}
                  currentInputs={currentInputs}
                  estimateContext={estimateContext}
                />
              ))}
            </div>
          </details>
        </div>
        {onChange ? (
          <details>
            <summary className="cursor-pointer font-medium text-primary">
              Record or edit a source
            </summary>
            <div className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="font-medium">Input to support</span>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  ref={selector}
                  value={field}
                  disabled={disabled}
                  onChange={(e) => setField(e.target.value)}
                >
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {evidenceLabel(f)}
                    </option>
                  ))}
                </select>
              </label>
              <EntryForm
                key={field + JSON.stringify(parsed?.fields[field])}
                section={section}
                field={field}
                value={values[field] ?? null}
                initial={parsed?.fields[field]}
                disabled={disabled}
                actionLabel={actionLabel}
                onRecord={(entry) =>
                  onChange({
                    version: 1,
                    fields: { ...(parsed ?? emptyEvidence()).fields, [field]: entry },
                  })
                }
              />
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
function EvidenceLine({
  section,
  field,
  values,
  metadata,
  currentInputs,
  estimateContext,
}: {
  section: EvidenceSection;
  field: string;
  values: Record<string, unknown>;
  metadata: unknown;
  currentInputs?: MalaysianAcquisitionInputs | null | undefined;
  estimateContext?: EstimateReviewContext | undefined;
}) {
  const entry = parseEvidence(section, metadata)?.fields[field];
  return (
    <div className="min-w-0 space-y-1 border-b pb-2 last:border-0">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">
          {evidenceLabel(field)}
          {section === "operating_expenses" ? " (annual RM)" : ""}
        </span>
        <span>{evidenceValue(values[field])}</span>
      </div>
      <span className="inline-flex rounded-md border bg-muted px-2 py-1 text-xs">
        {evidenceStatus(
          section,
          field,
          values[field],
          metadata,
          undefined,
          currentInputs ?? currentEstimateInputs(entry, estimateContext),
        )}
      </span>
      {entry ? (
        <details className="break-words text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            {entry.sourceLabel || "Recorded assumption"}
            {entry.observedOn ? ` / ${entry.observedOn}` : " / Date unknown"}
          </summary>
          <div className="mt-2 space-y-1">
            <p>Value at review: {evidenceValue(entry.valueAtReview)}</p>
            {entry.sourceUrl ? (
              <a
                className="text-primary underline break-all"
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open recorded source
              </a>
            ) : null}
            <p className="whitespace-pre-wrap">{entry.notes}</p>
            {entry.verifiedOn ? (
              <p>Checked by you: {entry.verifiedOn}. MPIA has not authenticated this record.</p>
            ) : null}
            {entry.estimate ? (
              <>
                <p>Rule version: {entry.estimate.rulesVersion}</p>
                <p>
                  Purchase price: {evidenceValue(entry.estimate.inputs.purchasePrice)}; market
                  value: {evidenceValue(entry.estimate.inputs.marketValue)}; price used as
                  provisional market-value proxy:{" "}
                  {entry.estimate.inputs.usePriceAsMarketProxy ? "yes" : "no"}; financing:{" "}
                  {entry.estimate.inputs.financing}; loan input:{" "}
                  {evidenceValue(entry.estimate.inputs.loanAmount)}; LTV:{" "}
                  {evidenceValue(entry.estimate.inputs.loanToValuePercent)}%. Reopen the fee
                  estimator to review scope and exclusions.
                </p>
              </>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
function EntryForm({
  section,
  field,
  value,
  initial,
  disabled,
  onRecord,
  actionLabel,
}: {
  section: EvidenceSection;
  field: string;
  value: unknown;
  initial?: EvidenceEntry | undefined;
  disabled?: boolean | undefined;
  onRecord: (entry: EvidenceEntry) => void;
  actionLabel: string;
}) {
  const id = useId();
  const [entry, setEntry] = useState<EvidenceEntry>(
    () =>
      initial ?? {
        origin: "user_assumption",
        valueAtReview: null,
        sourceLabel: null,
        sourceUrl: null,
        notes: null,
        observedOn: null,
        verifiedOn: null,
        estimate: null,
      },
  );
  const [error, setError] = useState("");
  const set = (key: keyof EvidenceEntry, text: string) => {
    setError("");
    setEntry((e) => ({ ...e, [key]: text || null }));
  };
  function record() {
    try {
      const next = {
        ...entry,
        valueAtReview: value,
        sourceLabel: entry.sourceLabel?.trim() || null,
        sourceUrl: entry.sourceUrl?.trim() || null,
        notes: entry.notes?.trim() || null,
      };
      const parsed = parseEvidence(section, { version: 1, fields: { [field]: next } });
      onRecord(parsed!.fields[field]!);
      setError("");
    } catch {
      setError(
        "Check the source label, HTTP/HTTPS URL and real dates. Observations need a label and observation date; actuals also need a known value, check date and notes. Future dates are not allowed.",
      );
    }
  }
  return (
    <div className="space-y-3">
      <p>
        Value being supported: <strong>{evidenceValue(value)}</strong>
        {section === "operating_expenses" ? " annually" : ""}
      </p>
      <fieldset disabled={disabled} className="space-y-3">
        <label className="block space-y-2">
          <span>Source type</span>
          <select
            className="w-full rounded-md border bg-background p-2"
            value={entry.origin}
            onChange={(e) =>
              setEntry((v) => ({
                ...v,
                origin: e.target.value as EvidenceEntry["origin"],
                estimate: null,
              }))
            }
          >
            <option value="user_assumption">User assumption</option>
            <option value="external_observation">External observation</option>
            <option value="verified_actual">Actual - checked by you</option>
            {entry.origin === "system_estimate" ? (
              <option value="system_estimate" disabled>
                System estimate - use calculator to reapply
              </option>
            ) : null}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          {entry.origin === "verified_actual"
            ? "I checked an actual record for this property. Describe what you checked. MPIA has not independently verified it. A quotation is an observation, not an amount paid."
            : entry.origin === "external_observation"
              ? "Listings and quotations are observations. Advertised rent is not achieved rent; an asking price is not a transaction."
              : entry.origin === "system_estimate"
                ? "Reopen and explicitly apply the calculator to update this source. Choose User assumption to replace it manually."
                : "A planning assumption is not independently evidenced."}
        </p>
        {(
          [
            ["sourceLabel", "Source label", 120],
            ["sourceUrl", "Source URL", 2048],
            ["observedOn", "Observation date", 10],
            ["verifiedOn", "Date checked by you", 10],
          ] as const
        ).map(([key, label, max]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`${id}-${key}`}>{label}</Label>
            <Input
              id={`${id}-${key}`}
              type={key.endsWith("On") ? "date" : "text"}
              maxLength={max}
              value={entry[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}
        <Label htmlFor={`${id}-notes`}>Notes / record checked</Label>
        <Textarea
          id={`${id}-notes`}
          maxLength={2000}
          value={entry.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="button" disabled={entry.origin === "system_estimate"} onClick={record}>
          {actionLabel}
        </Button>
      </fieldset>
    </div>
  );
}
