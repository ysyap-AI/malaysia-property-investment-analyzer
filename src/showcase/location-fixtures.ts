import type { SampleDraft, SampleId, SampleSession } from "./session";

// Showcase-only identities. Deliberately independent of the frozen V1 contracts.
export const LOCATION_FIELDS = [
  "project_name",
  "full_address",
  "city",
  "district",
  "state",
  "postcode",
  "country",
] as const;
export type LocationField = (typeof LOCATION_FIELDS)[number];
export const LOCATION_LABELS: Record<LocationField, string> = {
  project_name: "Project name",
  full_address: "Full address",
  city: "City",
  district: "District",
  state: "State",
  postcode: "Postcode",
  country: "Country",
};
export const CATEGORIES = ["transport", "convenience", "education", "healthcare"] as const;
export type Category = (typeof CATEGORIES)[number];
export type CategoryFilter = Category | "all";
export const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "All examples",
  transport: "Transport",
  convenience: "Convenience",
  education: "Education",
  healthcare: "Healthcare",
};
export const EVIDENCE_SCENARIOS = [
  "complete",
  "partial",
  "stale",
  "unavailable",
  "error",
  "empty",
  "loading",
] as const;
export type EvidenceScenario = (typeof EVIDENCE_SCENARIOS)[number];
export const SCENARIO_LABELS: Record<EvidenceScenario, string> = {
  complete: "Complete fixture",
  partial: "Partial coverage",
  stale: "Stale fixture",
  unavailable: "Unavailable evidence",
  error: "Simulated error",
  empty: "Known-empty fixture",
  loading: "Simulated loading",
};

type PresetId = Exclude<SampleId, "blank">;
type LocationInputs = Record<Exclude<LocationField, "state">, string> & {
  state: NonNullable<SampleDraft["property"]["state"]>;
};
type SampleOrigin = {
  sampleId: PresetId;
  version: string;
  description: string;
  inputs: LocationInputs;
};
const origins: Record<PresetId, SampleOrigin> = {
  attractive: {
    sampleId: "attractive",
    version: "meranti-origin-v1",
    description: "Invented Meranti grid origin (0 m east, 0 m north). No geographic coordinates.",
    inputs: {
      project_name: "Meranti Court · Fictional",
      full_address: "12 Jalan Rekaan A · Fictional address",
      city: "Bandar Contoh A · Fictional",
      district: "Daerah Contoh A · Fictional",
      state: "Selangor",
      postcode: "00000",
      country: "Malaysia · Synthetic sample",
    },
  },
  challenging: {
    sampleId: "challenging",
    version: "senja-origin-v1",
    description: "Invented Senja grid origin (0 m east, 0 m north). No geographic coordinates.",
    inputs: {
      project_name: "Senja Heights · Fictional",
      full_address: "24 Jalan Rekaan B · Fictional address",
      city: "Bandar Contoh B · Fictional",
      district: "Daerah Contoh B · Fictional",
      state: "Johor",
      postcode: "00000",
      country: "Malaysia · Synthetic sample",
    },
  },
  incomplete: {
    sampleId: "incomplete",
    version: "rimba-origin-v1",
    description: "Invented Rimba grid origin (0 m east, 0 m north). No geographic coordinates.",
    inputs: {
      project_name: "Rimba Residences · Fictional",
      full_address: "36 Jalan Rekaan C · Fictional address",
      city: "Bandar Contoh C · Fictional",
      district: "Daerah Contoh C · Fictional",
      state: "Penang",
      postcode: "00000",
      country: "Malaysia · Synthetic sample",
    },
  },
};
export function sampleOrigin(id: SampleId): SampleOrigin | null {
  // Return fresh data so callers cannot mutate future fixture identity.
  return id === "blank" ? null : structuredClone(origins[id]);
}
export function defaultEvidenceScenario(id: SampleId): EvidenceScenario {
  return id === "challenging" ? "partial" : id === "incomplete" ? "stale" : "complete";
}
export function locationKey(
  id: SampleId,
  version: string,
  inputs: Partial<Record<LocationField, string | null | undefined>>,
) {
  // Preserve null, undefined, empty, case and spacing; never normalize applicability.
  return JSON.stringify([
    id,
    version,
    ...LOCATION_FIELDS.map((field) => {
      const value = inputs[field];
      return value === undefined ? ["undefined"] : value === null ? ["null"] : ["string", value];
    }),
  ]);
}

export type SamplePlace = {
  id: string;
  name: string;
  category: Category;
  distance: { value: number; unit: "m"; method: "straight-line" } | null;
};
export type LocationFixture = {
  id: string;
  sampleId: SampleId;
  originVersion: string;
  inputKey: string;
  scenario: EvidenceScenario;
  source: string;
  authoredOn: string;
  asOf: string;
  coverage: {
    radiusM: number;
    cap: number;
    included: readonly Category[];
    missing: readonly Category[];
  };
  items: readonly SamplePlace[];
};
export function readLocationFixture(
  id: SampleId,
  scenario: EvidenceScenario,
): LocationFixture | null {
  const origin = sampleOrigin(id);
  if (!origin) return null;
  const partial = scenario === "partial";
  const base = id === "attractive" ? "Meranti" : id === "challenging" ? "Senja" : "Rimba";
  const examples: readonly [Category, string, number | null][] = [
    ["transport", "Link station", 420],
    ["transport", "Local bus stop", 260],
    ["convenience", "Pantry grocer", 610],
    ["convenience", "Corner store", partial ? null : 180],
    ["education", "Learning academy", 1200],
    ["healthcare", "Community clinic", 950],
  ];
  const hasItems = scenario === "complete" || partial || scenario === "stale";
  return {
    id: `${id}:${origin.version}:nearby-v1:${scenario}`,
    sampleId: id,
    originVersion: origin.version,
    inputKey: locationKey(id, origin.version, origin.inputs),
    scenario,
    source: "MPIA invented nearby fixtures v1 · synthetic, not independently verified",
    authoredOn: scenario === "stale" ? "2025-01-10" : "2026-10-23",
    asOf: scenario === "stale" ? "2025-01-01" : "2026-10-23",
    coverage: {
      radiusM: 1500,
      cap: 6,
      included: partial ? ["transport", "convenience"] : [...CATEGORIES],
      missing: partial ? ["education", "healthcare"] : [],
    },
    items: hasItems
      ? examples.flatMap(([category, label, distance], i) =>
          partial && (category === "education" || category === "healthcare")
            ? []
            : [
                {
                  id: `${id}-invented-${i + 1}`,
                  name: `${base} ${label} · Fictional`,
                  category,
                  distance:
                    distance === null
                      ? null
                      : { value: distance, unit: "m" as const, method: "straight-line" as const },
                },
              ],
        )
      : [],
  };
}
export function distanceLabel(distance: SamplePlace["distance"]) {
  return distance === null
    ? "Distance unavailable · measurement missing"
    : `${distance.value.toLocaleString("en-MY")} m · straight-line distance`;
}
export function filterPlaces(items: readonly SamplePlace[], category: CategoryFilter) {
  return items.filter((item) => category === "all" || item.category === category);
}
export type LocationEvidence = {
  status: EvidenceScenario | "unmatched" | "awaiting-origin";
  message: string;
  origin: SampleOrigin | null;
  fixture: LocationFixture | null;
  items: readonly SamplePlace[];
};
export function currentLocationEvidence(session: SampleSession): LocationEvidence {
  const origin = sampleOrigin(session.id);
  const key = locationKey(session.id, session.location.originVersion, session.draft.property);
  const matches =
    origin &&
    session.location.originVersion === origin.version &&
    key === locationKey(session.id, origin.version, origin.inputs);
  if (!matches)
    return {
      status: "unmatched",
      message:
        "No matching sample evidence. Evidence unavailable for these location inputs. No geocoding was performed.",
      origin: null,
      fixture: null,
      items: [],
    };
  if (session.location.acknowledgedKey !== key)
    return {
      status: "awaiting-origin",
      message: "Acknowledge this invented sample origin to explore its evidence.",
      origin,
      fixture: null,
      items: [],
    };
  const fixture = readLocationFixture(session.id, session.location.scenario)!;
  // Every evidence set carries the exact same binding as the acknowledgement.
  if (fixture.inputKey !== key)
    return {
      status: "unmatched",
      message: "No matching sample evidence.",
      origin: null,
      fixture: null,
      items: [],
    };
  const messages: Record<EvidenceScenario, string> = {
    complete:
      "Complete sample list within the declared fixture boundary. This is not exhaustive real-world coverage.",
    partial:
      "Partial coverage. Education and healthcare examples are missing, and one distance is unknown. Missing does not mean absent.",
    stale:
      "Stale sample evidence. Historical fixture dates only; these examples cannot establish current conditions.",
    unavailable: "Sample evidence unavailable. No findings or amenity counts can be concluded.",
    error: "Simulated evidence error. No request was sent. This is not a successful empty result.",
    empty:
      "Successful known-empty fixture: zero supplied examples across all four categories within 1,500 m, capped at 6. This says nothing about real nearby amenities.",
    loading:
      "Loading sample evidence (simulated, no request). Choose another evidence example to finish the demonstration. No findings yet.",
  };
  return {
    status: fixture.scenario,
    message: messages[fixture.scenario],
    origin,
    fixture,
    items: fixture.items,
  };
}
