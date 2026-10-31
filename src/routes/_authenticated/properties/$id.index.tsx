import { SourceNavigationProvider, type SourceRequest, revealAndFocus } from "@/hooks/use-source-navigation";
import { SourcesAndAssumptions } from "@/components/property/SourcesAndAssumptions";
import { InvestmentStrategies } from "@/components/property/InvestmentStrategies";
import { EvidenceSummary } from "@/components/property/EvidenceSummary";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { SavedDraftDisclosure } from "@/hooks/use-saved-draft-disclosure";
import { SavedAnalysisOverview } from "@/components/property/SavedAnalysisOverview";
import { useAuth } from "@/hooks/use-auth";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";

import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AcquisitionCostsPanel } from "@/components/property/AcquisitionCostsPanel";
import { PropertyDeleteControl } from "@/components/property/PropertyDeleteControl";
import { OperatingExpensesPanel } from "@/components/property/OperatingExpensesPanel";
import { FinancingPanel } from "@/components/property/FinancingPanel";
import { RedFlagsPanel } from "@/components/property/RedFlagsPanel";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { PropertySummaryDashboard } from "@/components/property/PropertySummaryDashboard";
import { ScoresPanel } from "@/components/property/ScoresPanel";
import { ScenariosPanel } from "@/components/property/ScenariosPanel";
import {
  AnalysisStatusBadge,
  PropertyStatusBadge,
} from "@/components/property/PropertyStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProperty, propertyKeys } from "@/lib/property/property-api";
import {
  ANALYSIS_STATUSES,
  PROPERTY_STATUSES,
  TENURES,
  displayMoney,
  displayNumber,
  displayText,
  labelFor,
  rentStatusToDataStatus,
} from "@/lib/property/property-fields";

export const Route = createFileRoute("/_authenticated/properties/$id/")({
  head: () => ({
    meta: [
      { title: "Property Details — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content:
          "Saved property record with location, unit details, price inputs and rent evidence status.",
      },
      { property: "og:title", content: "Property Details — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Review one Malaysian rental property record and its data confidence.",
      },
    ],
  }),
  component: PropertyDetailsPage,
});

function PropertyDetailsPage() {
  const { id } = useParams({ from: "/_authenticated/properties/$id/" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const deletion = usePropertyDeletion(user?.id ?? null, id);
  const deletionBlocked = deletionBlocksProperty(deletion.outcome);
  const [tab, setTab] = useState("summary");
  const [request, setRequest] = useState<SourceRequest | null>(null);
  const [inputTarget, setInputTarget] = useState<{ id: string; sequence: number } | null>(null);
  const navigationSequence = useRef(0);
  useEffect(() => {
    if (inputTarget) revealAndFocus(document.getElementById(inputTarget.id));
  }, [tab, inputTarget]);
  function reviewInput(section: "property" | "financials" | "acquisition" | "financing" | "expenses", field?: string) {
    setTab(section === "property" ? "overview" : "financials");
    setInputTarget(field ? null : { id: section === "property" ? "property-inputs" : `inputs-${section === "financials" ? "acquisition" : section}`, sequence: ++navigationSequence.current });
    setRequest(field ? { section: "properties", field, sequence: ++navigationSequence.current } : null);
  }
  const detailsTab = useRef<HTMLButtonElement>(null);

  const { data: property, isLoading, error } = useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getProperty(id),
    enabled: !!user && !deletionBlocked,
  });

  return (
    <AppShell
      title={property?.project_name ?? "Property"}
      description={
        property
          ? [property.city, property.state].filter(Boolean).join(", ") || "Location not recorded"
          : "Loading record"
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/properties">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button asChild disabled={deletionBlocked}>
            <Link to="/properties/$id/edit" params={{ id }}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
          <PropertyDeleteControl key={JSON.stringify([user?.id, id])} id={id} property={property}
            onDeleted={() => void navigate({ to: "/properties" })} />
        </div>
      }
    >
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && !error && !property ? (
        <p className="text-sm text-muted-foreground">
          This property was not found, or it does not belong to your account.
        </p>
      ) : null}

      {property && property.user_id === user?.id && !deletionBlocked ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.property_status} />
            <AnalysisStatusBadge status={property.analysis_status} />
            <span className="text-xs text-muted-foreground">
              Recorded assessment declaration - rent: <StatusBadge status={rentStatusToDataStatus(property.rent_verification_status)} />
            </span>
          </div>

          <SavedDraftDisclosure key={JSON.stringify([user.id, id])}>
          <SourceNavigationProvider request={request}>
          <Tabs value={tab} onValueChange={(value) => { setTab(value); setRequest(null); setInputTarget(null); }} className="min-w-0 [overflow-wrap:anywhere] [&_fieldset]:min-w-0 [&_select]:min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9">
            <SavedAnalysisOverview propertyId={id} onReview={reviewInput} />
            <TabsList className="h-auto max-w-full flex-wrap justify-start">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger ref={detailsTab} value="overview">Details</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <EvidenceSummary propertyId={id} onReview={(section, field) => {
                setTab(section === "properties" ? "overview" : "financials");
                setRequest({ section, field, sequence: ++navigationSequence.current });
              }} />
              <PropertySummaryDashboard propertyId={id} />
            </TabsContent>

            <TabsContent value="overview" className="mt-4 grid gap-6 xl:grid-cols-2">
              <Block title="Identification">
                <Row label="Project name" value={property.project_name} />
                <Row label="Developer" value={displayText(property.developer)} />
                <Row label="Completion year" value={displayNumber(property.completion_year)} />
                <Row label="Listing link" value={displayText(property.listing_url)} />
              </Block>

              <Block title="Location">
                <Row label="Full address" value={displayText(property.full_address)} />
                <Row label="Postcode" value={displayText(property.postcode)} />
                <Row label="City" value={displayText(property.city)} />
                <Row label="District" value={displayText(property.district)} />
                <Row label="State" value={displayText(property.state)} />
                <Row label="Country" value={displayText(property.country)} />
              </Block>

              <Block title="Property & title">
                <Row label="Property type" value={displayText(property.property_type)} />
                <Row label="Title type" value={displayText(property.title_type)} />
                <Row label="Tenure" value={labelFor(TENURES, property.tenure)} />
                <Row label="Lease expiry year" value={displayNumber(property.lease_expiry_year)} />
              </Block>

              <Block title="Unit details">
                <Row label="Built-up size" value={displayNumber(property.built_up_sqft, " sq ft")} />
                <Row label="Bedrooms" value={displayNumber(property.bedrooms)} />
                <Row label="Bathrooms" value={displayNumber(property.bathrooms)} />
                <Row label="Car parks" value={displayNumber(property.car_parks)} />
                <Row label="Floor level" value={displayText(property.floor_level)} />
                <Row label="Total floors" value={displayNumber(property.total_floors)} />
                <Row label="Furnishing" value={displayText(property.furnishing_status)} />
                <Row label="Unit condition" value={displayText(property.unit_condition)} />
              </Block>

              <div id="property-inputs" tabIndex={-1} className="xl:col-span-2"><SourcesAndAssumptions propertyId={id} section="properties" record={property} /></div>
              <Block title="Price & rent inputs">
                <Row label="Asking price" value={displayMoney(property.asking_price)} />
                <Row
                  label="Target purchase price"
                  value={displayMoney(property.target_purchase_price)}
                />
                <Row label="Bank valuation" value={displayMoney(property.bank_valuation)} />
                <Row
                  label="Expected monthly rent"
                  value={displayMoney(property.expected_monthly_rent)}
                />
                <p className="pt-1 text-xs text-muted-foreground">
                  Stored exactly as entered. An asking price is not a confirmed transaction.
                </p>
              </Block>

              <Block title="Workflow & notes">
                <Row
                  label="Property status"
                  value={labelFor(PROPERTY_STATUSES, property.property_status)}
                />
                <Row
                  label="Analysis status"
                  value={labelFor(ANALYSIS_STATUSES, property.analysis_status)}
                />
                <Row label="Notes" value={displayText(property.notes)} />
              </Block>
            </TabsContent>

            <TabsContent value="financials" className="mt-4 space-y-6">
              <p className="text-sm">Save acquisition costs, financing and expenses independently. For M3 loan fees, save financing first, then return to the acquisition estimator to review and apply its suggestions.</p>
              <section id="inputs-acquisition" tabIndex={-1} aria-label="Acquisition costs"><AcquisitionCostsPanel propertyId={id} /></section>
              <section id="inputs-financing" tabIndex={-1} aria-label="Financing"><FinancingPanel propertyId={id} /></section>
              <section id="inputs-expenses" tabIndex={-1} aria-label="Operating expenses"><OperatingExpensesPanel propertyId={id} /></section>
              <p className="text-sm text-muted-foreground">Review net operating income, cash-on-cash return and other calculated metrics in the Summary and Scenarios tabs.</p>
            </TabsContent>

            <TabsContent value="scenarios" className="mt-4">
              <p className="mb-3 text-sm">Scenarios vary rental sensitivity assumptions. Strategies are independent Keep, Flip and Hybrid investment plans with their own horizons and targets.</p>
              <ScenariosPanel propertyId={id} />
            </TabsContent>

            <TabsContent value="strategies" className="mt-4">
              <InvestmentStrategies propertyId={id} onReview={reviewInput} />
            </TabsContent>

            <TabsContent value="scores" className="mt-4">
              <p className="mb-3 text-sm">Review supporting inputs in <Button variant="link" className="px-0" onClick={() => detailsTab.current?.click()}>Sources &amp; assumptions</Button>. Recorded sources do not change the existing score rules.</p>
              <ScoresPanel propertyId={id} />
            </TabsContent>

            <TabsContent value="risk" className="mt-4">
              <p className="mb-3 text-sm">Review supporting inputs in <Button variant="link" className="px-0" onClick={() => detailsTab.current?.click()}>Sources &amp; assumptions</Button>. Evidence reminders are separate from these risk checks.</p>
              <RiskTab propertyId={id} />
            </TabsContent>
          </Tabs>
          </SourceNavigationProvider>
          </SavedDraftDisclosure>
        </>
      ) : null}

    </AppShell>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground break-words">{value}</span>
    </div>
  );
}

function RiskTab({ propertyId }: { propertyId: string }) {
  const { redFlags, isLoading, isError, availability } = usePropertyAnalysis(propertyId);
  if (isError) return <p role="alert" className="text-sm text-destructive">Analysis inputs could not be loaded. Current risk checks are unavailable. Please retry.</p>;
  if (!availability.current && !isLoading) return <p role="status">Current risk assessment unavailable. {availability.reason}</p>;
  return <RedFlagsPanel report={redFlags} isLoading={isLoading} />;
}
