import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PropertyCreateSession } from "@/components/property/PropertyCreateSession";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

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
      {user ? (
        <PropertyCreateSession
          key={user.id}
          owner={user.id}
          onOpen={(id) => navigate({ to: "/properties/$id", params: { id } })}
          onCancel={() => void navigate({ to: "/properties" })}
        />
      ) : (
        <p>Sign in to create a property.</p>
      )}
    </AppShell>
  );
}
