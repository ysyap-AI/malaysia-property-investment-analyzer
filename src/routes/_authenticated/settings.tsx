import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderSection } from "@/components/common/PlaceholderSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/common/StatusBadge";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Investment Criteria — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Set the yield, cash flow and risk thresholds used to assess Malaysian rental properties.",
      },
      { property: "og:title", content: "Investment Criteria — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Configure your personal investment thresholds and default assumptions.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell
      title="Investment Criteria Settings"
      description="Thresholds shown here are placeholders. They are not applied to any calculation yet."
      actions={<Button disabled>Save criteria (not enabled yet)</Button>}
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Target Thresholds</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Default values <StatusBadge status="estimated" />
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Criterion id="min-gross-yield" label="Minimum gross yield (%)" value="5.0" />
            <Criterion id="min-net-yield" label="Minimum net yield (%)" value="3.5" />
            <Criterion id="min-cashflow" label="Minimum monthly cash flow (RM)" value="0" />
            <Criterion id="max-breakeven" label="Maximum break-even occupancy (%)" value="85" />
            <Criterion id="max-price" label="Maximum purchase price (RM)" value="1,000,000" />
            <Criterion id="min-coc" label="Minimum cash-on-cash return (%)" value="6.0" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Display Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle id="show-missing" label="Always show missing-data warnings" />
            <Toggle id="show-provenance" label="Show data status on every figure" />
            <Toggle id="compact" label="Compact table layout" />
          </CardContent>
        </Card>

        <PlaceholderSection
          title="Scoring Weights"
          items={["Metric weightings", "Score bands", "Recommendation rules"]}
        />
        <PlaceholderSection
          title="Malaysian Cost Defaults"
          items={["Stamp duty tiers", "Legal fee tiers", "Valuation fees"]}
        />
      </div>
    </AppShell>
  );
}

function Criterion({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} defaultValue={value} />
    </div>
  );
}

function Toggle({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {label}
      </Label>
      <Switch id={id} defaultChecked />
    </div>
  );
}
