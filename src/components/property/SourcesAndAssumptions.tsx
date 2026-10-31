import { useSourceNavigation } from "@/hooks/use-source-navigation";
import { useInvestmentEvidence } from "@/hooks/use-investment-evidence";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDiscloseSavedDraft } from "@/hooks/use-saved-draft-disclosure";
import { useFinancialConfirmation } from "@/hooks/use-financial-confirmation";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";
import { supabase } from "@/integrations/supabase/external-client";
import {
  getPropertySnapshot,
  RevisionWriteError,
  type PropertySnapshot,
} from "@/lib/property/property-revision";
import { saveSectionEvidence, snapshotSection } from "@/lib/property/evidence-api";
import {
  evidenceEqual,
  type EvidenceSection,
  type SectionEvidence,
} from "@/lib/property/investment-evidence";
import {
  trackFinancialWrite,
  financialReadKey,
  type FinancialSection,
} from "@/lib/property/financial-confirmation";
import { getProperty } from "@/lib/property/property-api";
import { getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { getFinancing } from "@/lib/property/financing-api";
import { getOperatingExpenses } from "@/lib/property/operating-expenses-api";
import { Button } from "@/components/ui/button";
import { EvidenceFields } from "./EvidenceFields";
const sectionKey: Record<EvidenceSection, FinancialSection> = {
  properties: "propertyEvidence",
  acquisition_costs: "acquisition",
  financing: "financing",
  operating_expenses: "expenses",
};
export function SourcesAndAssumptions({
  propertyId,
  section,
  record,
}: {
  propertyId: string;
  section: EvidenceSection;
  record: Record<string, unknown> | null | undefined;
}) {
  const { user } = useAuth();
  return user ? (
    <EvidenceSession
      key={`${user.id}:${propertyId}:${section}`}
      propertyId={propertyId}
      section={section}
      record={record}
      owner={user.id}
    />
  ) : null;
}
function EvidenceSession({
  propertyId,
  section,
  record,
  owner,
}: {
  propertyId: string;
  section: EvidenceSection;
  record: Record<string, unknown> | null | undefined;
  owner: string;
}) {
  const client = useQueryClient();
  const { savedReads, ownerMatches } = useInvestmentEvidence(propertyId);
  const [reviewed, setReviewed] = useState<Record<string, unknown> | null>(null);
  const [baseline, setBaseline] = useState<PropertySnapshot | null>(null);
  const [draft, setDraft] = useState<SectionEvidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [locked, setLocked] = useState(false);
  const [lifetime] = useState(() => ({ generation: 0 }));
  const pending = useRef(false);
  const key = sectionKey[section];
  const shared = useFinancialConfirmation(owner, propertyId)[key];
  const deletion = usePropertyDeletion(owner, propertyId);
  const blocked =
    deletionBlocksProperty(deletion.outcome) ||
    ["pending", "acknowledged", "uncertain"].includes(shared?.outcome ?? "");
  useDiscloseSavedDraft(
    section === "properties"
      ? "propertyEvidence"
      : section === "acquisition_costs"
        ? "acquisitionEvidence"
        : section === "financing"
          ? "financingEvidence"
          : "expensesEvidence",
    !!baseline,
    false,
  );
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
  async function open() {
    if (pending.current || blocked) return;
    pending.current = true;
    setBusy(true);
    const generation = lifetime.generation;
    try {
      const snapshot = await getPropertySnapshot(propertyId, owner);
      if (generation !== lifetime.generation) return;
      if (!snapshotSection(snapshot, section)) {
        setStatus("Enter and save this section's financial inputs before recording sources.");
        return;
      }
      setBaseline(snapshot);
      setDraft(null);
      setLocked(false);
      setStatus(
        "Evidence-only draft. Financial amounts and recorded assessment declarations are unchanged. Save each source deliberately. Leaving this page discards unsaved changes.",
      );
    } catch {
      if (generation === lifetime.generation)
        setStatus("Evidence unavailable. Saved inputs could not be loaded; try opening again.");
    } finally {
      pending.current = false;
      if (generation === lifetime.generation) setBusy(false);
    }
  }
  const request = useSourceNavigation();
  const handledRequest = useRef<number | null>(null);
  useEffect(() => {
    if (!request || request.section !== section || handledRequest.current === request.sequence) return;
    if (!record || blocked || busy || !ownerMatches) return;
    handledRequest.current = request.sequence;
    if (!baseline) void open();
    // open uses the same revision-aware read as the explicit Review / edit action.
    // An existing baseline/draft is deliberately retained.
  });
  async function save(next: SectionEvidence) {
    if (!baseline || pending.current || locked || blocked) return;
    pending.current = true;
    setBusy(true);
    setDraft(next);
    setStatus("Saving evidence...");
    const generation = lifetime.generation,
      current = () => generation === lifetime.generation;
    let acknowledged = false;
    try {
      await trackFinancialWrite(client, owner, propertyId, key, () =>
        saveSectionEvidence(baseline, section, next, owner, current),
      );
      acknowledged = true;
      if (!current()) return;
      const loaders = {
        properties: getProperty,
        acquisition_costs: getAcquisitionCosts,
        financing: getFinancing,
        operating_expenses: getOperatingExpenses,
      };
      const queryKey = financialReadKey(key, propertyId);
      await client.cancelQueries({ queryKey, exact: true });
      const row = await client.fetchQuery<{ evidence_metadata?: unknown } | null>({
        queryKey,
        queryFn: () => loaders[section](propertyId),
        staleTime: 0,
        retry: false,
      });
      if (!current()) return;
      if (!row || !evidenceEqual(row.evidence_metadata, next)) throw Error("Read differs");
      setBaseline(null);
      setDraft(null);
      setStatus(
        "Evidence saved and reloaded. Financial amounts and assessment declarations are unchanged.",
      );
    } catch (error) {
      if (!current()) return;
      const outcome = error instanceof RevisionWriteError ? error.outcome : "uncertain";
      setLocked(acknowledged || outcome === "uncertain" || outcome === "conflict");
      setStatus(
        acknowledged
          ? "Evidence save acknowledged, but fresh confirmation is unavailable or differs. Your draft is retained. Review saved sources before reopening."
          : outcome === "conflict"
            ? "This property changed or is unavailable. Your complete evidence draft is retained. Discard and reload to start again."
            : outcome === "uncertain"
              ? "Save outcome unknown. Your draft is retained. Review saved sources; this read cannot prove whether the attempt committed. Do not retry."
              : "Evidence was not saved. Your draft is retained; review the source before trying again.",
      );
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  }
  if (!ownerMatches)
    return (
      <p role="status">
        Evidence unavailable for this account while saved property ownership is loading.
      </p>
    );
  const row = baseline ? snapshotSection(baseline, section) : record;
  return (
    <div className="space-y-3">
      <EvidenceFields
        section={section}
        values={(row ?? {}) as Record<string, unknown>}
        metadata={draft ?? row?.evidence_metadata}
        disabled={busy || locked || blocked}
        onChange={baseline ? (next) => void save(next) : undefined}
        actionLabel="Save evidence"
        estimateContext={{
          purchasePrice: savedReads.acquisition.data?.purchase_price ?? null,
          financing: savedReads.financing.data ?? null,
          available:
            !savedReads.acquisition.isFetching &&
            !savedReads.acquisition.isError &&
            !savedReads.financing.isFetching &&
            !savedReads.financing.isError,
        }}
      />
      <p role="status" className="text-sm">
        {status}
      </p>
      <div className="flex flex-wrap gap-2">
        {!baseline ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy || blocked || !record}
            onClick={() => void open()}
          >
            Review / edit sources
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setBaseline(null);
                setDraft(null);
                setStatus("Evidence draft discarded.");
              }}
            >
              Discard evidence draft
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                const generation = lifetime.generation;
                try {
                  const snapshot = await getPropertySnapshot(propertyId, owner);
                  if (generation !== lifetime.generation) return;
                  const saved = snapshotSection(snapshot, section);
                  setReviewed(saved as Record<string, unknown> | null);
                  setStatus(
                    "Saved sources loaded for review. Your original draft is retained. This read cannot confirm an uncertain save.",
                  );
                } catch {
                  if (generation === lifetime.generation)
                    setStatus("Evidence unavailable. Your draft is retained.");
                }
              }}
            >
              Review saved sources
            </Button>
            {locked && !blocked ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => void open()}>
                Discard and reload sources
              </Button>
            ) : null}
          </>
        )}
      </div>
      {reviewed ? (
        <EvidenceFields
          section={section}
          values={reviewed}
          metadata={reviewed["evidence_metadata"]}
        />
      ) : null}
      {!record ? (
        <p className="text-xs text-muted-foreground">Enter and save the section's inputs first.</p>
      ) : null}
    </div>
  );
}
