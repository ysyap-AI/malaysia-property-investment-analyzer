import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import {
  confirmationKey,
  financialReadKey,
  trackFinancialWrite,
  type FinancialConfirmation,
  type FinancialSection,
} from "@/lib/property/financial-confirmation";
import { createPropertyFixture, PROPERTY_FIXTURE_IDS } from "./fixtures/phase1-properties";

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "owner" }, loading: false }) }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
const id = "confirmation-property";
const sections: FinancialSection[] = ["acquisition", "financing", "expenses"];
let client: QueryClient;
let analysis: ReturnType<typeof usePropertyAnalysis>;
const state = (who = "owner", property = id) =>
  client.getQueryData<FinancialConfirmation>(confirmationKey(who, property)) ?? {};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function render() {
  function Probe() {
    analysis = usePropertyAnalysis(id);
    return null;
  }
  renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(Probe)));
  return analysis;
}
async function refreshParent() {
  const key = ["properties", id], row = client.getQueryData(key);
  await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
}
function seed(f = createPropertyFixture("P01")) {
  for (const [key, data] of Object.entries({
    properties: { ...f.property, user_id: "owner" },
    "acquisition-costs": f.acquisitionCosts,
    financing: f.financing,
    "operating-expenses": f.operatingExpenses,
  }))
    client.setQueryData([key, id], data);
  return f;
}
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  seed();
});
afterEach(() => client.clear());

describe("shared confirmation with the real query cache and analysis", () => {
  it("independent section settlement cannot clear another section's unresolved write", async () => {
    const first = deferred<object>(),
      second = deferred<object>();
    const a = trackFinancialWrite(client, "owner", id, "acquisition", () => first.promise);
    const b = trackFinancialWrite(client, "owner", id, "expenses", () => second.promise);
    first.reject({ outcome: "uncertain" });
    await expect(a).rejects.toEqual({ outcome: "uncertain" });
    second.reject({ outcome: "rejected" });
    await expect(b).rejects.toEqual({ outcome: "rejected" });
    expect(state().acquisition?.outcome).toBe("uncertain");
    expect(state().expenses?.outcome).toBe("rejected");
    expect(render().loadState).toBe("unavailable");
  });
  it("cache-maintenance failure preserves acknowledgment and waits for network recovery", async () => {
    const cancel = vi
      .spyOn(client, "cancelQueries")
      .mockRejectedValueOnce(Error("synthetic cache failure"));
    await expect(
      trackFinancialWrite(client, "owner", id, "financing", async () => ({ confirmed: true })),
    ).resolves.toEqual({ confirmed: true });
    expect(state().financing?.outcome).toBe("saved-refresh-failed");
    expect(render().availability.current).toBe(false);
    cancel.mockRestore();
    const key = financialReadKey("financing", id),
      row = client.getQueryData(key);
    await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
    expect(render().availability.current).toBe(true);
  });
  it("paused required reads and foreign cached ownership cannot produce a positive assessment", () => {
    const query = client
      .getQueryCache()
      .find({ queryKey: financialReadKey("expenses", id), exact: true })!;
    query.setState({ fetchStatus: "paused" });
    expect(render().availability.current).toBe(false);
    query.setState({ fetchStatus: "idle" });
    client.setQueryData(["properties", id], {
      ...createPropertyFixture("P01").property,
      user_id: "other",
    });
    expect(render().availability.current).toBe(false);
    expect(analysis.recommendation.recommendation).toBe("INSUFFICIENT DATA");
  });
  it.each(PROPERTY_FIXTURE_IDS)("%s stable qualified inputs retain frozen outputs", (fixtureId) => {
    const f = seed(createPropertyFixture(fixtureId));
    const expected = analyzeProperty({
      property: f.property,
      acquisition: f.acquisitionCosts,
      financing: f.financing,
      operating: f.operatingExpenses,
    });
    expect(render().availability.current).toBe(true);
    expect(analysis).toMatchObject(expected);
  });
  for (const section of sections) {
    it(`${section} pending/unknown survives consumers and matching reads without duplicate writes`, async () => {
      const attempt = deferred<object>(),
        op = vi.fn(() => attempt.promise);
      const saving = trackFinancialWrite(client, "owner", id, section, op);
      expect(render().availability.current).toBe(false);
      expect(analysis.recommendation.recommendation).toBe("INSUFFICIENT DATA");
      await expect(trackFinancialWrite(client, "owner", id, section, op)).rejects.toThrow(
        "awaiting",
      );
      attempt.reject({ outcome: "uncertain" });
      await expect(saving).rejects.toEqual({ outcome: "uncertain" });
      const key = financialReadKey(section, id),
        row = client.getQueryData(key);
      await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
      expect(state()[section]?.outcome).toBe("uncertain");
      expect(render().availability.current).toBe(false);
      expect(op).toHaveBeenCalledOnce();
      expect(state("other")[section]).toBeUndefined();
      expect(state("owner", "other-property")[section]).toBeUndefined();
    });
    it.each(["not-sent", "rejected"])(
      `${section} %s permits successfully read saved assessment`,
      async (outcome) => {
        await expect(
          trackFinancialWrite(client, "owner", id, section, async () => {
            throw { outcome };
          }),
        ).rejects.toEqual({ outcome });
        expect(state()[section]?.outcome).toBe(outcome);
        expect(render().availability.current).toBe(true);
      },
    );
    it(`${section} requires a post-ack network generation, including failed-refresh recovery`, async () => {
      await trackFinancialWrite(client, "owner", id, section, async () => ({}));
      const key = financialReadKey(section, id),
        row = client.getQueryData(key);
      client.setQueryData(key, row);
      expect(state()[section]?.outcome).toBe("acknowledged");
      expect(render().availability.current).toBe(false);
      await expect(
        client.fetchQuery({
          queryKey: key,
          queryFn: async () => {
            throw Error("synthetic read failure");
          },
          staleTime: 0,
        }),
      ).rejects.toThrow();
      expect(state()[section]?.outcome).toBe("saved-refresh-failed");
      expect(render().availability.current).toBe(false);
      await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
      expect(state()[section]?.outcome).toBe("saved");
      expect(client.getQueryState(["properties", id])?.isInvalidated).toBe(true);
      await refreshParent();
      expect(render().availability.current).toBe(true);
    });
    it(`${section} cached unchanged/changed/missing/failed required reads gate and recover`, async () => {
      const key = financialReadKey(section, id),
        row = client.getQueryData(key);
      for (const next of [row, { ...(row as object) }, null]) {
        const read = deferred<unknown>();
        const fetching = client.fetchQuery({
          queryKey: key,
          queryFn: () => read.promise,
          staleTime: 0,
        });
        expect(render().isLoading).toBe(false);
        expect(analysis.availability.current).toBe(false);
        read.resolve(next);
        await fetching;
        expect(render().availability.current).toBe(true);
      }
      await expect(
        client.fetchQuery({
          queryKey: key,
          queryFn: async () => {
            throw Error("unavailable");
          },
          staleTime: 0,
        }),
      ).rejects.toThrow();
      expect(render().availability.current).toBe(false);
      await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
      expect(render().availability.current).toBe(true);
    });
  }
  it("invalidation without fetch and unrelated held reads have distinct scope", async () => {
    const unrelated = deferred<object>();
    const read = client.fetchQuery({ queryKey: ["unrelated"], queryFn: () => unrelated.promise });
    expect(render().availability.current).toBe(true);
    await client.invalidateQueries({
      queryKey: financialReadKey("expenses", id),
      refetchType: "none",
    });
    expect(render().availability.current).toBe(false);
    unrelated.resolve({});
    await read;
  });
  it("cache clear fences an old write even after the identical account/property key is recreated", async () => {
    const old = deferred<object>();
    const saving = trackFinancialWrite(client, "owner", id, "financing", () => old.promise);
    client.clear();
    seed();
    await trackFinancialWrite(client, "owner", id, "financing", async () => ({}));
    const key = financialReadKey("financing", id),
      row = client.getQueryData(key);
    await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
    old.resolve({});
    await saving;
    expect(state().financing?.outcome).toBe("saved");
    await refreshParent();
    expect(render().availability.current).toBe(true);
  });
  it("an old held read cannot clear a newer write acknowledgment", async () => {
    const key = financialReadKey("financing", id),
      row = client.getQueryData(key),
      old = deferred<unknown>();
    const reading = client
      .fetchQuery({ queryKey: key, queryFn: () => old.promise, staleTime: 0 })
      .catch(() => null);
    await trackFinancialWrite(client, "owner", id, "financing", async () => ({}));
    old.resolve(row);
    await reading;
    expect(state().financing?.outcome).toBe("acknowledged");
    await client.fetchQuery({ queryKey: key, queryFn: async () => row, staleTime: 0 });
    expect(state().financing?.outcome).toBe("saved");
  });
});
