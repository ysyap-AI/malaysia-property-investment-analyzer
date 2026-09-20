import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ANALYSIS_STATUSES,
  FURNISHING_STATUSES,
  MALAYSIAN_STATES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  RENT_VERIFICATION_STATUSES,
  TENURES,
  TITLE_TYPES,
  UNIT_CONDITIONS,
  emptyPropertyForm,
  propertySchema,
  type PropertyFormValues,
  type PropertyInput,
} from "@/lib/property/property-fields";

const BLANK_OPTION = "__blank__";

type Errors = Partial<Record<keyof PropertyFormValues, string>>;

export function PropertyForm({
  initialValues,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initialValues?: PropertyFormValues;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: PropertyInput) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<PropertyFormValues>(initialValues ?? emptyPropertyForm);
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = propertySchema.safeParse(values);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof PropertyFormValues;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  const text = (key: keyof PropertyFormValues) => String(values[key] ?? "");

  const field = (
    key: keyof PropertyFormValues,
    label: string,
    opts: { placeholder?: string; hint?: string; inputMode?: "numeric" | "decimal" } = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={text(key)}
        placeholder={opts.placeholder ?? "Leave blank if unknown"}
        {...(opts.inputMode ? { inputMode: opts.inputMode } : {})}
        onChange={(e) => set(key, e.target.value as PropertyFormValues[typeof key])}
      />
      {errors[key] ? (
        <p className="text-xs text-destructive">{errors[key]}</p>
      ) : opts.hint ? (
        <p className="text-xs text-muted-foreground">{opts.hint}</p>
      ) : null}
    </div>
  );

  const select = (
    key: keyof PropertyFormValues,
    label: string,
    options: readonly { value: string; label: string }[],
    opts: { allowBlank?: boolean; hint?: string } = {},
  ) => {
    const allowBlank = opts.allowBlank ?? true;
    const current = text(key);
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Select
          value={current === "" ? BLANK_OPTION : current}
          onValueChange={(v) =>
            set(key, (v === BLANK_OPTION ? "" : v) as PropertyFormValues[typeof key])
          }
        >
          <SelectTrigger id={key}>
            <SelectValue placeholder="Not known yet" />
          </SelectTrigger>
          <SelectContent>
            {allowBlank ? <SelectItem value={BLANK_OPTION}>Missing / Not Verified</SelectItem> : null}
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors[key] ? (
          <p className="text-xs text-destructive">{errors[key]}</p>
        ) : opts.hint ? (
          <p className="text-xs text-muted-foreground">{opts.hint}</p>
        ) : null}
      </div>
    );
  };

  const plain = (items: readonly string[]) => items.map((i) => ({ value: i, label: i }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section
        title="1. Identification"
        description="What the property is called and who built it."
      >
        {field("project_name", "Project name *", { placeholder: "e.g. Residensi Sentral Suite" })}
        {field("developer", "Developer")}
        {field("completion_year", "Completion year", { inputMode: "numeric" })}
        {field("listing_url", "Listing link")}
      </Section>

      <Section title="2. Location" description="Address details only. No maps or lookups are used.">
        {field("full_address", "Full address")}
        {field("postcode", "Postcode", { placeholder: "50470", inputMode: "numeric" })}
        {field("city", "City")}
        {field("district", "District")}
        {select("state", "State", plain(MALAYSIAN_STATES))}
        {field("country", "Country")}
      </Section>

      <Section title="3. Property & title" description="Type of property and how it is held.">
        {select("property_type", "Property type", plain(PROPERTY_TYPES))}
        {select("title_type", "Title type", plain(TITLE_TYPES))}
        {select("tenure", "Tenure", TENURES)}
        {field("lease_expiry_year", "Lease expiry year", {
          inputMode: "numeric",
          hint: "Leasehold only. Leave blank if freehold or unknown.",
        })}
      </Section>

      <Section title="4. Unit details" description="Physical facts about the unit.">
        {field("built_up_sqft", "Built-up size (sq ft)", { inputMode: "decimal" })}
        {field("bedrooms", "Bedrooms", { inputMode: "numeric" })}
        {field("bathrooms", "Bathrooms", { inputMode: "numeric" })}
        {field("car_parks", "Car parks", { inputMode: "numeric" })}
        {field("floor_level", "Floor level", { placeholder: "e.g. 12 or Ground" })}
        {field("total_floors", "Total floors in building", { inputMode: "numeric" })}
        {select("furnishing_status", "Furnishing status", plain(FURNISHING_STATUSES))}
        {select("unit_condition", "Unit condition", plain(UNIT_CONDITIONS))}
      </Section>

      <Section
        title="5. Price & rent inputs"
        description="Figures are stored exactly as entered. Nothing is calculated in this phase, and a blank stays Missing / Not Verified."
      >
        {field("asking_price", "Asking price (RM)", {
          inputMode: "decimal",
          hint: "An asking price is not a confirmed transaction.",
        })}
        {field("target_purchase_price", "Target purchase price (RM)", { inputMode: "decimal" })}
        {field("bank_valuation", "Bank valuation (RM)", { inputMode: "decimal" })}
        {field("expected_monthly_rent", "Expected monthly rent (RM)", { inputMode: "decimal" })}
        {select("rent_verification_status", "Rent evidence", RENT_VERIFICATION_STATUSES, {
          allowBlank: false,
          hint: "How the rent figure was obtained.",
        })}
      </Section>

      <Section title="6. Workflow" description="Where this property sits in your process.">
        {select("property_status", "Property status", PROPERTY_STATUSES, { allowBlank: false })}
        {select("analysis_status", "Analysis status", ANALYSIS_STATUSES, { allowBlank: false })}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={4}
            value={text("notes")}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything you want to remember about this property."
          />
        </div>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</CardContent>
    </Card>
  );
}
