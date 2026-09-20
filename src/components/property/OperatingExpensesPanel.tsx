// Display + entry surface for operating expenses.
// This component contains NO financial formula: the total and the
// monthly -> annual conversion come from src/lib/finance/operating-expenses.ts.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateTotalAnnualOperatingExpenses,
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
  annualiseInput,
  defaultOperatingExpenseBases,
  emptyOperatingExpenseForm,
  operatingExpenseRecordToForm,
  operatingExpensesSchema,
  type EntryBasis,
  type OperatingExpenseBases,
  type OperatingExpensesFormValues,
} from "@/lib/property/operating-expense-fields";
import { displayMoney } from "@/lib/property/property-fields";

type Errors = Partial<Record<OperatingExpenseField, string>>;

export function OperatingExpensesPanel({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<OperatingExpensesFormValues>(emptyOperatingExpenseForm);
  const [bases, setBases] = useState<OperatingExpenseBases>(defaultOperatingExpenseBases);
  const [errors, setErrors] = useState<Errors>({});

  const { data: record, isLoading, error } = useQuery({
    queryKey: operatingExpenseKeys.detail(propertyId),
    queryFn: () => getOperatingExpenses(propertyId),
  });

  useEffect(() => {
    setValues(operatingExpenseRecordToForm(record));
    setBases(defaultOperatingExpenseBases);
  }, [record]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = operatingExpensesSchema.safeParse(values);
      if (!parsed.success) {
        const next: Errors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as OperatingExpenseField;
          if (key && !next[key]) next[key] = issue.message;
        }
        setErrors(next);
        throw new Error("Please correct the highlighted amounts.");
      }
      setErrors({});
      // Monthly entries are converted to annual explicitly before storing.
      return saveOperatingExpenses(propertyId, annualiseInput(parsed.data, bases));
    },
    onSuccess: async () => {
      toast.success("Operating expenses saved");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: operatingExpenseKeys.detail(propertyId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stored = operatingExpenseRecordToForm(record);
  const storedNumbers = Object.fromEntries(
    Object.entries(stored).map(([k, v]) => [k, v === "" ? null : Number(v)]),
  ) as Record<OperatingExpenseField, number | null>;
  const result = calculateTotalAnnualOperatingExpenses(storedNumbers);

  function previewAnnual(field: OperatingExpenseField): string | null {
    if (bases[field] !== "monthly") return null;
    const raw = String(values[field] ?? "").trim().replace(/,/g, "");
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return displayMoney(monthlyToAnnual(n));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Total Annual Operating Expenses</CardTitle>
            <CardDescription>
              Every amount is stored per year. Unknown expenses are left out of the total, never
              counted as zero — an entered 0 means a confirmed "no such expense".
            </CardDescription>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)} disabled={isLoading}>
              {record ? "Edit expenses" : "Enter expenses"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
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
              {result.missingFields.length === 1 ? " is" : "s are"} still Missing / Not Verified, so
              the real total will be higher.
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
        </CardContent>
      </Card>

      {OPERATING_EXPENSE_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent
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
                    onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {(["annual", "monthly"] as EntryBasis[]).map((basis) => (
                      <button
                        key={basis}
                        type="button"
                        onClick={() => setBases((prev) => ({ ...prev, [field]: basis }))}
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
                    <p className="text-xs text-destructive">{errors[field]}</p>
                  ) : null}
                </div>
              ) : (
                <div
                  key={field}
                  className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">{OPERATING_EXPENSE_LABELS[field]}</span>
                  {storedNumbers[field] === null ? (
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

      {editing ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save operating expenses"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setValues(operatingExpenseRecordToForm(record));
              setBases(defaultOperatingExpenseBases);
              setErrors({});
              setEditing(false);
            }}
            disabled={save.isPending}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}
