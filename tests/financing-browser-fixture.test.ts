// Adapter contract checks; these do not render React or count as browser acceptance.
import { describe, it, expect } from "vitest";
import { createFinancingAdapter, fixtureRow, properties } from "./browser/financing/adapter";

const read = (
  s: ReturnType<typeof createFinancingAdapter>,
  property = "A1" as keyof typeof properties,
) =>
  s.client.from("financing").select("*").eq("property_id", properties[property].id).maybeSingle();
const update = (s: ReturnType<typeof createFinancingAdapter>) =>
  s.client
    .from("financing")
    .update(fixtureRow("A1", "changed")!)
    .eq("id", fixtureRow("A1", "baseline")!.id)
    .select("*")
    .single();

describe("financing extension of accepted synthetic transport", () => {
  it("resets rows and identity independently and routes only two permitted tables", async () => {
    const a = createFinancingAdapter(),
      b = createFinancingAdapter();
    a.seed("A1", "absent");
    expect((await read(a)).data).toBeNull();
    expect((await read(b)).data).toEqual(fixtureRow("A1", "baseline"));
    expect(() => a.client.from("properties")).toThrow();
    expect(
      (
        await a.client
          .from("acquisition_costs")
          .select("*")
          .eq("property_id", properties.A1.id)
          .maybeSingle()
      ).data,
    ).toMatchObject({ purchase_price: 600000 });
  });
  it("uses original synthetic Auth identity for ownership including held requests", async () => {
    const s = createFinancingAdapter();
    s.switchIdentity("B");
    expect((await read(s)).error?.code).toBe("42501");
    expect((await read(s, "B1")).error).toBeNull();
    expect((await update(s)).error?.code).toBe("42501");
    s.switchIdentity("A");
    s.planWrite({ mode: "confirm", hold: true });
    const pending = update(s);
    s.switchIdentity("anonymous");
    s.release(s.pending()[0]!);
    expect((await pending).error).toBeNull(); // already dispatched A request may commit
    expect((await read(s)).error?.code).toBe("42501");
  });
  it("keeps acquisition/financing plans separate and records immutable invented dispatch values", async () => {
    const s = createFinancingAdapter();
    s.planRead({ mode: "error", phase: "existence" });
    s.acquisition.planRead({ mode: "absent" });
    expect((await read(s)).error).not.toBeNull();
    expect(
      (
        await s.client
          .from("acquisition_costs")
          .select("*")
          .eq("property_id", properties.A1.id)
          .maybeSingle()
      ).data,
    ).toBeNull();
    s.planWrite({ mode: "confirm", hold: true });
    const pending = update(s);
    s.acquisition.seed("A1", "changed");
    s.release(s.pending()[0]!);
    await pending;
    expect(s.operations.at(-1)).toMatchObject({
      acquisitionPriceAtDispatch: 600000,
      submitted: { loan_amount: 220000 },
      state: "finished",
    });
  });
  it.each(["lost-committed", "lost-uncommitted"] as const)(
    "models %s without retry",
    async (mode) => {
      const s = createFinancingAdapter();
      s.planWrite({ mode });
      await expect(update(s)).rejects.toThrow("B05_FINANCING_RAW_SENTINEL");
      expect(s.inspect("A1")).toEqual(
        fixtureRow("A1", mode === "lost-committed" ? "changed" : "baseline"),
      );
      expect(s.operations).toHaveLength(1);
    },
  );
  it.each(["missing", "malformed", "server-value"] as const)(
    "models %s returned row independently of committed row",
    async (mode) => {
      const s = createFinancingAdapter();
      s.planWrite({ mode });
      const response = await update(s);
      expect(response.data).not.toEqual(s.inspect("A1"));
      expect(s.inspect("A1")).toEqual(fixtureRow("A1", "changed"));
    },
  );
});
