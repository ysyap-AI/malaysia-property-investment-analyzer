// Offline transport checks only. These do not execute AB01–AB16 or render a DOM.
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  createSyntheticAdapter,
  fixtureRow,
  properties,
  variants,
} from "./browser/acquisition/adapter";

const read = (s: ReturnType<typeof createSyntheticAdapter>, p = "A1" as keyof typeof properties) =>
  s.client.from("acquisition_costs").select("*").eq("property_id", properties[p].id).maybeSingle();
const values = fixtureRow("A1", "baseline")!;
const update = (s: ReturnType<typeof createSyntheticAdapter>) =>
  s.client.from("acquisition_costs").update(values).eq("id", values.id).select("*").single();
afterEach(() => vi.doUnmock("@/integrations/supabase/external-client"));

describe("B05 memory transport, not browser coverage", () => {
  it("contains all invented preflight variants and no shared persisted state", async () => {
    const a = createSyntheticAdapter(),
      b = createSyntheticAdapter();
    for (const variant of variants) {
      a.seed("A1", variant);
      expect((await read(a)).data).toEqual(fixtureRow("A1", variant));
    }
    expect((await read(b)).data).toEqual(fixtureRow("A1", "baseline"));
    expect(fixtureRow("A1", "zeros")?.purchase_price).toBe(0);
    expect(fixtureRow("A1", "nulls")?.purchase_price).toBeNull();
    expect(fixtureRow("A1", "optional-only")?.other_cost).toBe(25);
  });
  it("holds existence reads and writes independently and counts each dispatch", async () => {
    const s = createSyntheticAdapter();
    s.planRead({ mode: "record", phase: "existence", hold: true });
    const pending = read(s);
    expect(s.pending()).toEqual([1]);
    expect(s.operations[0]).toMatchObject({ method: "GET", phase: "existence", state: "held" });
    s.release(1);
    await pending;
    s.planWrite({ mode: "confirm", hold: true });
    const write = update(s);
    expect(s.pending()).toEqual([2]);
    s.release(2);
    await write;
    expect(s.operations.map((o) => o.method)).toEqual(["GET", "UPDATE"]);
    expect(s.pending()).toEqual([]);
  });
  it("simulates statement rejection without altering the row", async () => {
    const s = createSyntheticAdapter();
    s.planWrite({ mode: "reject" });
    expect((await update(s)).error?.code).toBe("23514");
    expect(s.inspect("A1")).toEqual(values);
  });
  it.each([true, false])("distinguishes response loss with committed=%s", async (committed) => {
    const s = createSyntheticAdapter();
    s.seed("A1", "changed");
    s.planWrite({ mode: committed ? "lost-committed" : "lost-uncommitted" });
    await expect(update(s)).rejects.toThrow("B05_RAW_ERROR_SENTINEL");
    expect(s.inspect("A1")?.purchase_price).toBe(committed ? 600000 : 630000);
  });
  it.each(["missing", "malformed"] as const)(
    "commits but returns a %s representation",
    async (mode) => {
      const s = createSyntheticAdapter();
      s.planWrite({ mode });
      const reply = await update(s);
      expect(reply.error).toBeNull();
      expect(reply.data).not.toEqual(values);
      expect(s.inspect("A1")).toEqual(values);
    },
  );
  it("can fail a follow-up read independently of successful confirmation", async () => {
    const s = createSyntheticAdapter();
    expect((await update(s)).data).toEqual(values);
    s.planRead({ mode: "error", phase: "follow-up" });
    expect((await read(s)).error).not.toBeNull();
    expect((await read(s)).data).toEqual(values);
  });
  it("enforces invented ownership and discards auth subscriptions", async () => {
    const s = createSyntheticAdapter(),
      events: string[] = [];
    const subscription = s.client.auth.onAuthStateChange((event) => events.push(event));
    await Promise.resolve();
    s.switchIdentity("B");
    expect((await read(s)).error?.code).toBe("42501");
    expect((await read(s, "B1")).error).toBeNull();
    s.switchIdentity("expired");
    expect((await read(s, "B1")).error?.code).toBe("42501");
    subscription.data.subscription.unsubscribe();
    s.switchIdentity("anonymous");
    expect(events).toEqual(["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESH_FAILED"]);
    expect((await s.client.auth.getSession()).data.session).toBeNull();
  });
  it("records metadata only, excluding costs, account emails and backend sentinels", async () => {
    const s = createSyntheticAdapter();
    s.planWrite({ mode: "reject" });
    await update(s);
    expect(JSON.stringify(s.operations)).not.toMatch(
      /600000|00123|example.invalid|RAW_ERROR|message|payload/,
    );
    expect(() => s.client.from("properties")).toThrow();
  });
  it("runs the revision API through an explicitly stubbed RPC bridge to the legacy memory transport", async () => {
    vi.resetModules();
    const { synthetic } = await import("./browser/acquisition/adapter");
    let revision = 1;
    const rpc = vi.fn(async (_name: string, args: { p_id: string; p_revision: number; p_values: object }) => {
      if (args.p_revision !== revision) return { data: null, error: { code: "PT409" } };
      const existing = await synthetic.client.from("acquisition_costs").select("*").eq("property_id", args.p_id).maybeSingle();
      const write = existing.data
        ? synthetic.client.from("acquisition_costs").update(args.p_values).eq("id", existing.data.id)
        : synthetic.client.from("acquisition_costs").insert({ ...args.p_values, property_id: args.p_id });
      const reply = await write.select("*").single();
      return reply.error ? reply : { data: { record: reply.data, revision: ++revision }, error: null };
    });
    vi.doMock("@/integrations/supabase/external-client", () => ({ supabase: { ...synthetic.client, rpc } }));
    const api = await import("../src/lib/property/acquisition-api");
    const { id: _id, property_id: _property, created_at: _created, updated_at: _updated, ...input } = values;
    synthetic.seed("A1", "absent");
    expect(await api.saveAcquisitionCosts(properties.A1.id, input, () => true, 1)).toEqual(values);
    expect(await api.saveAcquisitionCosts(properties.A1.id, input, () => true, 2)).toEqual(values);
    synthetic.planWrite({ mode: "reject" });
    await expect(api.saveAcquisitionCosts(properties.A1.id, input, () => true, 3)).rejects.toMatchObject({ outcome: "rejected" });
    synthetic.planWrite({ mode: "lost-committed" });
    await expect(api.saveAcquisitionCosts(properties.A1.id, input, () => true, 3)).rejects.toMatchObject({ outcome: "uncertain" });
    expect(rpc).toHaveBeenCalledTimes(4);
  });
  it("vetoes a stale editor before RPC dispatch without an existence read", async () => {
    vi.resetModules();
    const rpc = vi.fn();
    vi.doMock("@/integrations/supabase/external-client", () => ({ supabase: { rpc } }));
    const api = await import("../src/lib/property/acquisition-api");
    await expect(api.saveAcquisitionCosts(properties.A1.id, values, () => false, 1)).rejects.toMatchObject({ outcome: "not-sent" });
    expect(rpc).not.toHaveBeenCalled();
  });
});
