import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import { Showcase } from "@/showcase/Showcase";
import {
  createSample,
  currentAnalysis,
  sampleSchema,
  sessionReducer,
  startSession,
  PRESETS,
  type SampleDraft,
  type SampleSession,
} from "@/showcase/session";
import { analyzePropertyFixture } from "./fixtures/analyze-phase1-property";
import { createPropertyFixture, PROPERTY_FIXTURE_IDS } from "./fixtures/phase1-properties";

function edit(
  state: SampleSession,
  section: keyof SampleDraft,
  field: string,
  value: string | boolean,
) {
  return sessionReducer(state, { type: "edit", section, field, value });
}
function apply(state: SampleSession) {
  return sessionReducer(state, { type: "apply" });
}
function analysis(state: SampleSession) {
  const result = currentAnalysis(state);
  expect(result).not.toBeNull();
  return result!;
}
afterEach(() => vi.unstubAllGlobals());

describe("editable synthetic session", () => {
  it.each(PRESETS)("loads $id without a fixed recommendation", ({ id }) => {
    const state = startSession(id);
    expect(state.applied.property.project_name).toContain("Fictional");
    expect(currentAnalysis(state)).toEqual(analyzeProperty(state.applied));
  });

  it("creates a blank sample with unknown financials", () => {
    const state = sessionReducer(startSession("attractive"), { type: "select", id: "blank" });
    expect(state.applied.property.expected_monthly_rent).toBeNull();
    expect(state.applied.acquisition.purchase_price).toBeNull();
    expect(Object.values(state.applied.operating).every((v) => v === null)).toBe(true);
    expect(analysis(state).returns.monthlyCashFlow.status).toBe("incomplete");
    expect(analysis(state).recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });

  it("updates rent-driven yield, cash flow and returns only after Apply", () => {
    const initial = startSession("attractive");
    const before = analysis(initial);
    const draft = edit(initial, "property", "expected_monthly_rent", "3400");
    expect(currentAnalysis(draft)).toBeNull();
    expect(draft.applied).toEqual(initial.applied);
    const after = analysis(apply(draft));
    for (const metric of [
      "grossRentalYield",
      "netRentalYield",
      "monthlyCashFlow",
      "cashOnCashReturn",
    ] as const) {
      expect(after.returns[metric].value).toBeGreaterThan(before.returns[metric].value!);
    }
  });

  it("propagates acquisition fees to total-cost returns without changing gross yield or cash flow", () => {
    const state = startSession("attractive");
    const before = analysis(state).returns;
    const after = analysis(apply(edit(state, "acquisition", "renovation_cost", "28000"))).returns;
    expect(after.grossRentalYield).toEqual(before.grossRentalYield);
    expect(after.monthlyCashFlow).toEqual(before.monthlyCashFlow);
    expect(after.netRentalYield.value).toBeLessThan(before.netRentalYield.value!);
    expect(after.cashOnCashReturn.value).toBeLessThan(before.cashOnCashReturn.value!);
  });

  it.each([
    ["financing", "annual_interest_rate_percent", "6"],
    ["financing", "loan_tenure_years", "20"],
    ["financing", "loan_to_value_percent", "90"],
    ["financing", "loan_amount", "270000"],
    ["operating", "annual_maintenance_fee", "6000"],
  ] as const)("propagates %s.%s into cash flow", (section, field, value) => {
    const state = startSession("attractive");
    const basis =
      field === "loan_amount" ? edit(state, "financing", "loan_to_value_percent", "") : state;
    const changed = apply(edit(basis, section, field, value));
    expect(analysis(changed).returns.monthlyCashFlow.value).toBeLessThan(
      analysis(state).returns.monthlyCashFlow.value!,
    );
    expect(changed.errors).toEqual({});
  });

  it("preserves the distinction between asking, target and acquisition price", () => {
    const initial = startSession("attractive");
    const before = analysis(initial);
    const asking = apply(edit(initial, "property", "asking_price", "900000"));
    expect(analysis(asking).returns).toEqual(before.returns);
    const target = apply(edit(initial, "property", "target_purchase_price", "900000"));
    expect(analysis(target).returns).toEqual(before.returns);
    expect(analysis(target).redFlags.flags.some((f) => f.key === "valuation_below_target")).toBe(
      true,
    );
    const purchase = apply(edit(initial, "acquisition", "purchase_price", "400000"));
    expect(analysis(purchase).returns.grossRentalYield).not.toEqual(
      before.returns.grossRentalYield,
    );
    expect(purchase.applied.property.asking_price).toBe(initial.applied.property.asking_price);
    expect(purchase.applied.property.target_purchase_price).toBe(
      initial.applied.property.target_purchase_price,
    );
  });

  it("keeps blank and explicit zero distinct", () => {
    const initial = startSession("attractive");
    const missing = apply(edit(initial, "acquisition", "other_cost", ""));
    expect(missing.applied.acquisition.other_cost).toBeNull();
    expect(analysis(missing).returns.netRentalYield.status).toBe("incomplete");
    const zero = apply(edit(missing, "acquisition", "other_cost", "0"));
    expect(zero.applied.acquisition.other_cost).toBe(0);
    expect(analysis(zero).returns.netRentalYield.status).toBe("ok");
  });

  it.each([
    ["property", "expected_monthly_rent", "-1"],
    ["property", "expected_monthly_rent", "1,5"],
    ["acquisition", "renovation_cost", "NaN"],
    ["financing", "annual_interest_rate_percent", "31"],
    ["financing", "loan_tenure_years", "1.5"],
    ["operating", "annual_repair_reserve", "-300"],
    ["property", "project_name", ""],
  ] as const)("withholds stale results after invalid %s.%s", (section, field, value) => {
    const before = startSession("attractive");
    const invalid = apply(edit(before, section, field, value));
    expect(invalid.errors[`${section}.${field}`]).toBeTruthy();
    expect(invalid.applied).toEqual(before.applied);
    expect(currentAnalysis(invalid)).toBeNull();
    expect(analysis(sessionReducer(invalid, { type: "reset" }))).toEqual(analysis(before));
  });

  it("honors existing Unicode name limits and stricter property validation", () => {
    const state = startSession("blank");
    expect(apply(edit(state, "property", "project_name", "🌿".repeat(200))).errors).toEqual({});
    expect(apply(edit(state, "property", "project_name", "🌿".repeat(201))).errors).toHaveProperty(
      "property.project_name",
    );
    expect(apply(edit(state, "property", "postcode", "1234")).errors).toHaveProperty(
      "property.postcode",
    );
    expect(apply(edit(state, "property", "state", "Invented state")).errors).toHaveProperty(
      "property.state",
    );
  });

  it("allows valid negative financial outcomes and detects the adverse sample", () => {
    const a = analysis(startSession("challenging"));
    expect(a.returns.monthlyCashFlow.status).toBe("ok");
    expect(a.returns.monthlyCashFlow.value).toBeLessThan(0);
    expect(a.redFlags.flags.some((f) => f.key === "negative_base_cash_flow")).toBe(true);
    expect(a.recommendation.recommendation).not.toBe("BUY CANDIDATE");
  });

  it("uses quoted instalments only when explicitly requested", () => {
    let state = edit(
      startSession("attractive"),
      "financing",
      "user_provided_monthly_instalment",
      "700",
    );
    state = edit(state, "financing", "use_user_provided_instalment", true);
    expect(analysis(apply(state)).returns.monthlyCashFlow.value).toBeGreaterThan(
      analysis(startSession("attractive")).returns.monthlyCashFlow.value!,
    );
    expect(analysis(apply(state)).scenarios.bear.assumptions.bankInstalmentBypassed).toBe(true);
  });

  it.each(["attractive", "challenging", "incomplete", "blank"] as const)(
    "resets %s and isolates preset objects",
    (id) => {
      const initial = startSession(id);
      const changed = apply(edit(initial, "property", "expected_monthly_rent", "9999"));
      expect(sessionReducer(changed, { type: "reset" })).toEqual(initial);
      expect(sessionReducer(changed, { type: "select", id: "challenging" })).toEqual(
        startSession("challenging"),
      );
      const copy = createSample(id);
      copy.acquisition.other_cost = 999;
      expect(createSample(id).acquisition.other_cost).not.toBe(999);
    },
  );
});

describe("shared financial parity", () => {
  it.each(PROPERTY_FIXTURE_IDS)(
    "%s matches the independent unchanged fixture coordinator",
    (id) => {
      const fixture = createPropertyFixture(id);
      fixture.scenarios = structuredClone(DEFAULT_SCENARIOS);
      const expected = analyzePropertyFixture(fixture);
      const actual = analyzeProperty({
        property: fixture.property,
        acquisition: fixture.acquisitionCosts,
        financing: fixture.financing,
        operating: fixture.operatingExpenses,
      });
      for (const key of [
        "returns",
        "scenarios",
        "invest",
        "confidence",
        "redFlags",
        "recommendation",
      ] as const)
        expect(actual[key]).toEqual(expected[key]);
    },
  );
});

describe("showcase isolation and presentation (SSR, not browser evidence)", () => {
  it.each(PRESETS)("renders the actual $id results and unavailable/adverse states", ({ id }) => {
    const html = renderToStaticMarkup(createElement(Showcase, { initialSample: id }));
    const result = analysis(startSession(id));
    expect(html).toContain(result.recommendation.recommendation);
    if (id === "challenging")
      expect(html).toMatch(/class="negative" data-testid="monthlyCashFlow">RM -/);
    if (id === "incomplete") {
      expect(html).toContain('data-testid="monthlyCashFlow">Unavailable');
      expect(html).toContain("Checks awaiting evidence");
    }
  });

  it("renders synthetic labels, editable forms and real engine results without network or storage access", async () => {
    const forbidden = vi.fn(() => {
      throw new Error("External side effect attempted");
    });
    for (const key of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"])
      vi.stubGlobal(key, forbidden);
    for (const key of ["localStorage", "sessionStorage"])
      vi.stubGlobal(key, { getItem: forbidden, setItem: forbidden, removeItem: forbidden });
    vi.stubGlobal("navigator", { sendBeacon: forbidden });
    const html = renderToStaticMarkup(createElement(Showcase));
    expect(html).toContain("Synthetic demonstration");
    expect(html).toContain("No cloud saving");
    expect(html).toContain("Apply assumptions");
    expect(html).toContain("Monthly cash flow");
    expect(html).toContain(analysis(startSession("attractive")).recommendation.recommendation);
    for (const p of PRESETS) analysis(apply(startSession(p.id)));
    analysis(sessionReducer(startSession("attractive"), { type: "reset" }));
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("has no hosted-client, API, Auth or location imports in the reachable source graph", () => {
    const visited = new Set<string>();
    const visit = (path: string) => {
      path = resolve(path);
      if (visited.has(path)) return;
      visited.add(path);
      const text = readFileSync(path, "utf8");
      expect(path.replaceAll("\\", "/")).not.toMatch(
        /(?:external-client|AppShell|\/hooks\/|\/routes\/|\/lib\/location\/|-api\.ts)/,
      );
      expect(text).not.toMatch(
        /\b(?:fetch\(|localStorage|sessionStorage|sendBeacon|XMLHttpRequest|WebSocket|createClient\()/,
      );
      const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const statement of file.statements) {
        if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue;
        if (
          statement.importClause?.namedBindings &&
          ts.isNamedImports(statement.importClause.namedBindings) &&
          !statement.importClause.name &&
          statement.importClause.namedBindings.elements.every((el) => el.isTypeOnly)
        )
          continue;
        const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
        expect(specifier).not.toMatch(/supabase|analytics/);
        if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
        const base = specifier.startsWith("@/")
          ? resolve("src", specifier.slice(2))
          : resolve(dirname(path), specifier);
        if (base.endsWith(".css")) continue;
        const found = [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find((p) =>
          existsSync(p),
        );
        expect(found, specifier).toBeTruthy();
        visit(found!);
      }
    };
    visit("src/showcase/main.tsx");
    expect(visited.size).toBeGreaterThan(15);
  });

  it("uses a distinct loopback build, disables dotenv and retains normal Auth checks", () => {
    const config = readFileSync("vite.showcase.config.ts", "utf8");
    expect(config).toContain('host: "127.0.0.1"');
    expect(config).toContain("envDir: false");
    expect(config).not.toContain("@lovable.dev");
    const auth = readFileSync("src/routes/_authenticated/route.tsx", "utf8");
    expect(auth).toContain("auth.getUser()");
    expect(auth).toContain('"/login"');
    expect(auth).not.toMatch(/showcase|bypass/i);
    expect(sampleSchema.parse(createSample("incomplete")).financing.loan_amount).toBeNull();
  });
});
