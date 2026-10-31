import { beforeEach, it, expect, vi } from "vitest";
import { demoFixture } from "./m7-demo/fixture";
const state = vi.hoisted(() => ({
  snapshot: null as any,
  createFailure: false,
  writes: [] as string[],
}));
vi.mock("@/lib/property/property-api", () => ({
  listProperties: async () => (state.snapshot ? [state.snapshot.property] : []),
  getProperty: async () => state.snapshot?.property ?? null,
  createProperty: vi.fn(async ({ values, owner }) => {
    if (state.createFailure) throw Error("Creation outcome uncertain");
    state.snapshot = {
      property: { ...values, id: "demo-id", user_id: owner, revision: 1 },
      acquisition_costs: null,
      financing: null,
      operating_expenses: null,
    };
    state.writes.push("create");
    return state.snapshot.property;
  }),
  updateProperty: vi.fn(async ({ patch }) => {
    Object.assign(state.snapshot.property, patch);
    state.snapshot.property.revision++;
    return state.snapshot.property;
  }),
}));
vi.mock("@/lib/property/property-revision", () => ({
  getPropertySnapshot: async () => structuredClone(state.snapshot),
}));
vi.mock("@/lib/property/evidence-api", () => ({
  saveSectionEvidence: async (_s: unknown, section: string, evidence: unknown) => {
    state.snapshot[section === "properties" ? "property" : section].evidence_metadata = evidence;
    state.snapshot.property.revision++;
    state.writes.push("property-evidence");
  },
}));
vi.mock("@/lib/property/acquisition-api", () => ({
  saveAcquisitionCosts: async (
    _id: string,
    values: object,
    _current: unknown,
    revision: number,
    evidence: unknown,
  ) => {
    expect(revision).toBe(state.snapshot.property.revision);
    state.snapshot.acquisition_costs = { ...values, evidence_metadata: evidence };
    state.snapshot.property.revision++;
    state.writes.push("acquisition");
  },
}));
vi.mock("@/lib/property/financing-api", () => ({
  saveFinancing: async (
    _id: string,
    values: object,
    _current: unknown,
    revision: number,
    evidence: unknown,
  ) => {
    expect(revision).toBe(state.snapshot.property.revision);
    state.snapshot.financing = { ...values, evidence_metadata: evidence };
    state.snapshot.property.revision++;
    state.writes.push("financing");
  },
}));
vi.mock("@/lib/property/operating-expenses-api", () => ({
  saveOperatingExpenses: async (
    _id: string,
    values: object,
    _current: unknown,
    revision: number,
    evidence: unknown,
  ) => {
    expect(revision).toBe(state.snapshot.property.revision);
    state.snapshot.operating_expenses = { ...values, evidence_metadata: evidence };
    state.snapshot.property.revision++;
    state.writes.push("expenses");
  },
}));
vi.mock("@/lib/property/strategy-api", () => ({
  saveStrategyAssumptions: async (snapshot: any, values: object) => {
    expect(snapshot.property.revision).toBe(state.snapshot.property.revision);
    state.snapshot.property.investment_strategy_assumptions = values;
    state.snapshot.property.revision++;
    state.writes.push("strategies");
  },
}));
import { setupDemo } from "./m7-demo/run";
import { createProperty, updateProperty } from "@/lib/property/property-api";
beforeEach(() => {
  state.snapshot = null;
  state.createFailure = false;
  state.writes = [];
  vi.clearAllMocks();
});
const options = () => ({ create: true, beforeCreate: vi.fn(), recordId: vi.fn() });
it("uses successive revisions, confirms a fresh reload and reruns without duplicate writes", async () => {
  const opts = options();
  const saved = await setupDemo("synthetic-owner", opts);
  expect(saved.changed).toBe(true);
  expect(opts.beforeCreate).toHaveBeenCalledOnce();
  expect(opts.recordId).toHaveBeenCalledWith("demo-id");
  expect(state.writes).toEqual([
    "create",
    "property-evidence",
    "financing",
    "acquisition",
    "expenses",
    "strategies",
  ]);
  state.snapshot = JSON.parse(JSON.stringify(state.snapshot));
  const revision = state.snapshot.property.revision;
  const reloaded = await setupDemo("synthetic-owner", options());
  expect(reloaded).toMatchObject({ changed: false, id: "demo-id", results: saved.results });
  expect(state.snapshot.property.revision).toBe(revision);
  expect(createProperty).toHaveBeenCalledOnce();
  expect(updateProperty).not.toHaveBeenCalled();
});
it("never retries uncertain creation and records intent before dispatch", async () => {
  state.createFailure = true;
  const opts = options();
  await expect(setupDemo("synthetic-owner", opts)).rejects.toThrow("uncertain");
  expect(opts.beforeCreate).toHaveBeenCalledOnce();
  expect(createProperty).toHaveBeenCalledOnce();
  expect(opts.recordId).not.toHaveBeenCalled();
});
it("requires explicit review before replacing edited demo values", async () => {
  await setupDemo("synthetic-owner", options());
  state.snapshot.property.asking_price = 123;
  await expect(setupDemo("synthetic-owner", options())).rejects.toThrow(
    "--review-existing=demo-id",
  );
  expect(updateProperty).not.toHaveBeenCalled();
  expect(createProperty).toHaveBeenCalledOnce();
  const restored = await setupDemo("synthetic-owner", { ...options(), reviewedId: "demo-id" });
  expect(restored.changed).toBe(true);
  expect(state.snapshot.property.asking_price).toBe(demoFixture().property.asking_price);
});
