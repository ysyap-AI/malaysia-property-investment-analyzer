import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PropertyListState } from "@/components/property/PropertyListState";
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
          "Review saved Malaysian properties, financial results, evidence and next steps.",
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
  const { data, isLoading, error, refetch } = useQuery({ queryKey: propertyKeys.all, queryFn: listProperties });

  return (
    <AppShell
      title="Dashboard"
      description="Open a saved property to continue your research, or start with New Property."
      actions={
        <Button asChild>
          <Link to="/properties/new">
            <FilePlus2 className="size-4" /> New Property
          </Link>
        </Button>
      }
    >
      <PropertyListState loading={isLoading} error={!!error} data={data} onRetry={() => void refetch()}>
        <PropertiesTable rows={(data ?? []).slice(0, 5)} caption="Recently edited properties" />
      </PropertyListState>
      {data && !error && !isLoading && data.length > 0 ? <Button asChild variant="link" className="mt-3"><Link to="/properties">View all {data.length} saved properties</Link></Button> : null}
      <p className="mt-6 text-xs text-muted-foreground">Portfolio summaries are not available. Open a property for its saved financial results, evidence and independent investment strategies.</p>
    </AppShell>
  );
}
