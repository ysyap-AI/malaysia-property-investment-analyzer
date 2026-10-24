import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { LocationPanel, LocationFindings } from "@/showcase/LocationPanel";
import { Showcase } from "@/showcase/Showcase";
import {
  startSession,
  sessionReducer,
  currentAnalysis,
  createSample,
  PRESETS,
  type SampleSession,
  type SampleDraft,
} from "@/showcase/session";
import {
  LOCATION_FIELDS,
  CATEGORIES,
  CATEGORY_LABELS,
  EVIDENCE_SCENARIOS,
  currentLocationEvidence,
  readLocationFixture,
  sampleOrigin,
  locationKey,
  distanceLabel,
  filterPlaces,
  type EvidenceScenario,
} from "@/showcase/location-fixtures";

const acknowledge = (state: SampleSession) => sessionReducer(state, { type: "acknowledge-origin" });
const selectScenario = (state: SampleSession, scenario: EvidenceScenario) =>
  sessionReducer(state, { type: "evidence-scenario", scenario });
const edit = (state: SampleSession, field: string, value: string) =>
  sessionReducer(state, { type: "edit", section: "property", field, value });
const apply = (state: SampleSession) => sessionReducer(state, { type: "apply" });
const panel = (session: SampleSession) =>
  renderToStaticMarkup(createElement(LocationPanel, { session, dispatch: () => {} }));
afterEach(() => vi.unstubAllGlobals());

describe("exact synthetic origin applicability", () => {
  it.each(PRESETS)("requires explicit acknowledgement for $id", ({ id }) => {
    const initial = startSession(id);
    expect(currentLocationEvidence(initial).status).toBe("awaiting-origin");
    expect(currentLocationEvidence(initial).items).toEqual([]);
    expect(panel(initial)).toContain("Use this sample origin");
    const state = acknowledge(initial);
    const evidence = currentLocationEvidence(state);
    expect(evidence.status).toBe(
      id === "attractive" ? "complete" : id === "challenging" ? "partial" : "stale",
    );
    expect(evidence.origin?.sampleId).toBe(id);
    expect(evidence.fixture?.inputKey).toBe(
      locationKey(id, state.location.originVersion, state.draft.property),
    );
    expect(evidence.items.length).toBeGreaterThan(0);
    expect(state.applied).toEqual(initial.applied);
    expect(currentAnalysis(state)).toEqual(currentAnalysis(initial));
  });

  it.each(LOCATION_FIELDS)(
    "immediately invalidates %s before Apply and requires explicit reuse after restoration",
    (field) => {
      const initial = acknowledge(startSession("attractive"));
      const original = initial.draft.property[field]!;
      // Even spacing that validation would trim must invalidate exact applicability.
      const draft = edit(initial, field, `${original} `);
      expect(draft.applied).toEqual(initial.applied);
      expect(draft.location.acknowledgedKey).toBeNull();
      expect(currentLocationEvidence(draft)).toMatchObject({
        status: "unmatched",
        origin: null,
        fixture: null,
        items: [],
      });
      expect(panel(draft)).toContain("No matching sample evidence");
      expect(panel(draft)).not.toContain("Evidence details for");
      const applied = apply(draft);
      expect(currentLocationEvidence(applied).status).toBe("unmatched");
      if (field === "state") {
        // State uses the unchanged strict enum; trailing spaces remain invalid.
        expect(applied.errors).toHaveProperty("property.state");
        expect(currentAnalysis(applied)).toBeNull();
      } else expect(currentAnalysis(applied)).toEqual(currentAnalysis(initial));
      expect(acknowledge(applied)).toBe(applied);
      const restoredText = edit(applied, field, original);
      expect(currentLocationEvidence(restoredText).status).toBe("awaiting-origin");
      expect(currentLocationEvidence(acknowledge(restoredText)).status).toBe("complete");
    },
  );

  it.each(LOCATION_FIELDS)(
    "distinguishes exact %s null, undefined, empty, spacing and case",
    (field) => {
      const origin = sampleOrigin("attractive")!;
      const original = origin.inputs[field];
      const values = [null, undefined, "", " ", original, `${original} `, original.toLowerCase()];
      const keys = values.map((value) =>
        locationKey("attractive", origin.version, { ...origin.inputs, [field]: value }),
      );
      // Postcode has no case distinction; every other distinction still applies.
      expect(new Set(keys).size).toBe(new Set(values).size);
    },
  );

  it.each(LOCATION_FIELDS)("does not canonicalize a changed %s into applicability", (field) => {
    const state = acknowledge(startSession("attractive"));
    for (const value of [null, undefined, "", " "]) {
      const draft = {
        ...state,
        draft: { ...state.draft, property: { ...state.draft.property, [field]: value } },
      };
      expect(currentLocationEvidence(draft).status).toBe("unmatched");
    }
  });

  it("rejects a different sample identity even with copied address, origin and acknowledgement", () => {
    const original = acknowledge(startSession("attractive"));
    expect(currentLocationEvidence({ ...original, id: "challenging" }).status).toBe("unmatched");
    expect(
      currentLocationEvidence({
        ...original,
        location: { ...original.location, originVersion: "meranti-origin-v2" },
      }).status,
    ).toBe("unmatched");
    const origin = sampleOrigin("attractive")!;
    expect(locationKey("challenging", origin.version, origin.inputs)).not.toBe(
      locationKey("attractive", origin.version, origin.inputs),
    );
    expect(locationKey("attractive", "v2", origin.inputs)).not.toBe(
      locationKey("attractive", origin.version, origin.inputs),
    );
  });

  it("switches samples and back without retaining old evidence or acknowledgement", () => {
    const a = acknowledge(startSession("attractive"));
    const b = sessionReducer(a, { type: "select", id: "challenging" });
    expect(currentLocationEvidence(b).status).toBe("awaiting-origin");
    const bEvidence = currentLocationEvidence(acknowledge(b));
    expect(bEvidence.fixture?.id).toContain("senja-origin-v1");
    expect(bEvidence.items.every((item) => item.name.startsWith("Senja"))).toBe(true);
    expect(panel(acknowledge(b))).not.toContain("Meranti Link station");
    expect(
      currentLocationEvidence(sessionReducer(acknowledge(b), { type: "select", id: "attractive" }))
        .status,
    ).toBe("awaiting-origin");
  });

  it("restores only location inputs and requires acknowledgement; reset restores the full sample", () => {
    let state = acknowledge(startSession("attractive"));
    state = edit(state, "expected_monthly_rent", "3300");
    state = edit(state, "full_address", "An arbitrary new address");
    const restored = sessionReducer(state, { type: "restore-location" });
    expect(restored.draft.property.expected_monthly_rent).toBe("3300");
    expect(restored.draft.acquisition).toEqual(state.draft.acquisition);
    expect(restored.draft.property.full_address).toBe(
      createSample("attractive").property.full_address,
    );
    expect(currentLocationEvidence(restored).status).toBe("awaiting-origin");
    expect(currentLocationEvidence(acknowledge(restored)).status).toBe("complete");
    expect(sessionReducer(restored, { type: "reset" })).toEqual(startSession("attractive"));
  });

  it("never supplies an origin for a blank or arbitrary address", () => {
    const blank = edit(startSession("blank"), "full_address", "123 Arbitrary Street");
    expect(currentLocationEvidence(blank)).toMatchObject({
      status: "unmatched",
      origin: null,
      fixture: null,
      items: [],
    });
    expect(readLocationFixture("blank", "complete")).toBeNull();
    expect(acknowledge(blank)).toBe(blank);
    expect(sessionReducer(blank, { type: "restore-location" })).toBe(blank);
    expect(panel(blank)).toContain("No geocoding was performed");
    expect(panel(blank)).not.toContain("Use this sample origin");
    expect(panel(blank)).not.toContain("Invented Meranti grid origin");
  });

  it.each([
    ["property", "expected_monthly_rent", "3200"],
    ["property", "asking_price", "500000"],
    ["property", "target_purchase_price", "310000"],
    ["property", "bank_valuation", "320000"],
    ["property", "rent_verification_status", "estimated"],
    ["acquisition", "renovation_cost", "10000"],
    ["financing", "annual_interest_rate_percent", "5"],
    ["operating", "annual_maintenance_fee", "3500"],
  ] as const)(
    "retains evidence through financial-only %s.%s edits and Apply",
    (section, field, value) => {
      const initial = acknowledge(startSession("attractive"));
      const draft = sessionReducer(initial, {
        type: "edit",
        section: section as keyof SampleDraft,
        field,
        value,
      });
      expect(currentLocationEvidence(draft)).toEqual(currentLocationEvidence(initial));
      expect(currentAnalysis(draft)).toBeNull(); // Preserve M1's financial draft gate.
      const applied = apply(draft);
      expect(applied.errors).toEqual({});
      expect(currentLocationEvidence(applied)).toEqual(currentLocationEvidence(initial));
      expect(currentAnalysis(applied)).not.toBeNull();
    },
  );

  it("keeps evidence with an invalid financial draft and isolates returned fixture objects", () => {
    const initial = acknowledge(startSession("attractive"));
    const invalid = apply(edit(initial, "expected_monthly_rent", "-1"));
    expect(currentAnalysis(invalid)).toBeNull();
    expect(currentLocationEvidence(invalid)).toEqual(currentLocationEvidence(initial));
    sampleOrigin("attractive")!.inputs.full_address = "changed outside";
    const first = readLocationFixture("attractive", "complete")!;
    first.coverage.radiusM = 99;
    expect(sampleOrigin("attractive")!.inputs.full_address).not.toBe("changed outside");
    expect(readLocationFixture("attractive", "complete")!.coverage.radiusM).toBe(1500);
  });
});

describe("bounded sample evidence, provenance and presentation", () => {
  it("recovers from loading, unavailable, error and empty without reusing failed findings", () => {
    let state = acknowledge(startSession("attractive"));
    const key = state.location.acknowledgedKey;
    for (const scenario of ["loading", "error", "unavailable", "empty", "complete"] as const) {
      state = selectScenario(state, scenario);
      const evidence = currentLocationEvidence(state);
      expect(state.location.acknowledgedKey).toBe(key);
      expect(evidence.status).toBe(scenario);
      expect(evidence.items.length).toBe(scenario === "complete" ? 6 : 0);
    }
  });
  it.each(EVIDENCE_SCENARIOS)("renders a distinct %s state", (scenario) => {
    const state = selectScenario(acknowledge(startSession("attractive")), scenario);
    const evidence = currentLocationEvidence(state);
    const html = panel(state);
    expect(evidence.status).toBe(scenario);
    expect(html).toContain(`data-state="${scenario}"`);
    expect(html).toContain(evidence.message.replaceAll("&", "&amp;"));
    expect(html).toContain("Sample origin acknowledged");
    expect(html).toContain("Source, coverage &amp; missing data");
    if (["loading", "error", "unavailable"].includes(scenario)) {
      expect(evidence.items).toEqual([]);
      expect(html).not.toContain("supplied examples shown");
      expect(html).not.toContain("Filter fictional nearby examples");
      expect(html).toContain("No completed coverage result or amenity count");
    }
    if (scenario === "empty") {
      expect(evidence.items).toEqual([]);
      expect(evidence.fixture?.coverage.included).toEqual(CATEGORIES);
      expect(html).toContain("Successful known-empty fixture");
      expect(html).toContain("0 of 0 supplied examples");
      expect(html).toContain("not proof of no real nearby amenities");
    }
  });

  it("supplies all four categories with bounded distances and accessible filters/details", () => {
    const state = acknowledge(startSession("attractive"));
    const { fixture, items } = currentLocationEvidence(state);
    expect(items).toHaveLength(6);
    expect(new Set(items.map((p) => p.category))).toEqual(new Set(CATEGORIES));
    expect(fixture?.coverage).toMatchObject({ cap: 6, radiusM: 1500, missing: [] });
    const html = panel(state);
    expect(html).toContain('<fieldset class="category-filters">');
    expect(html).toContain("Filter fictional nearby examples");
    expect(html).toContain('aria-pressed="true">All examples');
    for (const category of CATEGORIES) {
      const filtered = filterPlaces(items, category);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((p) => p.category === category)).toBe(true);
      expect(html).toContain(CATEGORY_LABELS[category]);
    }
    expect(filterPlaces(items, "all")).toEqual(items);
    expect(items.every((p) => p.distance?.value !== undefined && p.distance.value <= 1500)).toBe(
      true,
    );
    for (const item of items) {
      expect(html).toContain(`Evidence details for ${item.name}`);
      expect(html).toContain(item.id);
      expect(html).toContain(distanceLabel(item.distance));
    }
  });

  it("distinguishes partial missing categories and missing measurements from zero", () => {
    const state = selectScenario(acknowledge(startSession("attractive")), "partial");
    const evidence = currentLocationEvidence(state);
    expect(evidence.items).toHaveLength(4);
    expect(evidence.fixture?.coverage.missing).toEqual(["education", "healthcare"]);
    expect(filterPlaces(evidence.items, "healthcare")).toEqual([]);
    expect(evidence.status).not.toBe("empty");
    const unknown = evidence.items.find((p) => p.distance === null)!;
    expect(distanceLabel(unknown.distance)).toBe("Distance unavailable · measurement missing");
    const html = panel(state);
    expect(html).toContain("Unknown distances cannot establish proximity");
    expect(html).toContain("Missing does not mean absent");
    expect(html).toContain("Distance unavailable");
    expect(html).not.toMatch(/(?:>|\s)0 m · straight-line distance/);
    expect(html).toContain("not provider coverage or the full neighbourhood");
    const filtered = renderToStaticMarkup(
      createElement(LocationFindings, { evidence, category: "healthcare" }),
    );
    expect(filtered).toContain("0 of 4 supplied examples shown");
    expect(filtered).toContain("No supplied healthcare examples in this filter");
    expect(filtered).toContain(
      "Coverage may be missing; this is not proof of no nearby amenities.",
    );
    expect(filtered).not.toContain("Community clinic");
  });

  it("labels measurements as straight-line metres without turning them into travel times", () => {
    expect(distanceLabel({ value: 1200, unit: "m", method: "straight-line" })).toBe(
      "1,200 m · straight-line distance",
    );
    expect(distanceLabel(null)).toContain("unavailable");
    const html = panel(acknowledge(startSession("attractive")));
    expect(html).toContain("No walking or driving time inferred");
    expect(html).toContain("Supplied invented grid measurement, not a route");
    expect(html).toContain("not travel times");
    expect(html).not.toMatch(/\d+\s*(?:min(?:ute)?s?|hours?)\b/i);
  });

  it.each(PRESETS)(
    "binds every $id evidence set to identity, origin version and seven strings",
    ({ id }) => {
      const origin = sampleOrigin(id)!;
      for (const scenario of EVIDENCE_SCENARIOS) {
        const fixture = readLocationFixture(id, scenario)!;
        expect(fixture.sampleId).toBe(id);
        expect(fixture.originVersion).toBe(origin.version);
        expect(fixture.inputKey).toBe(locationKey(id, origin.version, origin.inputs));
        expect(fixture.id).toContain("nearby-v1");
        expect(fixture.id).toContain(scenario);
        expect(fixture.source).toContain("synthetic, not independently verified");
        expect(fixture.authoredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fixture.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fixture.items.length).toBeLessThanOrEqual(fixture.coverage.cap);
        expect(fixture.items.every((p) => p.name.includes("Fictional"))).toBe(true);
      }
    },
  );

  it("exposes fixture preparation dates, stale dates, synthetic source and limitations", () => {
    const state = selectScenario(acknowledge(startSession("attractive")), "stale");
    const html = panel(state);
    for (const text of [
      "SYNTHETIC ONLY",
      "not independently verified",
      "2025-01-10",
      "2025-01-01",
      "no provider retrieval",
      "nearby-v1:stale",
      "Stale sample evidence",
      "No official Location Score",
      "No transport service, school quality, healthcare suitability, market or rental-demand inference",
      "No map, provider connection or cloud save",
      "Exact sample identity, origin version and all seven unmodified location strings",
    ])
      expect(html).toContain(text);
    const showcase = renderToStaticMarkup(createElement(Showcase));
    for (const field of LOCATION_FIELDS) expect(showcase).toContain(`id="property.${field}"`);
    expect(showcase).toContain("Synthetic demonstration");
    expect(showcase).toContain("Sample location inputs");
    expect(showcase).toContain("Use this sample origin");
  });
});

describe("financial and side-effect independence", () => {
  it.each(PRESETS)(
    "preserves the full $id analysis across every location state and action",
    ({ id }) => {
      const initial = startSession(id);
      const before = currentAnalysis(initial);
      const baselineBytes = JSON.stringify(initial.applied);
      for (const scenario of EVIDENCE_SCENARIOS) {
        const state = selectScenario(acknowledge(initial), scenario);
        currentLocationEvidence(state);
        filterPlaces(currentLocationEvidence(state).items, "healthcare");
        panel(state);
        // Includes exact returns, scenarios, score contributions, confidence, risks and recommendation.
        expect(currentAnalysis(state)).toEqual(before);
        expect(JSON.stringify(state.applied)).toBe(baselineBytes);
      }
      const unmatched = apply(
        edit(acknowledge(initial), "full_address", "Another fictional address"),
      );
      expect(currentLocationEvidence(unmatched).status).toBe("unmatched");
      // The coordinator also echoes property metadata. Only that deliberate
      // address edit differs; every engine output must stay exactly equal.
      expect({ ...currentAnalysis(unmatched), property: null }).toEqual({
        ...before,
        property: null,
      });
      expect(currentAnalysis(sessionReducer(initial, { type: "reset" }))).toEqual(before);
    },
  );

  it("executes every origin, filter, state and reset path without network, storage or authoritative writes", () => {
    const forbidden = vi.fn(() => {
      throw new Error("Unexpected external side effect");
    });
    for (const key of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"])
      vi.stubGlobal(key, forbidden);
    for (const key of ["localStorage", "sessionStorage"])
      vi.stubGlobal(key, { getItem: forbidden, setItem: forbidden, removeItem: forbidden });
    vi.stubGlobal("navigator", {
      sendBeacon: forbidden,
      geolocation: { getCurrentPosition: forbidden, watchPosition: forbidden },
    });
    for (const { id } of PRESETS) {
      const initial = startSession(id);
      for (const scenario of EVIDENCE_SCENARIOS) {
        const state = selectScenario(acknowledge(initial), scenario);
        const applied = JSON.stringify(state.applied);
        for (const category of CATEGORIES)
          filterPlaces(currentLocationEvidence(state).items, category);
        panel(state);
        expect(JSON.stringify(state.applied)).toBe(applied);
        const mismatch = edit(state, "city", "Arbitrary city");
        panel(mismatch);
        panel(acknowledge(sessionReducer(mismatch, { type: "restore-location" })));
        panel(sessionReducer(state, { type: "reset" }));
      }
    }
    expect(forbidden).not.toHaveBeenCalled();
    // The pre-existing reachable-source-graph and build guards also include these new imports.
    const source = readFileSync("src/showcase/location-fixtures.ts", "utf8");
    expect(source).not.toMatch(/from ["'].*(?:lib\/location|integrations|api|hooks)/);
  });
});
