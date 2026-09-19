import { createFileRoute, Link } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PropertiesTable } from "@/components/property/PropertiesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { placeholderProperties } from "@/lib/placeholder-data";

export const Route = createFileRoute("/_authenticated/properties/")({
  head: () => ({
    meta: [
      { title: "Properties — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "All saved Malaysian rental properties with asking price, data status and analysis state.",
      },
      { property: "og:title", content: "Properties — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Browse your saved Malaysian residential rental property analyses.",
      },
    ],
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  return (
    <AppShell
      title="Properties"
      description="Saved properties. Filtering, sorting and persistence arrive with the database phase."
      actions={
        <Button asChild>
          <Link to="/analysis/new">
            <FilePlus2 className="size-4" /> New Analysis
          </Link>
        </Button>
      }
    >
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search properties (not wired up yet)" disabled />
      </div>
      <PropertiesTable rows={placeholderProperties} caption="All properties" />
    </AppShell>
  );
}
