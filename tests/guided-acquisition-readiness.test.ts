import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvestmentStrategyReadiness } from "@/components/property/InvestmentStrategyReadiness";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import { createPropertyFixture, PROPERTY_FIXTURE_IDS } from "./fixtures/phase1-properties";

const query = vi.hoisted(() => ({
  rows: {} as Record<string, unknown>,
  loading: false,
  error: false,
}));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "test-owner" }, loading: false }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryState: () => undefined,
    getQueryCache: () => ({ subscribe: () => () => {} }),
  }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: query.rows[queryKey[0]!],
    isLoading: query.loading,
    isError: query.error,
    error: null,
  }),
}));
function setup() {
  const f = createPropertyFixture("P01");
  query.rows = {
    properties: Object.assign(f.property, { user_id: "test-owner" }),
    "acquisition-costs": f.acquisitionCosts,
    "operating-expenses": f.operatingExpenses,
    financing: f.financing,
  };
  query.loading = false;
  query.error = false;
  return f;
}
const render = (pending = false) =>
  renderToStaticMarkup(
    createElement(InvestmentStrategyReadiness, {
      propertyId: "synthetic",
      draftOpen: true,
      confirmationPending: pending,
    }),
  );
describe("read-only strategy requirements through the existing analysis hook", () => {
  it.each(PROPERTY_FIXTURE_IDS)(
    "%s displays requirements without changing any financial or decision output",
    (id) => {
      const f = setup(),
        selected = createPropertyFixture(id);
      Object.assign(f, selected);
      query.rows = {
        properties: { ...f.property, user_id: "test-owner" },
        "acquisition-costs": f.acquisitionCosts,
        "operating-expenses": f.operatingExpenses,
        financing: f.financing,
      };
      const inputs = {
        property: f.property,
        acquisition: f.acquisitionCosts,
        operating: f.operatingExpenses,
        financing: f.financing,
      };
      const before = JSON.stringify(analyzeProperty(inputs));
      const html = render();
      expect(html).toContain("Investment Strategy Readiness");
      for (const name of [
        "Buy to Keep",
        "Buy to Flip",
        "Hybrid",
        "Not yet implemented",
        "not your open acquisition draft",
      ])
        expect(html).toContain(name);
      expect(html).not.toMatch(/BUY CANDIDATE|NEGOTIATE|WATCHLIST|REJECT|strategy score/);
      expect(JSON.stringify(analyzeProperty(inputs))).toBe(before);
    },
  );
  it("keeps missing, zero and invalid rental/debt information distinct", () => {
    const f = setup();
    f.property.expected_monthly_rent = null;
    expect(render()).toContain("Rental amount: Missing or invalid required inputs");
    f.property.expected_monthly_rent = 0;
    expect(render()).toContain("Rental amount: Available from saved inputs");
    f.property.expected_monthly_rent = -1;
    expect(render()).toContain("Rental amount: Missing or invalid required inputs");
    query.rows["financing"] = null;
    expect(render()).toContain("Financing and debt service: Missing or invalid required inputs");
    expect(render()).toContain("Missing financing is not a confirmed cash purchase");
  });
  it.each(["loading", "error", "pending"])(
    "withholds availability during %s even with cached values",
    (state) => {
      setup();
      query.loading = state === "loading";
      query.error = state === "error";
      expect(render(state === "pending")).not.toContain("Available from saved inputs");
      expect(render(state === "pending")).toContain("Unavailable");
    },
  );
  it("distinguishes a bare valuation amount from qualified resale evidence", () => {
    const f = setup();
    expect(render()).toContain("A bank valuation amount is recorded");
    expect(render()).toContain("have not been evaluated for resale");
    f.property.bank_valuation = null;
    expect(render()).toContain("Missing supported market-value evidence");
  });
});
