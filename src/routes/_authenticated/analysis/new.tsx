import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderSection } from "@/components/common/PlaceholderSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/analysis/new")({
  head: () => ({
    meta: [
      { title: "New Property Analysis — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Enter a Malaysian rental property's details and purchase assumptions to start an analysis.",
      },
      { property: "og:title", content: "New Property Analysis — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Capture property details and financing assumptions for a new investment analysis.",
      },
    ],
  }),
  component: NewAnalysisPage,
});

const STATES = [
  "Kuala Lumpur",
  "Selangor",
  "Penang",
  "Johor",
  "Melaka",
  "Negeri Sembilan",
  "Perak",
  "Sabah",
  "Sarawak",
];

function NewAnalysisPage() {
  return (
    <AppShell
      title="New Property Analysis"
      description="Data entry shell. Nothing is saved or calculated yet."
      actions={
        <Button disabled>Save analysis (not enabled yet)</Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="name" label="Property name" placeholder="e.g. Residensi Sentral Suite" />
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field id="address" label="Address" placeholder="Street, area" />
              <Field id="type" label="Property type" placeholder="Condominium, Terrace…" />
              <Field id="size" label="Built-up size (sq ft)" placeholder="1,050" />
              <Field id="bedrooms" label="Bedrooms" placeholder="3" />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <Field id="price" label="Purchase price (RM)" placeholder="780,000" />
              <Field id="deposit" label="Deposit (%)" placeholder="10" />
              <Field id="rate" label="Loan interest rate (%)" placeholder="4.10" />
              <Field id="tenure" label="Loan tenure (years)" placeholder="30" />
              <Field id="rent" label="Expected monthly rent (RM)" placeholder="2,800" />
              <Field id="vacancy" label="Vacancy assumption (%)" placeholder="8" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PlaceholderSection
            title="Live Analysis Preview"
            items={["Yield preview", "Cash flow preview", "Investment score preview"]}
          />
          <PlaceholderSection
            title="Data Enrichment"
            items={["Listing import", "Location intelligence", "Market comparables"]}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Field({ id, label, placeholder }: { id: string; label: string; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} />
    </div>
  );
}
