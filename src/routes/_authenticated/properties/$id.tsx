import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderSection } from "@/components/common/PlaceholderSection";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AcquisitionCostsPanel } from "@/components/property/AcquisitionCostsPanel";
import { DeletePropertyDialog } from "@/components/property/DeletePropertyDialog";
import { OperatingExpensesPanel } from "@/components/property/OperatingExpensesPanel";
import { FinancingPanel } from "@/components/property/FinancingPanel";
import { ScoresPanel } from "@/components/property/ScoresPanel";
import { ScenariosPanel } from "@/components/property/ScenariosPanel";
import {
  AnalysisStatusBadge,
  PropertyStatusBadge,
} from "@/components/property/PropertyStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteProperty, getProperty, propertyKeys } from "@/lib/property/property-api";
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

export const Route = createFileRoute("/_authenticated/properties/$id")({
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
  const { id } = useParams({ from: "/_authenticated/properties/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: property, isLoading, error } = useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getProperty(id),
  });

  const remove = useMutation({
    mutationFn: () => deleteProperty(id),
    onSuccess: async () => {
      toast.success("Property deleted");
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      void navigate({ to: "/properties" });
    },
    onError: (e: Error) => toast.error(e.message),
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
          <Button asChild>
            <Link to="/properties/$id/edit" params={{ id }}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={!property}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      }
    >
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && !property ? (
        <p className="text-sm text-muted-foreground">
          This property was not found, or it does not belong to your account.
        </p>
      ) : null}

      {property ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.property_status} />
            <AnalysisStatusBadge status={property.analysis_status} />
            <span className="text-xs text-muted-foreground">
              Rent evidence: <StatusBadge status={rentStatusToDataStatus(property.rent_verification_status)} />
            </span>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
            </TabsList>

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
              <AcquisitionCostsPanel propertyId={id} />
              <OperatingExpensesPanel propertyId={id} />
              <FinancingPanel propertyId={id} />
              <PlaceholderSection
                title="Still to come"
                items={["Net operating income", "Cash-on-cash return"]}
              />
            </TabsContent>

            <TabsContent value="scenarios" className="mt-4">
              <ScenariosPanel propertyId={id} />
            </TabsContent>

            <TabsContent value="scores" className="mt-4">
              <ScoresPanel propertyId={id} />
            </TabsContent>

            <TabsContent value="risk" className="mt-4">
              <PlaceholderSection
                title="Risk Assessment"
                items={[
                  "Negative cash flow flag",
                  "Break-even occupancy flag",
                  "Over-leverage flag",
                ]}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      <DeletePropertyDialog
        open={confirmDelete}
        propertyName={property?.project_name ?? ""}
        busy={remove.isPending}
        onOpenChange={setConfirmDelete}
        onConfirm={() => remove.mutate()}
      />
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
      <span className="text-right font-medium text-foreground break-words">{value}</span>
    </div>
  );
}
