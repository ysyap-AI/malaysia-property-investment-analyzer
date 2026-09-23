import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ShieldCheck, Calculator, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content:
          "Analyse Malaysian residential rental properties with transparent data statuses and private, secure records.",
      },
      { property: "og:title", content: "Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Private, evidence-based analysis of Malaysian residential rental property.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <span className="text-sm font-semibold">Malaysia Property Investment Analyzer</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Create account</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">
          Evidence-based decisions on Malaysian rental property.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Every figure carries a data status, so you always know what is verified, what is
          estimated, and what is still missing. Your records are private to your account.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link to="/signup">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Private by design"
            body="Your properties, costs and loan details are locked to your account at the database level."
          />
          <Feature
            icon={<Calculator className="size-5" />}
            title="Deterministic figures"
            body="Financial calculations arrive in the next phase — no invented numbers in the meantime."
          />
          <Feature
            icon={<Database className="size-5" />}
            title="Honest data status"
            body="Unknown values are shown as Missing / Not Verified, never quietly treated as zero."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
    </Card>
  );
}
