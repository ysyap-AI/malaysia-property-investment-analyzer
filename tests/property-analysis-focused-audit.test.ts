import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";

const state = vi.hoisted(() => ({ data: {} as Record<string, unknown>, error: false, errorKey: "", loading: false }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: state.data[queryKey[0]!], isLoading: state.loading, isError: state.error || state.errorKey === queryKey[0],
    error: state.error || state.errorKey === queryKey[0] ? new Error("Input retrieval failed") : null,
  }),
}));

let analysis: ReturnType<typeof usePropertyAnalysis>;
function Probe() {
  analysis = usePropertyAnalysis("audit-property");
  return null;
}
function evaluate() {
  renderToStaticMarkup(createElement(Probe));
  return analysis;
}

beforeEach(() => {
  state.error = false;
  state.errorKey = "";
  state.loading = false;
  state.data = {
    properties: { expected_monthly_rent: 6000, rent_verification_status: "verified", bank_valuation: 500000, target_purchase_price: 500000 },
    "acquisition-costs": { ...Object.fromEntries(ACQUISITION_COST_FIELDS.map((key) => [key, 0])), purchase_price: 500000 },
    "operating-expenses": Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
    financing: { loan_to_value_percent: 80, loan_amount: null, annual_interest_rate_percent: 4,
      loan_tenure_years: 35, bank_quote_verified: true, use_user_provided_instalment: false, user_provided_monthly_instalment: null },
  };
});

describe("analysis integration fix regressions", () => {
  it.each(ACQUISITION_COST_FIELDS)("withholds dependent results when %s is unknown", (field) => {
    const row = state.data["acquisition-costs"] as Record<string, unknown>;
    for (const missing of [null, undefined]) {
      row[field] = missing;
      const result = evaluate();
      for (const metric of ["yieldOnTotalCost", "netRentalYield", "cashOnCashReturn"] as const)
        expect(result.returns[metric].status).not.toBe("ok");
      for (const key of ["net_rental_yield", "cash_on_cash_return"])
        expect(result.invest.categories.find((c) => c.key === key)!.raw_score).toBeNull();
      expect(result.recommendation.recommendation).toBe("INSUFFICIENT DATA");
    }
  });

  it("exposes initial retrieval failure with no cached data", () => {
    state.data = {};
    state.error = true;
    const result = evaluate();
    expect(result.loadState).toBe("error");
    expect(result.isError).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.invest.overall_score).toBeNull();
    expect(result.recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });

  it.each(["properties", "acquisition-costs", "operating-expenses", "financing"])("withholds cached results after %s fails and recovers", (key) => {
    const initial = evaluate();
    expect(initial.recommendation.recommendation).toBe("BUY CANDIDATE");
    state.errorKey = key;
    const failed = evaluate();
    expect(failed.loadState).toBe("error");
    expect(failed.invest.overall_score).toBeNull();
    expect(failed.recommendation.recommendation).toBe("INSUFFICIENT DATA");
    state.errorKey = "";
    const recovered = evaluate();
    expect(recovered.loadState).toBe("ready");
    expect(recovered.error).toBeNull();
    expect(recovered.recommendation).toEqual(initial.recommendation);
  });

  it("does not report a current recommendation during initial loading", () => {
    state.loading = true;
    const result = evaluate();
    expect(result.loadState).toBe("loading");
    expect(result.recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });
});

describe("focused analysis integration audit", () => {
  it("wires valid financials, confidence and risks to the recommendation", () => {
    const result = evaluate();
    expect(result.invest.overall_score).toBe(100);
    expect(result.confidence.score).toBe(100);
    expect(result.redFlags.flags).toEqual([]);
    expect(result.recommendation.recommendation).toBe("BUY CANDIDATE");
  });

  it("does not use a partial acquisition subtotal to score cash-on-cash return", () => {
    (state.data["acquisition-costs"] as Record<string, unknown>).renovation_cost = null;
    const result = evaluate();
    expect(result.invest.categories.find((c) => c.key === "cash_on_cash_return")!.raw_score).toBeNull();
  });

  it("missing acquisition costs prevent a BUY recommendation", () => {
    (state.data["acquisition-costs"] as Record<string, unknown>).renovation_cost = null;
    const result = evaluate();
    expect(result.recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });

  it("does not show a current BUY result after input retrieval fails with stale cached data", () => {
    state.error = true;
    const result = evaluate();
    // A load error may suppress the result entirely or return INSUFFICIENT DATA.
    expect(result.recommendation?.recommendation).not.toBe("BUY CANDIDATE");
  });

  it("missing operating expenses propagate as unavailable results", () => {
    (state.data["operating-expenses"] as Record<string, unknown>).annual_repair_reserve = null;
    expect(evaluate().recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });

  it("changing evidence quality never changes Investment Score", () => {
    const original = evaluate();
    (state.data.properties as Record<string, unknown>).rent_verification_status = "estimated";
    const estimated = evaluate();
    expect(estimated.invest).toEqual(original.invest);
    expect(estimated.confidence.score).toBeLessThan(original.confidence.score);
  });
});
