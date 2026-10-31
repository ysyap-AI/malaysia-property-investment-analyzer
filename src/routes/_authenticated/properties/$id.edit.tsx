import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PropertyEditSession } from "@/components/property/PropertyEditSession";
import { Button } from "@/components/ui/button";

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
  const { user, loading } = useAuth();

  return (
    <AppShell
      title="Edit Property"
      description="Blank fields stay Missing / Not Verified."
      actions={
        <Button asChild variant="outline">
          <Link to="/properties/$id" params={{ id }}>
            <ArrowLeft className="size-4" /> Back to property
          </Link>
        </Button>
      }
    >
      {!loading && user ? (
        <PropertyEditSession
          key={`${user.id}:${id}`}
          id={id}
          owner={user.id}
          onCancel={() => void navigate({ to: "/properties/$id", params: { id } })}
        />
      ) : (
        <p>Loading account…</p>
      )}
    </AppShell>
  );
}
