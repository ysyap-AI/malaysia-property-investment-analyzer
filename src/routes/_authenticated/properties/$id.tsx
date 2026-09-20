import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/common/MetricCard";
import { PlaceholderSection } from "@/components/common/PlaceholderSection";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findPlaceholderProperty } from "@/lib/placeholder-data";

export const Route = createFileRoute("/_authenticated/properties/$id")({
  head: () => ({
    meta: [
      { title: "Property Details — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content:
          "Property record with inputs, data provenance and reserved space for financial analysis and scoring.",
      },
      { property: "og:title", content: "Property Details — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Review a single Malaysian rental property record and its data confidence.",
      },
    ],
  }),
  component: PropertyDetailsPage,
});

function PropertyDetailsPage() {
  const { id } = useParams({ from: "/_authenticated/properties/$id" });
  const property = findPlaceholderProperty(id);

  return (
    <AppShell
      title={property?.name ?? "Property"}
      description={property ? `${property.location} · ${property.propertyType}` : `Record ${id}`}
      actions={
        <Button asChild variant="outline">
          <Link to="/properties">
            <ArrowLeft className="size-4" /> Back to properties
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Asking Price"
          value={property?.askingPrice ?? null}
          status={property ? property.status : "missing"}
        />
        <MetricCard label="Gross Yield" status="missing" hint="Awaiting calculation engine" />
        <MetricCard label="Monthly Cash Flow" status="missing" hint="Awaiting calculation engine" />
        <MetricCard label="Investment Score" status="missing" hint="Awaiting scoring engine" />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="State" value={property?.state ?? "Missing / Not Verified"} />
              <Row label="Property Type" value={property?.propertyType ?? "Missing / Not Verified"} />
              <Row label="Built-up Size" value="Missing / Not Verified" />
              <Row label="Tenure" value="Missing / Not Verified" />
              <div className="flex items-center justify-between gap-4 pt-2">
                <span className="text-muted-foreground">Overall data status</span>
                <StatusBadge status={property?.status ?? "missing"} />
              </div>
            </CardContent>
          </Card>
          <PlaceholderSection
            title="Location Intelligence"
            items={["Amenity proximity", "Transit access", "Neighbourhood profile"]}
          />
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <PlaceholderSection
            title="Financial Analysis"
            items={[
              "Acquisition cost breakdown",
              "Loan instalment schedule",
              "Net operating income",
              "Cash-on-cash return",
            ]}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4">
          <PlaceholderSection title="Scenario Analysis" items={["Bear case", "Base case", "Bull case"]} />
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <PlaceholderSection
            title="Risk Assessment"
            items={["Negative cash flow flag", "Break-even occupancy flag", "Over-leverage flag"]}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
