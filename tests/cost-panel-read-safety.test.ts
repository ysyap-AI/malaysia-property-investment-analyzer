import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider, type UseMutationOptions } from "@tanstack/react-query";
import { AcquisitionCostsPanel } from "@/components/property/AcquisitionCostsPanel";
import { OperatingExpensesPanel } from "@/components/property/OperatingExpensesPanel";
import { FinancingPanel } from "@/components/property/FinancingPanel";
import { acquisitionCostsSchema, emptyAcquisitionForm } from "@/lib/property/acquisition-fields";

const state = vi.hoisted(() => ({
  save: vi.fn(),
  mutation: undefined as undefined | ((attempt?: unknown) => Promise<unknown>),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "synthetic-owner" }, loading: false }),
}));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: {} }));
vi.mock("@/lib/property/acquisition-api", async (original) => ({
  ...(await original<typeof import("@/lib/property/acquisition-api")>()),
  saveAcquisitionCosts: state.save,
}));
vi.mock("@/lib/property/operating-expenses-api", async (original) => ({
  ...(await original<typeof import("@/lib/property/operating-expenses-api")>()),
  saveOperatingExpenses: state.save,
}));
vi.mock("@/lib/property/financing-api", async (original) => ({
  ...(await original<typeof import("@/lib/property/financing-api")>()),
  saveFinancing: state.save,
}));
vi.mock("@tanstack/react-query", async (original) => {
  const actual = await original<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: (options: UseMutationOptions<unknown, Error, unknown>) => {
      state.mutation = (attempt) => options.mutationFn!(attempt, { client, meta: undefined });
      return actual.useMutation(options);
    },
  };
});

const id = "read-safety";
const panels: { name: string; component: ComponentType<{ propertyId: string }>; key: string }[] = [
  { name: "acquisition", component: AcquisitionCostsPanel, key: "acquisition-costs" },
  { name: "operating expenses", component: OperatingExpensesPanel, key: "operating-expenses" },
  { name: "financing", component: FinancingPanel, key: "financing" },
  { name: "financing purchase price", component: FinancingPanel, key: "acquisition-costs" },
];
let client: QueryClient;
beforeEach(() => {
  state.save.mockReset();
  state.mutation = undefined;
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryOnMount: false, staleTime: Infinity, gcTime: Infinity },
    },
  });
  for (const key of ["acquisition-costs", "operating-expenses", "financing"])
    client.setQueryData([key, id], null);
});
afterEach(() => client.clear());
function render(component: ComponentType<{ propertyId: string }>) {
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(component, { propertyId: id })),
  );
}

describe("financial form reads must succeed before showing totals or saving", () => {
  for (const panel of panels) {
    it.each([false, true])(`${panel.name} blocks failed reads (cached row: %s)`, async (cached) => {
      if (cached)
        client.setQueryData([panel.key, id], {
          purchase_price: 543210,
          annual_maintenance_fee: 12345,
          loan_amount: 400000,
        });
      else client.removeQueries({ queryKey: [panel.key, id] });
      await expect(
        client.fetchQuery({
          queryKey: [panel.key, id],
          staleTime: 0,
          queryFn: async () => {
            throw new Error("Read unavailable");
          },
        }),
      ).rejects.toThrow("Read unavailable");
      const html = render(panel.component);
      expect(html).toContain('role="alert"');
      expect(html).not.toContain("<button");
      expect(html).not.toContain("543,210");
      await expect(state.mutation!()).rejects.toThrow(/load/i);
      expect(state.save).not.toHaveBeenCalled();
    });
    it(`${panel.name} blocks saves while a required read is pending`, async () => {
      client.removeQueries({ queryKey: [panel.key, id] });
      const html = render(panel.component);
      expect(html).toContain("Loading");
      expect(html).not.toContain("<button");
      await expect(state.mutation!()).rejects.toThrow(/load/i);
      expect(state.save).not.toHaveBeenCalled();
    });
    it(`${panel.name} permits entry after a successful read confirms no record`, async () => {
      expect(render(panel.component)).toContain("<button");
      // Acquisition now receives a captured attempt; the open-editor lifecycle is
      // exercised with real pending/rejected mutations in acquisition-editor.test.ts.
      await state.mutation!({
        values: acquisitionCostsSchema.parse(emptyAcquisitionForm),
        isCurrent: () => true,
      });
      expect(state.save).toHaveBeenCalledOnce();
    });
  }
});
