import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PropertiesTable } from "@/components/property/PropertiesTable";
import { DeletePropertyDialog } from "@/components/property/DeletePropertyDialog";
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
import { deleteProperty, listProperties, propertyKeys } from "@/lib/property/property-api";

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<PropertyRecord | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: propertyKeys.all,
    queryFn: listProperties,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProperty(id),
    onSuccess: async () => {
      setPendingDelete(null);
      toast.success("Property deleted");
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
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
          placeholder="Search by project, city or district"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
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

      {error ? (
        <p className="mb-4 text-sm text-destructive">{(error as Error).message}</p>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your properties…</p>
      ) : (
        <PropertiesTable
          rows={rows}
          caption={`All properties (${rows.length})`}
          onDelete={setPendingDelete}
        />
      )}

      <DeletePropertyDialog
        open={pendingDelete !== null}
        propertyName={pendingDelete?.project_name ?? ""}
        busy={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
        }}
      />
    </AppShell>
  );
}
