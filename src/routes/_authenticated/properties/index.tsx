import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { PropertyListState } from "@/components/property/PropertyListState";
import { PropertiesTable } from "@/components/property/PropertiesTable";
import { PropertyDeleteControl } from "@/components/property/PropertyDeleteControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROPERTY_STATUSES,
  type PropertyRecord,
} from "@/lib/property/property-fields";
import { listProperties, propertyKeys } from "@/lib/property/property-api";

export const Route = createFileRoute("/_authenticated/properties/")({
  head: () => ({
    meta: [
      { title: "Properties — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "All saved Malaysian rental properties with asking price, rent evidence and status.",
      },
      { property: "og:title", content: "Properties — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Browse, edit and remove your saved Malaysian residential rental properties.",
      },
    ],
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<PropertyRecord | null>(null);
  const deleteTrigger = useRef<HTMLElement | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: propertyKeys.all,
    queryFn: listProperties,
  });


  const rows = useMemo(() => {
    const all = data ?? [];
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      const matchesStatus = status === "all" || row.property_status === status;
      const haystack = [row.project_name, row.city, row.state, row.district]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (term === "" || haystack.includes(term));
    });
  }, [data, search, status]);

  return (
    <AppShell
      title="Properties"
      description="Every property here belongs to your account only."
      actions={
        <Button asChild>
          <Link to="/properties/new">
            <FilePlus2 className="size-4" /> New Property
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          aria-label="Search properties"
          placeholder="Search by project, city or district"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by property status" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROPERTY_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PropertyListState loading={isLoading} error={!!error} data={data} onRetry={() => void refetch()}
        noMatches={rows.length === 0 && !!data?.length} onClear={() => { setSearch(""); setStatus("all"); }}>
        <PropertiesTable rows={rows} caption={`All properties (${rows.length})`}
          onDelete={(row) => {
            deleteTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setPendingDelete(row);
          }} />
      </PropertyListState>

      {pendingDelete ? <PropertyDeleteControl key={pendingDelete.id} id={pendingDelete.id}
        property={pendingDelete} initialOpen onClose={() => setPendingDelete(null)}
        restoreFocus={() => deleteTrigger.current?.focus()}
        onDeleted={() => setPendingDelete(null)} /> : null}
    </AppShell>
  );
}
