// Transport/refusal contracts only; actual DOM acceptance is in execute.mjs.
import { describe, it, expect } from "vitest";
import {
  createOperatingExpensesAdapter,
  fixtureRow,
  properties,
} from "./browser/operating-expenses/adapter";
const read = (
  s: ReturnType<typeof createOperatingExpensesAdapter>,
  p = "A1" as keyof typeof properties,
) =>
  s.client.from("operating_expenses").select("*").eq("property_id", properties[p].id).maybeSingle();
const update = (s: ReturnType<typeof createOperatingExpensesAdapter>) =>
  s.client
    .from("operating_expenses")
    .update(fixtureRow("A1", "changed")!)
    .eq("id", fixtureRow("A1", "baseline")!.id)
    .eq("property_id", properties.A1.id)
    .select("*")
    .single();
describe("expense extension of accepted B05 synthetic transport", () => {
  it("resets rows/identity and refuses unrelated tables/filters", async () => {
    const a = createOperatingExpensesAdapter(),
      b = createOperatingExpensesAdapter();
    a.seed("A1", "absent");
    expect((await read(a)).data).toBeNull();
    expect((await read(b)).data).toEqual(fixtureRow("A1", "baseline"));
    expect(() => a.client.from("properties")).toThrow();
    expect(() => a.client.from("acquisition_costs")).toThrow();
    expect(() => a.client.from("operating_expenses").eq("owner_id", "x")).toThrow();
  });
  it("uses the dispatched identity and both update filters", async () => {
    const s = createOperatingExpensesAdapter();
    s.switchIdentity("B");
    expect((await read(s)).error?.code).toBe("42501");
    expect((await read(s, "B1")).error).toBeNull();
    s.switchIdentity("A");
    s.planWrite({ mode: "confirm", hold: true });
    const pending = update(s);
    s.switchIdentity("expired");
    s.release(s.pending()[0]!);
    expect((await pending).error).toBeNull();
    expect((await read(s)).error?.code).toBe("42501");
    s.switchIdentity("A");
    expect(
      (
        await s.client
          .from("operating_expenses")
          .update(fixtureRow("A1", "changed")!)
          .eq("id", fixtureRow("A1", "baseline")!.id)
          .eq("property_id", properties.B1.id)
          .single()
      ).error?.code,
    ).toBe("42501");
  });
  it.each(["lost-committed", "lost-uncommitted"] as const)(
    "models %s independently from response",
    async (mode) => {
      const s = createOperatingExpensesAdapter();
      s.planWrite({ mode });
      await expect(update(s)).rejects.toThrow("B05_EXPENSE_RAW_SENTINEL");
      expect(s.inspect("A1")).toEqual(
        fixtureRow("A1", mode === "lost-committed" ? "changed" : "baseline"),
      );
      expect(s.operations).toHaveLength(1);
    },
  );
  it.each([
    "missing",
    "malformed",
    "server-value",
    "wrong-property",
    "omitted-field",
    "empty-id",
  ] as const)("models %s acknowledgement without altering committed row", async (mode) => {
    const s = createOperatingExpensesAdapter();
    s.planWrite({ mode });
    const response = await update(s);
    expect(response.data).not.toEqual(s.inspect("A1"));
    expect(s.inspect("A1")).toEqual(fixtureRow("A1", "changed"));
  });
  it("records copied annual payloads, consumes plans once and retains null versus zero", async () => {
    const s = createOperatingExpensesAdapter();
    s.planRead({ mode: "malformed", phase: "review" });
    expect((await read(s)).data).toEqual({ property_id: properties.A1.id });
    expect((await read(s)).data).toEqual(fixtureRow("A1", "baseline"));
    s.seed("A1", "zeros");
    const row = fixtureRow("A1", "nulls")!;
    row.annual_sinking_fund = 0;
    const pending = s.client
      .from("operating_expenses")
      .update(row)
      .eq("id", row.id)
      .eq("property_id", row.property_id)
      .single();
    row.annual_sinking_fund = 999;
    await pending;
    expect(s.inspect("A1")).toMatchObject({ annual_sinking_fund: 0, annual_maintenance_fee: null });
    expect(s.operations.at(-1)?.submitted?.annual_sinking_fund).toBe(0);
  });
});
