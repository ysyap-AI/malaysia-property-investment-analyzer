import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SavedAnalysisOverview } from "@/components/property/SavedAnalysisOverview";
import { PropertySummaryDashboard } from "@/components/property/PropertySummaryDashboard";
import { ScoresPanel } from "@/components/property/ScoresPanel";
import { InvestmentStrategyReadiness } from "@/components/property/InvestmentStrategyReadiness";
import { confirmationKey, type FinancialSection } from "@/lib/property/financial-confirmation";
import { parentConfirmationKey } from "@/lib/property/property-edit";
import { financialInputLabel } from "@/lib/property/saved-analysis-presentation";
import { createPropertyFixture } from "./fixtures/phase1-properties";

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "owner" }, loading: false }) }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
let client: QueryClient;
const id = "presentation-property";
const overview = () => createElement(SavedAnalysisOverview, { propertyId: id, onReview: () => {} });
const summary = () => createElement(PropertySummaryDashboard, { propertyId: id });
const scores = () => createElement(ScoresPanel, { propertyId: id });
const readiness = () =>
  createElement(InvestmentStrategyReadiness, {
    propertyId: id,
    draftOpen: false,
    confirmationPending: false,
  });
const render = (child: ReactNode = overview()) =>
  renderToStaticMarkup(createElement(QueryClientProvider, { client }, child));
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  const f = createPropertyFixture("P01");
  for (const [key, data] of Object.entries({
    properties: { ...f.property, project_name: "Synthetic property", user_id: "owner" },
    "acquisition-costs": f.acquisitionCosts,
    financing: f.financing,
    "operating-expenses": f.operatingExpenses,
  }))
    client.setQueryData([key, id], data);
});
afterEach(() => client.clear());
describe("saved analysis presentation with real queries and unchanged engines", () => {
  it("distinguishes complete saved inputs, unknown draft visibility and market evidence", () => {
    const html = render();
    expect(html).toContain("Saved reads qualified for assessment");
    expect(html).toContain("Calculation inputs complete");
    expect(html).toContain("draft state unknown");
    expect(html).toContain("Saving property information does not save acquisition costs");
    expect(html).toContain("five-state financial recommendation is separate");
    expect(render(summary())).toContain("BUY CANDIDATE");
    expect(render(summary())).toContain("No confidence deduction");
    expect(render(summary())).not.toContain('data-status="verified"');
  });
  it("absent financial children are not inferred to be a cash purchase or completed budget", () => {
    for (const key of ["acquisition-costs", "financing", "operating-expenses"])
      client.setQueryData([key, id], null);
    expect(render().match(/No saved section entered/g)).toHaveLength(3);
    expect(render(summary())).toContain("INSUFFICIENT DATA");
    expect(render(readiness())).toContain("Missing financing is not a confirmed cash purchase");
  });
  it("partial saved costs stay partial and field messages use investor labels", () => {
    client.setQueryData(["acquisition-costs", id], { purchase_price: 300000 });
    client.setQueryData(["operating-expenses", id], { annual_maintenance_fee: 0 });
    expect(render().match(/any known subtotal is partial/g)).toHaveLength(2);
    expect(render(summary())).toContain("Complete acquisition cost");
    expect(render(summary())).not.toContain("totalAcquisitionCost");
  });
  it("invalid saved costs are disclosed without manufacturing a total", () => {
    client.setQueryData(["acquisition-costs", id], {
      ...createPropertyFixture("P01").acquisitionCosts,
      purchase_price: -1,
    });
    expect(render()).toContain("Invalid saved cost inputs; complete total withheld");
  });
  for (const section of ["acquisition", "financing", "expenses"] satisfies FinancialSection[]) {
    for (const outcome of ["pending", "uncertain", "acknowledged", "saved-refresh-failed"]) {
      it(`${section} ${outcome} withholds every assessment consumer`, () => {
        client.setQueryData(confirmationKey("owner", id), {
          [section]: { generation: 1, outcome },
        });
        expect(render()).toContain("Current assessment unavailable");
        expect(render()).toContain("Last-known saved information");
        for (const child of [summary(), scores()]) {
          const text = render(child);
          expect(text).toContain("unavailable");
          expect(text).not.toContain("BUY CANDIDATE");
        }
        expect(render(readiness())).not.toContain("Available from saved inputs");
      });
    }
    it(`${section} explicit rejection preserves qualified saved assessments`, () => {
      client.setQueryData(confirmationKey("owner", id), {
        [section]: { generation: 1, outcome: "rejected" },
      });
      expect(render()).toContain("Save rejected");
      expect(render(summary())).toContain("BUY CANDIDATE");
    });
  }
  for (const outcome of ["pending", "uncertain", "acknowledged", "saved-refresh-failed"]) {
    it(`parent ${outcome} is disclosed and withholds saved results`, () => {
      client.setQueryData(parentConfirmationKey("owner", id), { outcome });
      expect(render()).toContain("Current assessment unavailable");
      expect(render(summary())).not.toContain("BUY CANDIDATE");
    });
  }
  for (const key of ["properties", "acquisition-costs", "financing", "operating-expenses"]) {
    for (const kind of ["fetching", "paused", "error", "invalidated"] as const) {
      it(`${key} ${kind} withholds current results even with cached data`, () => {
        const query = client.getQueryCache().find({ queryKey: [key, id], exact: true })!;
        if (kind === "invalidated") query.invalidate();
        else if (kind === "error")
          query.setState({ status: "error", error: new Error("PRIVATE_SENTINEL") });
        else query.setState({ fetchStatus: kind });
        expect(render()).toContain("Current assessment unavailable");
        expect(render(summary())).not.toContain("BUY CANDIDATE");
        expect(render()).not.toContain("PRIVATE_SENTINEL");
      });
    }
  }
  it("an operation for a different account/property cannot contaminate this overview", () => {
    client.setQueryData(confirmationKey("other", id), {
      financing: { generation: 1, outcome: "uncertain" },
    });
    client.setQueryData(confirmationKey("owner", "other-property"), {
      expenses: { generation: 1, outcome: "pending" },
    });
    expect(render()).toContain("Saved reads qualified for assessment");
  });
  it("maps engine identifiers without changing their meaning", () => {
    expect(financialInputLabel("loan_to_value_percent")).toBe(
      "Loan-to-value (LTV) or direct loan amount",
    );
    expect(financialInputLabel("annual_maintenance_fee")).toBe("Maintenance fee");
    expect(financialInputLabel("monthlyInstalment")).toBe("Monthly instalment in use");
    expect(financialInputLabel("futureInput")).toBe("future Input");
  });
});
