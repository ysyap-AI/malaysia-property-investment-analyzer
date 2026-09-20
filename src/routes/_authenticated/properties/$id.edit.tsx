import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PropertyForm } from "@/components/property/PropertyForm";
import { Button } from "@/components/ui/button";
import { getProperty, propertyKeys, updateProperty } from "@/lib/property/property-api";
import { recordToForm, type PropertyInput } from "@/lib/property/property-fields";

export const Route = createFileRoute("/_authenticated/properties/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Property — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Update the recorded details of a saved Malaysian rental property.",
      },
      { property: "og:title", content: "Edit Property — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Change identification, location, unit, price and workflow details.",
      },
    ],
  }),
  component: EditPropertyPage,
});

function EditPropertyPage() {
  const { id } = useParams({ from: "/_authenticated/properties/$id/edit" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getProperty(id),
  });

  const save = useMutation({
    mutationFn: (values: PropertyInput) => updateProperty(id, values),
    onSuccess: async () => {
      toast.success("Changes saved");
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      await queryClient.invalidateQueries({ queryKey: propertyKeys.detail(id) });
      void navigate({ to: "/properties/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title={data ? `Edit ${data.project_name}` : "Edit Property"}
      description="Blank fields stay Missing / Not Verified."
      actions={
        <Button asChild variant="outline">
          <Link to="/properties/$id" params={{ id }}>
            <ArrowLeft className="size-4" /> Back to property
          </Link>
        </Button>
      }
    >
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && !data ? (
        <p className="text-sm text-muted-foreground">
          This property was not found, or it does not belong to your account.
        </p>
      ) : null}
      {data ? (
        <PropertyForm
          initialValues={recordToForm(data)}
          submitLabel="Save changes"
          busy={save.isPending}
          onSubmit={(values) => save.mutate(values)}
          onCancel={() => void navigate({ to: "/properties/$id", params: { id } })}
        />
      ) : null}
    </AppShell>
  );
}
