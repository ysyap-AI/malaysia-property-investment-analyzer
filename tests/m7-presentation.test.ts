import { it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyListState } from "@/components/property/PropertyListState";
import { validateStrategyEditor } from "@/lib/property/strategy-editor-validation";
import { demoFixture } from "./m7-demo/fixture";
import { revealAndFocus } from "@/hooks/use-source-navigation";
import { EvidenceSummary } from "@/components/property/EvidenceSummary";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", { href: "/properties/new" }, children),
}));
vi.mock("@/hooks/use-investment-evidence", () => ({
  useInvestmentEvidence: () => {
    const f = demoFixture();
    const read = (data: object) => ({ data, isPending: false, isError: false, isFetching: false });
    return {
      ownerMatches: true,
      savedReads: {
        property: read(f.property),
        acquisition: read(f.acquisition),
        financing: read(f.financing),
        expenses: read(f.operating),
      },
    };
  },
}));
vi.mock("@/hooks/use-saved-draft-disclosure", () => ({ useSavedDraftObservations: () => ({}) }));
afterEach(() => vi.unstubAllGlobals());

const renderState = (patch: Partial<Parameters<typeof PropertyListState>[0]>) =>
  renderToStaticMarkup(
    createElement(PropertyListState, {
      loading: false,
      error: false,
      data: [{ id: "p" }],
      onRetry: () => {},
      children: createElement("p", null, "Saved table"),
      ...patch,
    }),
  );
it("separates loading, failed, empty, no-match and loaded property states", () => {
  expect(renderState({ loading: true, data: undefined })).toContain("Loading your properties");
  expect(renderState({ error: true, data: [] })).toContain("Retry loading properties");
  expect(renderState({ error: true, data: [] })).not.toContain("No properties saved");
  expect(renderState({ error: true })).not.toContain("Saved table");
  expect(renderState({ data: [] })).toContain("New Property");
  expect(renderState({ data: [] })).toContain("No properties saved yet");
  expect(renderState({ noMatches: true })).toContain("No matching properties");
  expect(renderState({ noMatches: true })).toContain("Clear filters");
  expect(renderState({ noMatches: true })).not.toContain("No properties saved");
  expect(renderState({})).toContain("Saved table");
});
it("retry and clear actions use the caller's query/filter handlers", () => {
  const retry = vi.fn(),
    clear = vi.fn();
  function walk(
    node: ReactNode,
    action: string,
  ): ReactElement<{ onClick: () => void }> | undefined {
    if (!node || typeof node !== "object" || !("props" in node)) return;
    const el = node as ReactElement<{ children?: ReactNode; onClick: () => void }>;
    if (el.props.children === action) return el;
    for (const child of [el.props.children].flat(Infinity) as ReactNode[]) {
      const found = walk(child, action);
      if (found) return found;
    }
    return undefined;
  }
  const common = { loading: false, children: null, onRetry: retry, onClear: clear };
  walk(
    PropertyListState({ ...common, error: true, data: [] }),
    "Retry loading properties",
  )!.props.onClick();
  walk(
    PropertyListState({ ...common, error: false, noMatches: true, data: [{}] }),
    "Clear filters",
  )!.props.onClick();
  expect(retry).toHaveBeenCalledOnce();
  expect(clear).toHaveBeenCalledOnce();
});
it("passes the exact section and input from each evidence Review sources action", () => {
  const review = vi.fn();
  const tree = EvidenceSummary({ propertyId: "p", onReview: review });
  function visit(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object" || !("props" in node)) return;
    const element = node as ReactElement<{ children?: unknown; onClick?: () => void }>;
    if (element.props.children === "Review sources") element.props.onClick?.();
    visit(element.props.children);
  }
  visit(tree);
  for (const pair of [
    ["properties", "expected_monthly_rent"],
    ["acquisition_costs", "purchase_price"],
    ["financing", "annual_interest_rate_percent"],
    ["financing", "loan_tenure_years"],
    ["operating_expenses", "annual_maintenance_fee"],
  ])
    expect(review).toHaveBeenCalledWith(...pair);
});
it("gives human-readable errors and exact first-invalid paths, preserving NULL versus zero", () => {
  const f = demoFixture();
  f.strategy.keep.horizonMonths = 121;
  f.strategy.flip.exitCosts.agentFee = -1;
  const result = validateStrategyEditor(f.strategy);
  expect(result.data).toBeNull();
  expect(result.issues[0]).toEqual({
    path: "keep.horizonMonths",
    message: "Keep — holding period: enter 120 or less.",
  });
  expect(result.issues[1]?.path).toBe("flip.exitCosts.agentFee");
  f.strategy.keep.horizonMonths = null;
  f.strategy.flip.exitCosts.agentFee = 0;
  const valid = validateStrategyEditor(f.strategy).data!;
  expect(valid.keep.horizonMonths).toBeNull();
  expect(valid.flip.exitCosts.agentFee).toBe(0);
});
it("reveals all enclosing disclosures before scrolling and focusing an invalid/source field", () => {
  class Details {
    open = false;
    parentElement: Details | null = null;
  }
  vi.stubGlobal("HTMLDetailsElement", Details);
  const outer = new Details(),
    inner = new Details();
  inner.parentElement = outer;
  const focus = vi.fn(),
    scrollIntoView = vi.fn();
  revealAndFocus({ parentElement: inner, focus, scrollIntoView } as unknown as HTMLElement);
  expect(inner.open && outer.open).toBe(true);
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
