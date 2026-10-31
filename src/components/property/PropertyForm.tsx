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
  recordToForm,
  propertyFormPatch,
  propertySchema,
  propertyUpdateFormSchema,
  type PropertyFormValues,
  type PropertyInput,
  type PropertyPatch,
  type PropertyRecord,
} from "@/lib/property/property-fields";
import {
  isPropertyTextField,
  measurePropertyText,
  PROPERTY_SCALAR_LIMITS,
} from "@/lib/property/property-save-policy";

const BLANK_OPTION = "__blank__";

type Errors = Partial<Record<keyof PropertyFormValues, string>>;

type PropertyFormProps = {
  submitLabel: string;
  busy?: boolean;
  onCancel?: () => void;
} & (
  | {
      originalProperty: PropertyRecord;
      initialValues?: never;
      onSubmit: (values: PropertyPatch, original: PropertyRecord) => void;
    }
  | {
      originalProperty?: never;
      initialValues?: PropertyFormValues;
      onSubmit: (values: PropertyInput) => void;
    }
);

export function PropertyForm(props: PropertyFormProps) {
  const { submitLabel, busy, onCancel } = props;
  // Background query refreshes must never replace the baseline of an open draft.
  const [original] = useState(() =>
    props.originalProperty ? Object.freeze({ ...props.originalProperty }) : undefined,
  );
  const [initial] = useState<PropertyFormValues>(() =>
    original ? recordToForm(original) : { ...(props.initialValues ?? emptyPropertyForm) },
  );
  const [values, setValues] = useState<PropertyFormValues>(initial);
  const [modified, setModified] = useState<ReadonlySet<keyof PropertyFormValues>>(() => new Set());
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setModified((prev) => new Set([...prev, key]));
    const result = propertySchema.shape[key].safeParse(value);
    setErrors((prev) => {
      const next = { ...prev };
      if (result.success || (original && Object.is(value, initial[key]))) delete next[key];
      else next[key] = result.error.issues[0]?.message ?? "Invalid value";
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const patch = propertyFormPatch(values, initial, modified);
    const result = props.originalProperty
      ? propertyUpdateFormSchema.safeParse(patch)
      : propertySchema.safeParse(values);
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
    if (props.originalProperty && original) {
      if (Object.keys(patch).length > 0) props.onSubmit(result.data, original);
    } else if (!props.originalProperty) {
      // Parse separately to keep creation's required-field type distinct from PATCH.
      props.onSubmit(propertySchema.parse(values));
    }
  }

  const text = (key: keyof PropertyFormValues) => String(values[key] ?? "");

  const feedback = (key: keyof PropertyFormValues, hint?: string) => {
    const raw = text(key);
    const preserved = original && !Object.hasOwn(propertyFormPatch(values, initial, modified), key);
    const measured = measurePropertyText(preserved ? raw : raw.trim());
    return (
      <>
        {isPropertyTextField(key) ? (
          <p id={`${key}-counter`} className="text-xs text-muted-foreground" aria-live="polite">
            {measured.error === "INVALID_UNICODE"
              ? "Invalid Unicode"
              : `${measured.count} / ${PROPERTY_SCALAR_LIMITS[key]} Unicode characters`}
            {preserved
              ? ". Existing value is preserved until changed."
              : ". Count after trimming; blank optional text saves as Missing / Not Verified."}
          </p>
        ) : null}
        {errors[key] ? (
          <p id={`${key}-error`} role="alert" className="text-xs text-destructive">
            {errors[key]}
          </p>
        ) : hint ? (
          <p id={`${key}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </>
    );
  };

  const describedBy = (key: keyof PropertyFormValues, hint?: string) =>
    [
      isPropertyTextField(key) ? `${key}-counter` : null,
      errors[key] ? `${key}-error` : hint ? `${key}-hint` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

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
        aria-invalid={Boolean(errors[key])}
        aria-describedby={describedBy(key, opts.hint)}
        placeholder={opts.placeholder ?? "Leave blank if unknown"}
        {...(opts.inputMode ? { inputMode: opts.inputMode } : {})}
        onChange={(e) => set(key, e.target.value as PropertyFormValues[typeof key])}
      />
      {feedback(key, opts.hint)}
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
    // An old stored value can equal our UI sentinel; keep its display distinct.
    const blankOption = current === BLANK_OPTION ? `${BLANK_OPTION}_option` : BLANK_OPTION;
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Select
          value={current === "" ? blankOption : current}
          onValueChange={(v) =>
            set(key, (v === blankOption ? "" : v) as PropertyFormValues[typeof key])
          }
        >
          <SelectTrigger
            id={key}
            aria-invalid={Boolean(errors[key])}
            aria-describedby={describedBy(key, opts.hint)}
          >
            <SelectValue placeholder="Not known yet" />
          </SelectTrigger>
          <SelectContent>
            {allowBlank ? (
              <SelectItem value={blankOption}>Missing / Not Verified</SelectItem>
            ) : null}
            {current && !options.some((o) => o.value === current) ? (
              <SelectItem value={current} disabled>
                {current} (existing value; choose a listed replacement)
              </SelectItem>
            ) : null}
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {feedback(key, opts.hint)}
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
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={describedBy("notes")}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything you want to remember about this property."
          />
          {feedback("notes")}
        </div>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={
            busy ||
            Boolean(
              original && Object.keys(propertyFormPatch(values, initial, modified)).length === 0,
            )
          }
        >
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
