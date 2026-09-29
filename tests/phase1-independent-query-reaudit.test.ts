import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { ScoresPanel } from "@/components/property/ScoresPanel";

// Real TanStack Query cache, hook and engines; only the external DB client is stubbed.
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
const id = "independent-audit";
let client: QueryClient;
let rows: Record<string, any>;
let result: ReturnType<typeof usePropertyAnalysis>;
function Probe() { result = usePropertyAnalysis(id); return null; }
function render(component = Probe) {
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(component, { propertyId: id })));
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
  rows = {
    properties: { expected_monthly_rent: 6000, rent_verification_status: "verified", bank_valuation: 500000, target_purchase_price: 500000 },
    "acquisition-costs": { ...Object.fromEntries(ACQUISITION_COST_FIELDS.map((k) => [k, 0])), purchase_price: 500000 },
    "operating-expenses": Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((k) => [k, 0])),
    financing: { loan_to_value_percent: 80, loan_amount: null, annual_interest_rate_percent: 4, loan_tenure_years: 35,
      bank_quote_verified: true, use_user_provided_instalment: false, user_provided_monthly_instalment: null },
  };
  for (const [key, data] of Object.entries(rows)) client.setQueryData([key, id], data);
});
afterEach(() => client.clear());

describe("independent F1 and F6 through the real query cache", () => {
  it.each(ACQUISITION_COST_FIELDS)("omitting acquisition %s blocks BUY", (field) => {
    render();
    expect(result.recommendation.recommendation).toBe("BUY CANDIDATE");
    const row = { ...rows["acquisition-costs"] };
    delete row[field];
    client.setQueryData(["acquisition-costs", id], row);
    render();
    expect(result.returns.cashOnCashReturn.status).not.toBe("ok");
    expect(result.recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });
  it.each(["properties", "acquisition-costs", "operating-expenses", "financing"])("cached BUY is withheld after %s refetch failure, including rendered Scores", async (key) => {
    render();
    expect(result.recommendation.recommendation).toBe("BUY CANDIDATE");
    await expect(client.fetchQuery({ queryKey: [key, id], staleTime: 0, queryFn: async () => { throw new Error("Independent refetch failure"); } })).rejects.toThrow("Independent refetch failure");
    expect(client.getQueryData([key, id])).toEqual(rows[key]);
    render();
    expect(result.isError).toBe(true);
    expect(result.loadState).toBe("error");
    expect(result.recommendation.recommendation).toBe("INSUFFICIENT DATA");
    const markup = render(ScoresPanel);
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("BUY CANDIDATE");
    await client.fetchQuery({ queryKey: [key, id], staleTime: 0, queryFn: async () => rows[key] });
    render();
    expect(result.loadState).toBe("ready");
    expect(result.recommendation.recommendation).toBe("BUY CANDIDATE");
  });
});
