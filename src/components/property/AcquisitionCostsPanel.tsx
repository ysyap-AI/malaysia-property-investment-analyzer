// Display + entry surface for acquisition costs.
// This component contains NO financial formula: the total comes from
// src/lib/finance/acquisition.ts.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  acquisitionCostsSchema,
  acquisitionRecordToForm,
  emptyAcquisitionForm,
  type AcquisitionCostsFormValues,
} from "@/lib/property/acquisition-fields";
import { displayMoney } from "@/lib/property/property-fields";

type Errors = Partial<Record<AcquisitionCostField, string>>;

export function AcquisitionCostsPanel({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<AcquisitionCostsFormValues>(emptyAcquisitionForm);
  const [errors, setErrors] = useState<Errors>({});

  const { data: record, isLoading, error } = useQuery({
    queryKey: acquisitionKeys.detail(propertyId),
    queryFn: () => getAcquisitionCosts(propertyId),
  });

  useEffect(() => {
    setValues(acquisitionRecordToForm(record));
  }, [record]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = acquisitionCostsSchema.safeParse(values);
      if (!parsed.success) {
        const next: Errors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as AcquisitionCostField;
          if (key && !next[key]) next[key] = issue.message;
        }
        setErrors(next);
        throw new Error("Please correct the highlighted amounts.");
      }
      setErrors({});
      return saveAcquisitionCosts(propertyId, parsed.data);
    },
    onSuccess: async () => {
      toast.success("Acquisition costs saved");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: acquisitionKeys.detail(propertyId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stored = acquisitionRecordToForm(record);
  const storedNumbers = Object.fromEntries(
    Object.entries(stored).map(([k, v]) => [k, v === "" ? null : Number(v)]),
  ) as Record<AcquisitionCostField, number | null>;
  const result = calculateTotalAcquisitionCost(storedNumbers);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Total Acquisition Cost</CardTitle>
            <CardDescription>
              Purchase price plus every known acquisition cost. Unknown amounts are left out of the
              total, never counted as zero.
            </CardDescription>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)} disabled={isLoading}>
              {record ? "Edit costs" : "Enter costs"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
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
              {result.missingFields.length === 1 ? " is" : "s are"} still Missing / Not Verified, so
              the real total will be higher.
            </p>
          ) : null}
          {result.status === "complete" ? (
            <p className="text-sm text-muted-foreground">Every cost line has a recorded value.</p>
          ) : null}
        </CardContent>
      </Card>

      {ACQUISITION_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className={editing ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3 text-sm"}>
            {section.fields.map((field) =>
              editing ? (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{ACQUISITION_FIELD_LABELS[field]} (RM)</Label>
                  <Input
                    id={field}
                    inputMode="decimal"
                    placeholder="Leave blank if unknown"
                    value={String(values[field] ?? "")}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  />
                  {errors[field] ? (
                    <p className="text-xs text-destructive">{errors[field]}</p>
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
      ))}

      {editing ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save acquisition costs"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setValues(acquisitionRecordToForm(record));
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
