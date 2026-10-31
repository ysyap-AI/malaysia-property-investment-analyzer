import { beforeEach, it, expect, vi } from "vitest";
const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: { rpc, auth: { getUser } },
}));
import { saveStrategyAssumptions } from "@/lib/property/strategy-api";
import { QueryClient } from "@tanstack/react-query";
import {
  trackFinancialWrite,
  confirmationKey,
  financialAvailability,
} from "@/lib/property/financial-confirmation";
import { plan, snapshot } from "./strategies-fixtures";
beforeEach(() => {
  rpc.mockReset();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
});
const reply = () => ({
  data: {
    revision: 5,
    record: { ...snapshot().property, revision: 5, investment_strategy_assumptions: plan() },
  },
  error: null,
});
it("sends exactly the strategy plan, revision and owner-bound identity", async () => {
  rpc.mockResolvedValue(reply());
  await expect(
    saveStrategyAssumptions(snapshot(), plan(), "owner", () => true),
  ).resolves.toMatchObject({ revision: 5 });
  expect(rpc).toHaveBeenCalledExactlyOnceWith("m4_write_property", {
    p_id: "p",
    p_revision: 4,
    p_table: "properties",
    p_values: { investment_strategy_assumptions: plan() },
  });
});
it.each(["identity", "lifetime", "revision", "shape"])(
  "does not send expired or invalid %s",
  async (kind) => {
    const s = snapshot(),
      a = plan();
    if (kind === "identity")
      getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    if (kind === "revision") s.property.revision = 0;
    if (kind === "shape") a.keep.horizonMonths = -1;
    await expect(
      saveStrategyAssumptions(s, a, "owner", () => kind !== "lifetime"),
    ).rejects.toMatchObject({ outcome: "not-sent" });
    expect(rpc).not.toHaveBeenCalled();
  },
);
it.each(["PT409", "23514", "network"])("classifies conflict/rejection/unknown %s", async (kind) => {
  if (kind === "network") rpc.mockRejectedValue(Error());
  else rpc.mockResolvedValue({ data: null, error: { code: kind } });
  await expect(
    saveStrategyAssumptions(snapshot(), plan(), "owner", () => true),
  ).rejects.toMatchObject({
    outcome: kind === "PT409" ? "conflict" : kind === "23514" ? "rejected" : "uncertain",
  });
});
it.each(["amount", "plan", "revision", "missing"])(
  "rejects misleading acknowledgment %s",
  async (kind) => {
    const r = reply();
    if (kind === "amount") r.data.record.expected_monthly_rent = 1;
    if (kind === "plan") r.data.record.investment_strategy_assumptions.keep.horizonMonths = 1;
    if (kind === "revision") r.data.revision = 4;
    rpc.mockResolvedValue(kind === "missing" ? { data: null, error: null } : r);
    await expect(
      saveStrategyAssumptions(snapshot(), plan(), "owner", () => true),
    ).rejects.toMatchObject({ outcome: "uncertain" });
  },
);
it("a matching cache write cannot confirm an acknowledged save; a fresh network read can", async () => {
  const client = new QueryClient(),
    key = confirmationKey("owner", "p");
  await trackFinancialWrite(
    client,
    "owner",
    "p",
    "propertyEvidence",
    async () => reply().data.record,
  );
  client.setQueryData(["properties", "p"], reply().data.record);
  expect(client.getQueryData<any>(key).propertyEvidence.outcome).toBe("acknowledged");
  await client.fetchQuery({
    queryKey: ["properties", "p"],
    queryFn: async () => reply().data.record,
    staleTime: 0,
  });
  expect(client.getQueryData<any>(key).propertyEvidence.outcome).toBe("saved");
  client.clear();
});
it("uncertain strategy attempts remain blocked even after matching network reads", async () => {
  const client = new QueryClient(),
    key = confirmationKey("owner", "p");
  await expect(
    trackFinancialWrite(client, "owner", "p", "propertyEvidence", async () => {
      throw Error();
    }),
  ).rejects.toThrow();
  await client.fetchQuery({
    queryKey: ["properties", "p"],
    queryFn: async () => reply().data.record,
  });
  const state = client.getQueryData<any>(key);
  expect(state.propertyEvidence.outcome).toBe("uncertain");
  expect(financialAvailability(true, state, [], false).current).toBe(false);
  client.clear();
});
