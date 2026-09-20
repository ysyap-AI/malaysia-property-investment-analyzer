import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PropertyForm } from "@/components/property/PropertyForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createProperty, propertyKeys } from "@/lib/property/property-api";
import type { PropertyInput } from "@/lib/property/property-fields";

export const Route = createFileRoute("/_authenticated/properties/new")({
  head: () => ({
    meta: [
      { title: "New Property — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Record a Malaysian residential rental property in clearly separated sections.",
      },
      { property: "og:title", content: "New Property — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Capture identification, location, unit details, price and rent inputs.",
      },
    ],
  }),
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (values: PropertyInput) => {
      if (!user) throw new Error("You need to be signed in.");
      return createProperty(values, user.id);
    },
    onSuccess: async (record) => {
      toast.success("Property saved");
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      void navigate({ to: "/properties/$id", params: { id: record.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="New Property"
      description="Only the project name is required. Anything you do not know yet stays Missing / Not Verified — it is never stored as zero."
      actions={
        <Button asChild variant="outline">
          <Link to="/properties">
            <ArrowLeft className="size-4" /> Back to properties
          </Link>
        </Button>
      }
    >
      <PropertyForm
        submitLabel="Save property"
        busy={save.isPending}
        onSubmit={(values) => save.mutate(values)}
        onCancel={() => void navigate({ to: "/properties" })}
      />
    </AppShell>
  );
}
