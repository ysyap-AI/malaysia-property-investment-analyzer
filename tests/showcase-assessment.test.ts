import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import { AssessmentPanel, AssessmentReport, Presentation } from "@/showcase/AssessmentPanel";
import {
  SYNTHETIC_NOTICE,
  assessmentModel,
  captureAssessment,
  assessmentIsCurrent,
  dueDiligence,
  printCapturedAssessment,
  assessmentMetric,
  type AssessmentModel,
} from "@/showcase/assessment";
import {
  currentAnalysis,
  sampleSchema,
  sessionReducer,
  startSession,
  type SampleSession,
  type SessionAction,
} from "@/showcase/session";
import {
  EVIDENCE_SCENARIOS,
  LOCATION_FIELDS,
  currentLocationEvidence,
} from "@/showcase/location-fixtures";
import { createPropertyFixture, PROPERTY_FIXTURE_IDS } from "./fixtures/phase1-properties";

const now = "2026-10-23T08:30:00.000Z";
const render = (model: AssessmentModel) =>
  renderToStaticMarkup(createElement(AssessmentReport, { model, capturedAt: now }));
const escaped = (text: string) =>
  renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
const acknowledge = (s: SampleSession) => sessionReducer(s, { type: "acknowledge-origin" });
const capture = (s: SampleSession) => captureAssessment(s, currentAnalysis(s), now)!;
const presentation = (c: ReturnType<typeof capture>, s: SampleSession) =>
  renderToStaticMarkup(createElement(Presentation, { captured: c, session: s }));
function fixtureSession(id: (typeof PROPERTY_FIXTURE_IDS)[number]) {
  const f = createPropertyFixture(id);
  const session = startSession("attractive");
  session.applied = sampleSchema.parse({
    property: {
      ...session.draft.property,
      expected_monthly_rent: f.property.expected_monthly_rent,
      rent_verification_status: f.property.rent_verification_status,
      bank_valuation: f.property.bank_valuation,
      target_purchase_price: f.property.target_purchase_price,
    },
    acquisition: f.acquisitionCosts,
    financing: f.financing,
    operating: f.operatingExpenses,
  });
  session.draft = structuredClone(session.applied);
  return session;
}
afterEach(() => vi.unstubAllGlobals());

describe("explanation uses unchanged financial outputs", () => {
  it.each(PROPERTY_FIXTURE_IDS)(
    "%s shows the exact shared recommendation, reasons, contributions and metrics",
    (id) => {
      const s = fixtureSession(id);
      const a = currentAnalysis(s)!;
      const before = JSON.stringify(a);
      const model = assessmentModel(s, a);
      expect(model.analysis).toBe(a);
      expect(a).toEqual(analyzeProperty(s.applied));
      const html = render(model);
      expect(html).toContain(a.recommendation.recommendation);
      for (const reason of a.recommendation.reasons) expect(html).toContain(escaped(reason));
      for (const c of a.invest.categories.filter((c) => c.enabled)) {
        expect(html).toContain(escaped(c.explanation));
        expect(html).toContain(
          c.weighted_score === null
            ? "Contribution: Unavailable"
            : `Contribution: ${c.weighted_score} points`,
        );
      }
      for (const metric of Object.values(a.returns)) {
        expect(metric.status === "ok" || metric.value === null).toBe(true);
      }
      for (const flag of a.redFlags.flags) expect(html).toContain(escaped(flag.explanation));
      for (const missing of a.recommendation.missing_information)
        expect(html).toContain(escaped(missing));
      expect(JSON.stringify(a)).toBe(before);
    },
  );

  it("covers every existing recommendation category from actual engine outputs", () => {
    const categories = new Set(
      PROPERTY_FIXTURE_IDS.map(
        (id) => currentAnalysis(fixtureSession(id))!.recommendation.recommendation,
      ),
    );
    expect([...categories].sort()).toEqual(
      ["BUY CANDIDATE", "NEGOTIATE", "WATCHLIST", "REJECT", "INSUFFICIENT DATA"].sort(),
    );
  });

  it.each(["incomplete", "blank"] as const)(
    "keeps unavailable %s scores and returns distinct from zero",
    (id) => {
      const s = startSession(id);
      const a = currentAnalysis(s)!;
      expect(a.invest.overall_score).toBeNull();
      expect(assessmentMetric(a.returns.monthlyCashFlow)).toBe("Unavailable");
      const html = render(capture(s).model);
      expect(html).toContain("INSUFFICIENT DATA");
      expect(html).toContain("Contribution: Unavailable");
      expect(html).toContain("Missing:");
      expect(html).not.toContain("RM 0.00");
    },
  );

  it("retains negative cash flow, negative returns and critical risk explanations", () => {
    const s = startSession("challenging");
    const a = currentAnalysis(s)!;
    const html = render(capture(s).model);
    expect(a.returns.cashOnCashReturn.value).toBeLessThan(0);
    expect(html).toContain('class="negative">RM -');
    expect(html).toContain("risk-severity critical");
    for (const flag of a.redFlags.flags.filter((f) => f.severity === "critical")) {
      expect(html).toContain(escaped(flag.risk_name));
      expect(html).toContain(escaped(flag.actual_value));
    }
  });

  it("formats genuine zero and invalid outputs explicitly", () => {
    expect(assessmentMetric({ status: "ok", value: 0 })).toBe("RM 0");
    expect(assessmentMetric({ status: "ok", value: 0 }, true)).toBe("0%");
    expect(
      assessmentMetric({ status: "invalid", value: null, reason: "Invalid denominator" }),
    ).toBe("Unavailable");
  });
});

describe("separate attributed location observations", () => {
  it.each(EVIDENCE_SCENARIOS)("renders %s without changing any financial output", (scenario) => {
    const initial = acknowledge(startSession("attractive"));
    const s = sessionReducer(initial, { type: "evidence-scenario", scenario });
    const c = capture(s);
    expect(c.model.analysis).toEqual(currentAnalysis(initial));
    const html = render(c.model);
    expect(html).toContain(`data-location-state="${scenario}"`);
    expect(html).toContain(escaped(currentLocationEvidence(s).message));
    expect(html).toContain("Location Observations");
    expect(html).toContain(
      "does not enter the financial score, financial confidence, risks or recommendation",
    );
    expect(html).toContain("No numerical Location Score");
    expect(html).toContain("MPIA invented nearby fixtures v1");
    expect(html).toContain("Preparation dates only; no provider retrieval");
    if (["complete", "partial", "stale"].includes(scenario))
      expect(html).toContain("Meranti Link station");
    else expect(html).not.toContain("Meranti Link station");
    if (scenario === "partial") {
      expect(html).toContain("Distance unavailable");
      expect(html).toContain("Missing category coverage: Education, Healthcare");
    }
    if (scenario === "stale") expect(html).toContain("2025-01-01");
    if (["error", "unavailable", "loading"].includes(scenario))
      expect(html).toContain("No completed coverage result or amenity count");
    if (scenario === "empty") expect(html).toContain("zero supplied examples");
  });

  it.each(["blank", "unmatched", "awaiting-origin", "wrong-version"] as const)(
    "withholds findings for %s",
    (kind) => {
      let s = startSession(kind === "blank" ? "blank" : "attractive");
      if (kind === "unmatched") {
        s = sessionReducer(acknowledge(s), {
          type: "edit",
          section: "property",
          field: "full_address",
          value: "Unknown address",
        });
        s = sessionReducer(s, { type: "apply" });
      }
      if (kind === "wrong-version")
        s = { ...acknowledge(s), location: { ...s.location, originVersion: "wrong-version" } };
      const html = render(capture(s).model);
      expect(html).not.toContain("Meranti Link station");
      expect(html).not.toContain("Sample origin acknowledged");
      expect(capture(s).model.location.items).toEqual([]);
    },
  );
});

describe("grounded due diligence", () => {
  it.each(["attractive", "challenging", "incomplete", "blank"] as const)(
    "grounds every %s item in an actual evidence gap or risk",
    (id) => {
      const s = acknowledge(startSession(id));
      const a = currentAnalysis(s)!;
      const e = currentLocationEvidence(s);
      const items = dueDiligence(a, e);
      const financialReasons = [
        ...a.recommendation.missing_information,
        ...a.redFlags.flags.map((f) => f.explanation),
        ...a.redFlags.unchecked.map((f) => f.reason),
        ...a.confidence.factors
          .filter((f) => f.status !== "not-available-in-phase" && f.evidence_status !== "Verified")
          .map((f) => f.explanation),
      ];
      for (const item of items) {
        if (item.id === "location") expect(item.reason).toContain(e.message);
        else if (item.id === "synthetic") expect(item.reason).toContain("synthetic session");
        else expect(financialReasons).toContain(item.reason);
      }
      expect(items.map((i) => i.id).length).toBe(new Set(items.map((i) => i.id)).size);
      for (const reason of financialReasons) expect(items.map((i) => i.reason)).toContain(reason);
      expect(items.find((i) => i.id === "location")).toBeDefined();
      expect(items.find((i) => i.id === "synthetic")).toBeDefined();
    },
  );
});

describe("presentation capture, invalidation and print parity", () => {
  it("captures applied inputs and the exact already-computed output without a recalculation", () => {
    const s = acknowledge(startSession("attractive"));
    const a = currentAnalysis(s)!;
    const c = captureAssessment(s, a, now)!;
    expect(c.capturedAt).toBe(now);
    expect(c.model.inputs).toEqual(s.applied);
    expect(c.model.analysis).toEqual(a);
    expect(c.model.analysis).not.toBe(a);
    expect(c.model.inputs).not.toBe(s.applied);
    a.recommendation.reasons.push("Changed outside capture");
    expect(c.model.analysis.recommendation.reasons).not.toContain("Changed outside capture");
    expect(assessmentIsCurrent(c, s)).toBe(true);
  });

  const changes: SessionAction[] = [
    ...LOCATION_FIELDS.map((field) => ({
      type: "edit" as const,
      section: "property" as const,
      field,
      value: "Edited location",
    })),
    { type: "edit", section: "property", field: "expected_monthly_rent", value: "3200" },
    { type: "edit", section: "acquisition", field: "renovation_cost", value: "10000" },
    { type: "edit", section: "financing", field: "annual_interest_rate_percent", value: "5" },
    { type: "edit", section: "operating", field: "annual_maintenance_fee", value: "3000" },
    { type: "evidence-scenario", scenario: "error" },
    { type: "reset" },
    { type: "select", id: "challenging" },
    { type: "select", id: "attractive" },
    { type: "restore-location" },
  ];
  it.each(changes)("invalidates after %j and blocks old output in screen and print", (action) => {
    const s = acknowledge(startSession("attractive"));
    const c = capture(s);
    const changed = sessionReducer(s, action);
    expect(assessmentIsCurrent(c, changed)).toBe(false);
    const html = presentation(c, changed);
    expect(html).toContain("Presentation out of date");
    expect(html).not.toContain("Meranti Link station");
    expect(html).not.toContain(c.model.analysis.recommendation.recommendation);
    const print = vi.fn();
    expect(printCapturedAssessment(c, changed, print)).toBe(false);
    expect(print).not.toHaveBeenCalled();
  });

  it("rejects unapplied and invalid drafts; refresh uses new valid inputs and location applicability", () => {
    const s = acknowledge(startSession("attractive"));
    const c = capture(s);
    let changed = sessionReducer(s, {
      type: "edit",
      section: "property",
      field: "expected_monthly_rent",
      value: "-1",
    });
    changed = sessionReducer(changed, { type: "apply" });
    expect(capture(changed)).toBeNull();
    expect(captureAssessment(changed, c.model.analysis, now)).toBeNull();
    changed = sessionReducer(changed, {
      type: "edit",
      section: "property",
      field: "expected_monthly_rent",
      value: "3300",
    });
    expect(capture(changed)).toBeNull();
    changed = sessionReducer(changed, { type: "apply" });
    const refreshed = capture(changed);
    expect(assessmentIsCurrent(c, changed)).toBe(false);
    expect(assessmentIsCurrent(refreshed, changed)).toBe(true);
    expect(refreshed.model.inputs.property.expected_monthly_rent).toBe(3300);
    expect(refreshed.model.analysis.returns.monthlyCashFlow).not.toEqual(
      c.model.analysis.returns.monthlyCashFlow,
    );
    expect(refreshed.model.location.status).toBe("complete");
    changed = sessionReducer(changed, {
      type: "edit",
      section: "property",
      field: "full_address",
      value: "Edited fictional address",
    });
    changed = sessionReducer(changed, { type: "apply" });
    const updated = capture(changed);
    expect(updated.model.location.status).toBe("unmatched");
    expect(render(updated.model)).not.toContain("Meranti Link station");
  });

  it("returning to identical values and Apply cannot silently revive the old presentation", () => {
    const s = startSession("attractive");
    const c = capture(s);
    const changed = sessionReducer(s, {
      type: "edit",
      section: "property",
      field: "expected_monthly_rent",
      value: String(s.applied.property.expected_monthly_rent),
    });
    const applied = sessionReducer(changed, { type: "apply" });
    expect(applied.applied).toEqual(s.applied);
    expect(assessmentIsCurrent(c, applied)).toBe(false);
  });

  it.each(["attractive", "challenging", "incomplete", "blank"] as const)(
    "%s screen and print use the identical report model and include disclaimers",
    (id) => {
      const s = acknowledge(startSession(id));
      const c = capture(s);
      const html = render(c.model);
      expect(presentation(c, s)).toContain(html);
      expect(html).toContain(escaped(SYNTHETIC_NOTICE));
      expect(html.match(/not verified property or Malaysian market evidence/g)?.length).toBe(2);
      expect(html).toContain(now);
      expect(html).toContain("Asia/Kuala_Lumpur");
      expect(html).toContain("scoring-v2");
      expect(html).toContain("scenarios-v1");
      expect(html).toContain("Default Base / Bull / Bear scenarios");
      expect(html).toContain("Applied assumptions");
      const print = vi.fn();
      expect(printCapturedAssessment(c, s, print)).toBe(true);
      expect(print).toHaveBeenCalledOnce();
    },
  );

  it("native print without a valid capture shows a labelled blocker, not current conclusions", () => {
    const html = renderToStaticMarkup(
      createElement(Presentation, { captured: null, session: startSession("attractive") }),
    );
    expect(html).toContain("No assessment captured");
    expect(html).toContain(escaped(SYNTHETIC_NOTICE));
    const print = vi.fn();
    expect(printCapturedAssessment(null, startSession("blank"), print)).toBe(false);
    expect(print).not.toHaveBeenCalled();
    const css = readFileSync("src/showcase/showcase.css", "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain("@page");
    expect(css).toContain("table-header-group");
    expect(css).toContain("break-inside: avoid");
  });
});

describe("offline end-to-end rehearsal and isolation (not browser evidence)", () => {
  it.each(["attractive", "challenging", "incomplete", "blank"] as const)(
    "rehearses the %s session through financial edits, evidence, explanation and presentation",
    (id) => {
      let s = startSession(id);
      const forbidden = vi.fn(() => {
        throw new Error("External side effect");
      });
      for (const key of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"])
        vi.stubGlobal(key, forbidden);
      for (const key of ["localStorage", "sessionStorage"])
        vi.stubGlobal(key, { getItem: forbidden, setItem: forbidden, removeItem: forbidden });
      vi.stubGlobal("navigator", {
        sendBeacon: forbidden,
        geolocation: { getCurrentPosition: forbidden },
      });
      s = sessionReducer(s, {
        type: "edit",
        section: "property",
        field: "expected_monthly_rent",
        value: id === "challenging" ? "1800" : id === "incomplete" || id === "blank" ? "" : "3000",
      });
      expect(currentAnalysis(s)).toBeNull();
      s = sessionReducer(s, { type: "apply" });
      const a = currentAnalysis(s)!;
      expect(a.scenarios.base).toBeDefined();
      s = acknowledge(s);
      for (const scenario of EVIDENCE_SCENARIOS) {
        s = sessionReducer(s, { type: "evidence-scenario", scenario });
        const c = capture(s);
        const html = presentation(c, s);
        expect(html).toContain(a.recommendation.recommendation);
        expect(html).toContain("Due-diligence next steps");
        expect(html).toContain("Financial data confidence");
        expect(
          renderToStaticMarkup(
            createElement(AssessmentPanel, { session: s, analysis: currentAnalysis(s) }),
          ),
        ).toContain("Present / Print");
        expect(assessmentIsCurrent(c, sessionReducer(s, { type: "reset" }))).toBe(false);
      }
      expect(forbidden).not.toHaveBeenCalled();
    },
  );
});
