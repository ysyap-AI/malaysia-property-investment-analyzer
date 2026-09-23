// Display + entry surface for financing. Contains NO formula: every figure
// comes from src/lib/finance/financing.ts.
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  buildFinancingRow,
  emptyFinancingForm,
  financingRecordToForm,
  financingSchema,
  type FinancingFormValues,
} from "@/lib/property/financing-fields";
import { displayMoney } from "@/lib/property/property-fields";

type Errors = Partial<Record<keyof FinancingFormValues, string>>;

export function FinancingPanel({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<FinancingFormValues>(emptyFinancingForm);
  const [errors, setErrors] = useState<Errors>({});

  const { data: record, isLoading, error } = useQuery({
    queryKey: financingKeys.detail(propertyId),
    queryFn: () => getFinancing(propertyId),
  });
  const { data: acquisition } = useQuery({
    queryKey: acquisitionKeys.detail(propertyId),
    queryFn: () => getAcquisitionCosts(propertyId),
  });
  const purchasePrice = acquisition?.purchase_price ?? null;

  useEffect(() => setValues(financingRecordToForm(record)), [record]);

  // Live preview while editing, stored values otherwise — both via the engine.
  const parsed = financingSchema.safeParse(editing ? values : financingRecordToForm(record));
  const result = parsed.success
    ? calculateFinancing({ ...parsed.data, purchase_price: purchasePrice })
    : null;

  const save = useMutation({
    mutationFn: async () => {
      const p = financingSchema.safeParse(values);
      if (!p.success) {
        const next: Errors = {};
        for (const issue of p.error.issues) {
          const key = issue.path[0] as keyof FinancingFormValues;
          if (key && !next[key]) next[key] = issue.message;
        }
        setErrors(next);
        throw new Error("Please correct the highlighted fields.");
      }
      setErrors({});
      return saveFinancing(propertyId, buildFinancingRow(p.data, purchasePrice));
    },
    onSuccess: async () => {
      toast.success("Financing saved");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: financingKeys.detail(propertyId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof FinancingFormValues, v: string | boolean) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const money = (v: number | null | undefined) =>
    v === null || v === undefined ? <StatusBadge status="missing" /> : <span>{displayMoney(v)}</span>;

  const inUse = result?.instalmentInUse;
  const numField = (k: keyof FinancingFormValues, label: string, hint?: string) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        inputMode="decimal"
        placeholder={hint ?? "Leave blank if unknown"}
        value={String(values[k])}
        onChange={(e) => set(k, e.target.value)}
      />
      {errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Financing</CardTitle>
          <CardDescription>
            Loan details and monthly instalment. The calculated instalment and any bank-quoted
            instalment are kept separately.
          </CardDescription>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} disabled={isLoading}>
            {record ? "Edit financing" : "Enter financing"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Instalment in use</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold text-foreground">
              {inUse?.amount != null ? displayMoney(inUse.amount) : "Missing / Not Verified"}
            </span>
            {inUse?.source === "user-provided" ? (
              <StatusBadge status={values.bank_quote_verified ? "verified" : "user-entered"} />
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
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Purchase price (from acquisition costs)">{money(purchasePrice)}</Row>
          <Row label="Loan amount">
            {money(result?.loanAmount)}
            {result?.loanAmountSource === "from-ltv" ? (
              <span className="ml-2 text-xs text-muted-foreground">from loan-to-value</span>
            ) : null}
          </Row>
          <Row label="Down payment">{money(result?.downPayment)}</Row>
          <Row label="Calculated monthly instalment">{money(result?.calculatedMonthlyInstalment)}</Row>
          <Row label="Bank-quoted monthly instalment">
            {money(parsed.success ? parsed.data.user_provided_monthly_instalment : null)}
          </Row>
          <Row label="Annual debt service">{money(result?.annualDebtService)}</Row>
        </dl>

        {editing ? (
          <div className="space-y-6 border-t border-border pt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {numField("loan_to_value_percent", "Loan-to-value (%)", "e.g. 90")}
              {numField(
                "loan_amount",
                "Loan amount (RM) — only if loan-to-value is blank",
              )}
              {numField("annual_interest_rate_percent", "Annual interest rate (%)", "e.g. 4.25")}
              {numField("loan_tenure_years", "Loan tenure (years)", "e.g. 35")}
              <div className="space-y-2">
                <Label htmlFor="loan_type">Loan type</Label>
                <select
                  id="loan_type"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Bank quote (optional)</p>
              <div className="grid gap-4 md:grid-cols-2">
                {numField("user_provided_monthly_instalment", "Bank-quoted monthly instalment (RM)")}
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={values.use_user_provided_instalment}
                  onCheckedChange={(c) => set("use_user_provided_instalment", c)}
                />
                Use the bank-quoted instalment instead of the calculated one
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={values.bank_quote_verified}
                  onCheckedChange={(c) => set("bank_quote_verified", c)}
                />
                I have a written quote from the bank (marks it Verified)
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="financing_notes">Financing notes</Label>
              <Textarea
                id="financing_notes"
                value={values.financing_notes}
                onChange={(e) => set("financing_notes", e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save financing"}
              </Button>
              <Button
                variant="outline"
                disabled={save.isPending}
                onClick={() => {
                  setValues(financingRecordToForm(record));
                  setErrors({});
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
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
