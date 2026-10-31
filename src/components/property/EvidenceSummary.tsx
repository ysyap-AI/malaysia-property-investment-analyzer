import { useInvestmentEvidence } from "@/hooks/use-investment-evidence";
import { useSavedDraftObservations } from "@/hooks/use-saved-draft-disclosure";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EVIDENCE_FIELDS,
  evidenceStatus,
  parseEvidence,
  type EvidenceSection,
  type SectionEvidence,
} from "@/lib/property/investment-evidence";
import { currentEstimateInputs } from "@/lib/property/evidence-draft-values";
import { evidenceLabel, evidenceValue } from "@/lib/property/evidence-draft-values";
export function EvidenceSummary({
  propertyId,
  onReview,
}: {
  propertyId: string;
  onReview: (section: EvidenceSection, field: string) => void;
}) {
  const { savedReads: reads, ownerMatches } = useInvestmentEvidence(propertyId);
  const drafts = useSavedDraftObservations();
  if (!ownerMatches)
    return (
      <p role="status">
        Evidence &amp; assumptions unavailable for this account while saved ownership is loading.
      </p>
    );
  const sections = {
    properties: reads.property,
    acquisition_costs: reads.acquisition,
    financing: reads.financing,
    operating_expenses: reads.expenses,
  };
  const important = new Set([
    "expected_monthly_rent",
    "purchase_price",
    "bank_valuation",
    "annual_interest_rate_percent",
    "loan_tenure_years",
    "loan_amount",
    "annual_maintenance_fee",
  ]);
  const rows = (
    Object.entries(sections) as [
      EvidenceSection,
      (
        | typeof reads.property
        | typeof reads.acquisition
        | typeof reads.financing
        | typeof reads.expenses
      ),
    ][]
  ).flatMap(([section, read]) => {
    const record = read.data as Record<string, unknown> | null | undefined;
    let evidence: SectionEvidence | null = null;
    try {
      evidence = parseEvidence(section, record?.["evidence_metadata"]);
    } catch {
      /* status below exposes malformed evidence */
    }
    return EVIDENCE_FIELDS[section]
      .filter((field) => important.has(field) || record?.[field] != null || evidence?.fields[field])
      .map((field) => {
        const entry = evidence?.fields[field];
        const status =
          read.isError || read.isFetching || read.isPending
            ? "Evidence unavailable - saved read incomplete"
            : evidenceStatus(
                section,
                field,
                record?.[field],
                record?.["evidence_metadata"],
                undefined,
                currentEstimateInputs(entry, {
                  purchasePrice: reads.acquisition.data?.purchase_price ?? null,
                  financing: reads.financing.data ?? null,
                  available:
                    !reads.acquisition.isError &&
                    !reads.acquisition.isFetching &&
                    !reads.financing.isError &&
                    !reads.financing.isFetching,
                }),
              );
        return { section, field, value: record?.[field], status, entry };
      });
  });
  const reminders = rows.filter((row) =>
    /missing|not recorded|review|unavailable/i.test(row.status),
  );
  return (
    <Card className="mb-6" aria-label="Evidence and assumptions summary">
      <CardHeader>
        <CardTitle className="text-base">Evidence &amp; assumptions</CardTitle>
        <CardDescription>
          Evidence supports saved inputs. It does not change investment scores, confidence, risk
          checks or recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          {reminders.length
            ? `${reminders.length} input${reminders.length === 1 ? " needs" : "s need"} evidence or review.`
            : "Recorded sources are available for the entered inputs."}{" "}
          Calculation inputs complete and evidence still missing can appear together.
        </p>
        {Object.values(drafts).includes("open") ? (
          <p role="status">
            An input or evidence draft is open. This summary shows saved records only.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Actual - checked by you means your own record check; MPIA has not authenticated it.
          Existing confidence uses recorded assessment declarations and numerical completeness, and
          does not independently verify these sources. Market/finance observations prompt review
          after 90 days; recurring expenses after 365 days. These reminders never change saved
          amounts.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows
            .filter((r) => important.has(r.field))
            .map((row) => (
              <div key={row.section + row.field} className="space-y-1 rounded-md border p-3">
                <p className="font-medium">
                  {evidenceLabel(row.field)}: {evidenceValue(row.value)}
                </p>
                <p className="text-xs">{row.status}</p>
                {row.entry ? (
                  <p className="text-xs text-muted-foreground">
                    {row.entry.sourceLabel || "Investor assumption"} /{" "}
                    {row.entry.observedOn || "Date unknown"}
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="link"
                  className="h-auto px-0"
                  onClick={() => onReview(row.section, row.field)}
                >
                  Review sources
                </Button>
              </div>
            ))}
        </div>
        {reminders.some((r) => !important.has(r.field)) ? (
          <details>
            <summary className="cursor-pointer text-primary">Other inputs needing review</summary>
            <ul className="mt-2 space-y-2">
              {reminders
                .filter((r) => !important.has(r.field))
                .map((r) => (
                  <li key={r.section + r.field}>
                    {evidenceLabel(r.field)}: {r.status}{" "}
                    <Button variant="link" size="sm" onClick={() => onReview(r.section, r.field)}>
                      Review sources
                    </Button>
                  </li>
                ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
