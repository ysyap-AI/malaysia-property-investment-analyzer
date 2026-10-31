import { beforeEach, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { plan, facts, snapshot } from "./strategies-fixtures";
const state = vi.hoisted(() => ({
  snapshot: null as any,
  current: true,
  revision: 4,
  owner: "owner",
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: state.owner } }) }));
vi.mock("@/hooks/use-financial-confirmation", () => ({
  useFinancialAvailability: () => ({
    current: state.current,
    reason: state.current ? null : "Save outcome uncertain",
  }),
  useFinancialConfirmation: () => ({}),
}));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[0] === "strategy-snapshot"
        ? state.snapshot
        : { ...state.snapshot.property, revision: state.revision },
  }),
}));
import { InvestmentStrategies } from "@/components/property/InvestmentStrategies";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
beforeEach(() => {
  state.snapshot = snapshot();
  state.snapshot.property.investment_strategy_assumptions = plan();
  state.current = true;
  state.revision = 4;
  state.owner = "owner";
});
const render = () =>
  renderToStaticMarkup(
    createElement(InvestmentStrategies, { propertyId: "p", onReview: () => {} }),
  );
it("renders all three saved projections with visible horizons, evidence reasons and no winning strategy", () => {
  const html = render();
  for (const text of [
    "Buy-to-Keep",
    "Buy-to-Flip",
    "Hybrid",
    "60 months",
    "12 months",
    "43,000.00",
    "137,800.00",
    "Needs evidence",
    "Complete assumptions",
    "Review sources",
    "Edit targets",
    "Detailed calculation breakdown",
  ])
    expect(html).toContain(text);
  expect(html).not.toContain("Meets your targets");
  expect(html).not.toContain("winner:");
});
it("does not show current results for uncertain saves or incoherent revisions", () => {
  state.current = false;
  expect(render()).not.toContain("137,800.00");
  state.current = true;
  state.revision = 5;
  expect(render()).not.toContain("137,800.00");
});
it("discloses unknown tax and keeps Flip usable with no rent", () => {
  state.snapshot.property.expected_monthly_rent = null;
  state.snapshot.property.investment_strategy_assumptions.flip.disposalTax = {
    status: "unknown",
    amount: null,
    basis: "",
  };
  const html = render();
  expect(html).toContain("BEFORE disposal tax only");
  expect(html).toContain("53,000.00");
});
it("shows invalid saved plans as unavailable and legacy NULL plans as not configured", () => {
  state.snapshot.property.investment_strategy_assumptions.version = 2;
  expect(render()).toContain("Strategy data is invalid or unsupported");
  expect(render()).not.toContain("137,800.00");
  state.snapshot.property.investment_strategy_assumptions = null;
  expect(render()).toContain("complete and save this strategy");
});
it("leaves every legacy financial, scenario, scoring, confidence, risk and recommendation output unchanged", () => {
  const s = snapshot(facts());
  const inputs = {
    property: s.property,
    acquisition: s.acquisition_costs,
    financing: s.financing,
    operating: s.operating_expenses,
  };
  const { property: _a, ...before } = analyzeProperty(inputs);
  const { property: _b, ...after } = analyzeProperty({
    ...inputs,
    property: { ...s.property, investment_strategy_assumptions: plan() },
  });
  expect(after).toEqual(before);
});
