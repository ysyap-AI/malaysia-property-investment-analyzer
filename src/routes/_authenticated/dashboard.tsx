import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FilePlus2, ShieldAlert, Wallet } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/common/MetricCard";
import { PlaceholderSection } from "@/components/common/PlaceholderSection";
import { PropertiesTable } from "@/components/property/PropertiesTable";
import { Button } from "@/components/ui/button";
import { listProperties, propertyKeys } from "@/lib/property/property-api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content:
          "Overview of your saved Malaysian rental property analyses, portfolio metrics and data confidence.",
      },
      { property: "og:title", content: "Dashboard — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Track and review Malaysian residential rental property investment analyses.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Portfolio overview. Calculation modules are not implemented yet, so figures below are placeholders."
      actions={
        <Button asChild>
          <Link to="/analysis/new">
            <FilePlus2 className="size-4" /> New Analysis
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Properties Analyzed"
          value={String(placeholderProperties.length)}
          status="user-entered"
          icon={<Building2 className="size-4" />}
        />
        <MetricCard
          label="Average Net Yield"
          status="missing"
          hint="Awaiting calculation engine"
          icon={<Wallet className="size-4" />}
        />
        <MetricCard
          label="Average Investment Score"
          status="missing"
          hint="Awaiting scoring engine"
        />
        <MetricCard
          label="Open Risk Flags"
          status="missing"
          hint="Awaiting risk module"
          icon={<ShieldAlert className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PropertiesTable rows={placeholderProperties.slice(0, 4)} caption="Recent analyses" />
        </div>
        <PlaceholderSection
          title="Portfolio Insights"
          items={[
            "Yield distribution chart",
            "Cash flow summary",
            "Data confidence breakdown",
            "Risk flag summary",
          ]}
        />
      </div>
    </AppShell>
  );
}
