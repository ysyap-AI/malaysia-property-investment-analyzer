import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { analyzePropertyFixture } from "./fixtures/analyze-phase1-property";
import { createPropertyFixture, PROPERTY_FIXTURE_IDS } from "./fixtures/phase1-properties";

// Only the query boundary is mocked. The production hook and all engines run.
const query = vi.hoisted(() => ({ rows: {} as Record<string, unknown> }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: query.rows[queryKey[0]!], isLoading: false, isError: false, error: null,
  }),
}));

describe("property fixture integration with the existing analysis hook", () => {
  it.each(PROPERTY_FIXTURE_IDS)("%s feeds saved financial inputs into the real analysis path", id => {
    const fixture = createPropertyFixture(id);
    query.rows = {
      properties: fixture.property,
      "acquisition-costs": fixture.acquisitionCosts,
      "operating-expenses": fixture.operatingExpenses,
      financing: fixture.financing,
    };
    // The existing Scores/Risk hook always uses DEFAULT_SCENARIOS. P03's custom
    // vacancy assumptions are tested through runScenario in the engine suite;
    // they are not persisted property evidence or a new hook feature.
    const hookFixture = structuredClone(fixture);
    hookFixture.scenarios = structuredClone(DEFAULT_SCENARIOS);
    const expected = analyzePropertyFixture(hookFixture);
    let actual: ReturnType<typeof usePropertyAnalysis> | undefined;
    function Probe() {
      actual = usePropertyAnalysis(fixture.id);
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    expect(actual).toBeDefined();
    expect(actual).toMatchObject({
      loadState: "ready", isError: false, isLoading: false,
      returns: expected.returns, invest: expected.invest, confidence: expected.confidence,
      redFlags: expected.redFlags, recommendation: expected.recommendation,
    });
  });
});
