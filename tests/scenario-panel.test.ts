import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScenariosPanel } from "@/components/property/ScenariosPanel";
import * as scenarios from "@/lib/scenarios/scenario-engine";

const state = vi.hoisted(() => ({ drafts: {} as Record<string, string>, error: false, acquisition: null as Record<string, number> | null }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => initial && typeof initial === "object" && Object.keys(initial).length === 0
      ? [state.drafts, vi.fn()]
      : actual.useState(initial),
  };
});
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    isLoading: false,
    isError: state.error,
    data: queryKey[0] === "properties" ? { expected_monthly_rent: 2000 } : queryKey[0] === "acquisition-costs" ? state.acquisition : null,
  }),
}));

beforeEach(() => { state.drafts = {}; state.error = false; state.acquisition = null; });
afterEach(() => vi.restoreAllMocks());

describe("scenario assumption drafts", () => {
  it("withholds results when an input request fails", () => {
    state.error = true;
    const html = renderToStaticMarkup(createElement(ScenariosPanel, { propertyId: "test" }));
    expect(html).toContain("Unable to load scenario inputs");
    expect(html).not.toContain("16,200");
  });
  it("does not turn a partial acquisition subtotal into invested cash", () => {
    state.acquisition = { purchase_price: 500000 };
    const run = vi.spyOn(scenarios, "runScenario");
    const html = renderToStaticMarkup(createElement(ScenariosPanel, { propertyId: "test" }));
    expect(run).toHaveBeenCalledTimes(3);
    for (const [base] of run.mock.calls) expect(base.totalAcquisitionCost).toBeNull();
    expect(html).toContain("acquisition cost line(s)");
    expect(html).toContain("Missing / Not Verified");
  });
  it.each(["", " ", "abc", "-", "Infinity"])("does not display stale results for invalid draft %j", (raw) => {
    state.drafts = { "bear.rentAdjustmentPercent": raw };
    const html = renderToStaticMarkup(createElement(ScenariosPanel, { propertyId: "test" }));
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Enter valid assumptions");
    expect(html).not.toContain("16,200");
    expect(html).toContain("22,000");
    expect(html).toContain("24,150");
  });

  it("shows valid results when no incomplete drafts exist", () => {
    const html = renderToStaticMarkup(createElement(ScenariosPanel, { propertyId: "test" }));
    expect(html).not.toContain("Enter valid assumptions");
    expect(html).toContain("16,200");
  });
});
