import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { useFinancialConfirmation } from "@/hooks/use-financial-confirmation";
import { useSavedDraftObservations } from "@/hooks/use-saved-draft-disclosure";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { calculateTotalAnnualOperatingExpenses } from "@/lib/finance/operating-expenses";
import { calculateFinancing } from "@/lib/finance/financing";
import { parentConfirmationKey, type ParentConfirmation } from "@/lib/property/property-edit";
import { savedWriteDescription } from "@/lib/property/saved-analysis-presentation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SavedAnalysisOverview({
  propertyId,
  onReview,
}: {
  propertyId: string;
  onReview: (section: "property" | "financials" | "acquisition" | "financing" | "expenses") => void;
}) {
  const { user } = useAuth();
  const { availability, savedReads: reads } = usePropertyAnalysis(propertyId);
  const writes = useFinancialConfirmation(user?.id ?? null, propertyId);
  const parent = useQuery<ParentConfirmation>({
    queryKey: parentConfirmationKey(user?.id ?? null, propertyId),
    enabled: false,
  }).data;
  const drafts = useSavedDraftObservations();
  const acquisition = reads.acquisition.data
    ? calculateTotalAcquisitionCost(reads.acquisition.data)
    : null;
  const expenses = reads.expenses.data
    ? calculateTotalAnnualOperatingExpenses(reads.expenses.data)
    : null;
  const financing = reads.financing.data
    ? calculateFinancing({
        ...reads.financing.data,
        purchase_price: reads.acquisition.data?.purchase_price ?? null,
      })
    : null;
  const costs = (result: typeof acquisition | typeof expenses) =>
    result?.status === "complete"
      ? "Calculation inputs complete."
      : result?.status === "invalid"
        ? "Invalid saved cost inputs; complete total withheld."
        : "Incomplete cost inputs; any known subtotal is partial. Complete total withheld.";
  const rows = [
    {
      key: "property",
      label: "Property information",
      read: reads.property,
      outcome: parent?.outcome,
      completeness: `${reads.property.data?.expected_monthly_rent == null ? "Expected monthly rent not entered. " : ""}${reads.property.data?.target_purchase_price == null ? "Target purchase price not entered. " : ""}Review price, rent and rent evidence in Details; financial sections save separately.`,
    },
    {
      key: "acquisition",
      label: "Acquisition costs",
      read: reads.acquisition,
      outcome: writes.acquisition?.outcome,
      completeness: costs(acquisition),
    },
    {
      key: "financing",
      label: "Financing information",
      read: reads.financing,
      outcome: writes.financing?.outcome,
      completeness:
        financing?.annualDebtService !== null &&
        financing?.annualDebtService !== undefined &&
        financing.downPayment !== null
          ? "Debt-service and down-payment calculations available from saved assumptions."
          : "Missing or invalid financing inputs. Missing financing does not establish a cash purchase.",
    },
    {
      key: "expenses",
      label: "Operating expenses",
      read: reads.expenses,
      outcome: writes.expenses?.outcome,
      completeness: costs(expenses),
    },
  ] as const;
  return (
    <Card className="my-4" aria-label="Saved analysis and completion">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Saved analysis and completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Start with Property Details, then save Acquisition Costs → Financing → Operating Expenses. Review Evidence → Summary and Scenarios → Strategies. Each section has its own save action.</p>
        <p className="text-xs text-muted-foreground">Enter the agreed acquisition purchase price separately; the target price is a negotiation input. M3 loan-fee estimates may need saved financing: save the loan terms, then return to Acquisition Costs to review and apply the estimates.</p>
        <p role="status">
          {availability.current
            ? "Saved reads qualified for assessment. Missing or invalid inputs still withhold dependent results."
            : `Current assessment unavailable. ${availability.reason}`}
        </p>
        <p className="text-xs text-muted-foreground">Calculation completeness does not establish evidence. Review the Evidence &amp; assumptions card in Summary for source records and reminders.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ key, label, read, outcome, completeness }) => (
            <div
              key={key}
              className="min-w-0 space-y-1 rounded-md border p-3"
              aria-label={`${label} completion`}
            >
              <dt className="font-semibold">{label}</dt>
              <dd className="break-words">
                {read.isError
                  ? "Saved read failed; current information unavailable."
                  : read.isPending || read.isFetching || read.fetchStatus !== "idle"
                    ? "Saved information is loading or refreshing."
                    : !read.data
                      ? "No saved section entered."
                      : availability.current
                        ? "Saved information loaded."
                        : "Last-known saved information; current assessment withheld."}
                {read.data ? ` ${completeness}` : ""}
              </dd>
              <dd><Button variant="link" size="sm" className="h-auto px-0" onClick={() => onReview(key)}>Open {label}</Button></dd>
              {savedWriteDescription(outcome) ? <dd>{savedWriteDescription(outcome)}</dd> : null}
              <dd className="text-xs text-muted-foreground">
                {key === "property"
                  ? "Property editor is not observed here."
                  : drafts[key] === "open"
                    ? "Open unsaved draft. Saved analysis excludes these draft edits."
                    : drafts[key] === "closed"
                      ? "Mounted editor: no open unsaved draft observed."
                      : "Editor not observed here; draft state unknown."}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Review next:{" "}
          {rows.find(
            (r) => r.outcome && !["idle", "saved", "rejected", "not-sent"].includes(r.outcome),
          )?.label ??
            rows.find(
              (r) =>
                r.read.isError ||
                r.read.isPending ||
                r.read.isFetching ||
                r.read.fetchStatus !== "idle",
            )?.label ??
            (!reads.acquisition.data || acquisition?.status !== "complete"
              ? "Acquisition costs"
              : !reads.financing.data ||
                  financing?.annualDebtService === null ||
                  financing?.downPayment === null
                ? "Financing"
                : expenses?.status !== "complete"
                  ? "Operating expenses"
                  : "Property rent evidence and saved assumptions")}
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onReview("property")}>
            Review property information
          </Button>
          <Button variant="outline" onClick={() => onReview("financials")}>
            Review financial sections
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each section saves independently. Saving property information does not save acquisition
          costs, financing or expenses. Completed calculations and successful reads do not
          independently verify market evidence. The five-state financial recommendation is separate
          from each strategy’s target suitability.
        </p>
      </CardContent>
    </Card>
  );
}
