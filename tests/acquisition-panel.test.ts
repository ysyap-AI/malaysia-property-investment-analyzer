import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { MutationObserver, QueryClient, type MutationObserverOptions } from "@tanstack/react-query";
import { AcquisitionCostsPanel } from "@/components/property/AcquisitionCostsPanel";
import {
  acquisitionCostsSchema,
  type AcquisitionCostsRecord,
} from "@/lib/property/acquisition-fields";
import { AcquisitionSaveError } from "@/lib/property/acquisition-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Effect = { deps: unknown[]; cleanup?: () => void; run: () => (() => void) | void };
const h = vi.hoisted(() => ({
  state: [] as unknown[],
  effects: [] as Effect[],
  cursor: 0,
  effectCursor: 0,
  user: "synthetic-owner",
  save: vi.fn(),
  read: vi.fn(),
  callbacks: new Set<(event: string, session: { user: { id: string } } | null) => void>(),
  client: undefined as unknown as QueryClient,
  mutation: undefined as MutationObserver<AcquisitionCostsRecord, Error, unknown> | undefined,
}));
// Deterministic hook/element harness using the real panel handlers and real
// MutationObserver. No DOM, React scheduling, browser, Auth or REST is claimed.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  // This direct-call hook harness has no mounted draft-disclosure provider.
  useContext: () => null,
  useState: (initial: unknown) => {
    const slot = h.cursor++;
    if (!(slot in h.state)) h.state[slot] = typeof initial === "function" ? initial() : initial;
    return [
      h.state[slot],
      (next: unknown) => {
        h.state[slot] = typeof next === "function" ? next(h.state[slot]) : next;
      },
    ];
  },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  useEffect: (run: Effect["run"], deps: unknown[]) => {
    const slot = h.effectCursor++;
    const prior = h.effects[slot];
    if (!prior || deps.some((dep, index) => dep !== prior.deps[index])) {
      prior?.cleanup?.();
      const effect: Effect = { deps, run };
      h.effects[slot] = effect;
      const cleanup = run();
      if (cleanup) effect.cleanup = cleanup;
    }
  },
}));
// Network baseline loading is stubbed here; property-revision tests cover the RPC contract.
vi.mock("@/hooks/use-financial-baseline", () => ({
  useFinancialBaseline: (_id: string, _owner: string, open: (s: unknown) => void) => ({
    loading: false, error: false,
    load: () => open({ property: { revision: 1 },
      acquisition_costs: h.client.getQueryData(["acquisition-costs", _id]) ?? null,
      financing: h.client.getQueryData(["financing", _id]) ?? null,
      operating_expenses: h.client.getQueryData(["operating-expenses", _id]) ?? null }),
  }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: h.user ? { id: h.user } : null, loading: false }),
}));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (
        callback: (event: string, session: { user: { id: string } } | null) => void,
      ) => {
        h.callbacks.add(callback);
        return { data: { subscription: { unsubscribe: () => h.callbacks.delete(callback) } } };
      },
    },
  },
}));
vi.mock("@/lib/property/acquisition-api", async (original) => ({
  ...(await original<typeof import("@/lib/property/acquisition-api")>()),
  saveAcquisitionCosts: h.save,
  getAcquisitionCosts: h.read,
}));
vi.mock("@tanstack/react-query", async (original) => {
  const actual = await original<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => h.client,
    useQuery: ({ queryKey }: { queryKey: string[] }) => {
      const state = h.client.getQueryState(queryKey);
      return {
        data: state?.data,
        isLoading: !state || state.status === "pending",
        error: state?.error,
      };
    },
    useMutation: (options: MutationObserverOptions<AcquisitionCostsRecord, Error, unknown>) => {
      h.mutation ??= new actual.MutationObserver(h.client, options);
      return { mutateAsync: (attempt: unknown) => h.mutation!.mutate(attempt) };
    },
  };
});
const id = "synthetic-property";
const key = ["acquisition-costs", id];
const record = (price = 100, propertyId = id) =>
  ({
    ...acquisitionCostsSchema.parse({ purchase_price: price, spa_legal_fee: 0 }),
    id: "row",
    property_id: propertyId,
  }) as AcquisitionCostsRecord;
interface ElementProps {
  children?: ReactNode;
  id?: string;
  onClick?: () => Promise<void> | void;
  onChange?: (event: unknown) => void;
  value?: string;
  disabled?: boolean;
}
function nodes(node: ReactNode): ReactElement<ElementProps>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<ElementProps>(child) ? [child, ...nodes(child.props.children as ReactNode)] : [],
  );
}
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<ElementProps>(child) ? text(child.props.children as ReactNode) : String(child),
    )
    .join(" ");
}
function cleanup() {
  h.effects.forEach((effect) => effect.cleanup?.());
  h.effects = [];
  h.state = [];
  h.mutation = undefined;
}
function panel() {
  let previousKey: string | null = null;
  let propertyId = id;
  function render() {
    const shell = AcquisitionCostsPanel({ propertyId }) as ReactElement<{
      propertyId: string;
      identityId: string;
    }>;
    if (typeof shell.type !== "function") return shell;
    if (previousKey !== null && shell.key !== previousKey) cleanup();
    previousKey = shell.key;
    h.cursor = 0;
    h.effectCursor = 0;
    return (shell.type as (props: typeof shell.props) => ReactNode)(shell.props);
  }
  const button = (label: string) =>
    nodes(render()).find(
      (node) => node.type === Button && text(node.props.children as ReactNode) === label,
    )!;
  const input = (field = "purchase_price") =>
    nodes(render()).find((node) => node.type === Input && node.props.id === field)!;
  return {
    render,
    button,
    input,
    click: (label: string) => (button(label).props.onClick as () => Promise<void> | void)(),
    fill: (value: string) =>
      (input().props.onChange as (event: unknown) => void)({ target: { value } }),
    switchProperty: (next: string) => {
      propertyId = next;
      render();
    },
  };
}
beforeEach(() => {
  h.user = "synthetic-owner";
  h.save.mockReset();
  h.read.mockReset();
  h.callbacks.clear();
  h.client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 2 } },
  });
  h.client.setQueryData(key, record());
  h.save.mockResolvedValue(record(200));
  h.read.mockResolvedValue(record(200));
});
afterEach(() => {
  cleanup();
  h.client.clear();
});

describe("actual acquisition panel handlers and rendering", () => {
  it("preserves an editable draft across changed/null/error/pending query state", async () => {
    const p = panel();
    p.click("Edit costs");
    p.fill("777");
    for (const data of [record(900), null]) {
      h.client.setQueryData(key, data);
      expect(p.input().props.value).toBe("777");
    }
    await h.client
      .fetchQuery({
        queryKey: key,
        queryFn: async () => {
          throw new Error("private read detail");
        },
      })
      .catch(() => {});
    expect(p.input().props.value).toBe("777");
    expect(text(p.render())).toContain("Your open draft is retained");
    expect(text(p.render())).not.toContain("private read detail");
    h.client.removeQueries({ queryKey: key });
    expect(p.input().props.value).toBe("777");
    expect(text(p.render())).toContain("Current saved total unavailable");
    p.fill("778");
    expect(p.input().props.value).toBe("778");
  });

  it("validates before mutation and retains invalid text with a safe field message", async () => {
    const p = panel();
    p.click("Edit costs");
    p.fill("1,5");
    await p.click("Save acquisition costs");
    expect(p.input().props.value).toBe("1,5");
    expect(text(p.render())).toContain("Enter an amount or leave it blank");
    expect(h.save).not.toHaveBeenCalled();
  });

  it("disables inputs and same-tick duplicate saves until the real mutation settles", async () => {
    let resolve!: (value: AcquisitionCostsRecord) => void;
    h.save.mockReturnValueOnce(
      new Promise((yes) => {
        resolve = yes;
      }),
    );
    const p = panel();
    p.click("Edit costs");
    p.fill("200");
    const button = p.button("Save acquisition costs");
    const submit = button.props.onClick as () => Promise<void>;
    const pending = submit();
    await submit();
    await vi.waitFor(() => expect(h.save).toHaveBeenCalledOnce());
    expect(p.input().props.disabled).toBe(true);
    expect(p.button("Saving…").props.disabled).toBe(true);
    expect(text(p.render())).not.toContain("saved and confirmed");
    resolve(record(200));
    await pending;
    expect(p.input().props.disabled).toBe(false);
    expect(text(p.render())).toContain("Acquisition costs saved and confirmed");
    expect(h.client.getQueryData(key)).toEqual(record(200));
  });

  it("keeps rejected saves editable and sanitizes unknown rejections before mutation state", async () => {
    h.save.mockRejectedValueOnce(new AcquisitionSaveError("rejected"));
    const p = panel();
    p.click("Edit costs");
    p.fill("234.50");
    await p.click("Save acquisition costs");
    expect(p.input().props.value).toBe("234.50");
    expect(p.button("Save acquisition costs").props.disabled).toBe(false);
    h.save.mockRejectedValueOnce(new Error("private database payload cost=234.50"));
    await p.click("Save acquisition costs");
    expect(text(p.render())).toContain("outcome is unknown");
    expect(p.button("Save acquisition costs").props.disabled).toBe(true);
    expect(h.mutation!.getCurrentResult().error?.message).not.toContain("private database");
    expect(h.save).toHaveBeenCalledTimes(2);
  });

  it("shows confirmed write and refresh failure separately", async () => {
    h.read.mockRejectedValueOnce(new Error("private read failure"));
    const p = panel();
    p.click("Edit costs");
    await p.click("Save acquisition costs");
    expect(text(p.render())).toContain("saved and confirmed, but refreshing saved values failed");
    expect(text(p.render())).not.toContain("private read failure");
    expect(p.input().props.value).toBe("200");
    expect(h.save).toHaveBeenCalledOnce();
  });

  it("cancels a pre-save background read so it cannot replace the acknowledged cache", async () => {
    let resolve!: (value: AcquisitionCostsRecord) => void;
    const oldRead = h.client
      .fetchQuery({
        queryKey: key,
        queryFn: () =>
          new Promise<AcquisitionCostsRecord>((yes) => {
            resolve = yes;
          }),
      })
      .catch(() => null);
    const p = panel();
    p.click("Edit costs");
    await p.click("Save acquisition costs");
    resolve(record(900));
    await oldRead;
    expect(h.client.getQueryData(key)).toEqual(record(200));
    expect(p.input().props.value).toBe("200");
    expect(h.read).toHaveBeenCalledOnce();
  });

  it("a deliberate review starts a new read instead of reusing a preceding background read", async () => {
    const p = panel();
    p.click("Edit costs");
    p.fill("777");
    let resolve!: (value: AcquisitionCostsRecord) => void;
    const oldRead = h.client
      .fetchQuery({
        queryKey: key,
        queryFn: () =>
          new Promise<AcquisitionCostsRecord>((yes) => {
            resolve = yes;
          }),
      })
      .catch(() => null);
    h.read.mockResolvedValueOnce(record(600));
    await p.click("Review saved values");
    resolve(record(900));
    await oldRead;
    expect(h.read).toHaveBeenCalledOnce();
    expect(h.client.getQueryData(key)).toEqual(record(600));
    expect(p.input().props.value).toBe("777");
  });

  it("reviews uncertain state separately without replacing the draft or replaying", async () => {
    h.save.mockRejectedValueOnce(new AcquisitionSaveError("uncertain"));
    h.read.mockResolvedValueOnce(null);
    const p = panel();
    p.click("Edit costs");
    p.fill("234.50");
    await p.click("Save acquisition costs");
    await p.click("Review saved values");
    expect(text(p.render())).toContain("No saved acquisition row was returned");
    expect(text(p.render())).toContain("no row does not prove a write failed");
    expect(p.input().props.value).toBe("234.50");
    expect(p.button("Save acquisition costs").props.disabled).toBe(true);
    expect(h.save).toHaveBeenCalledOnce();
  });

  it.each(["property", "identity", "logout"])(
    "vetoes late completions across a %s change",
    async (change) => {
      let resolve!: (value: AcquisitionCostsRecord) => void;
      h.save.mockReturnValueOnce(
        new Promise((yes) => {
          resolve = yes;
        }),
      );
      const p = panel();
      p.click("Edit costs");
      p.fill("234.50");
      const pending = p.click("Save acquisition costs");
      await vi.waitFor(() => expect(h.save).toHaveBeenCalledOnce());
      if (change === "property") {
        h.client.setQueryData(["acquisition-costs", "other"], record(500, "other"));
        p.switchProperty("other");
      } else {
        h.callbacks.forEach((callback) =>
          callback("SIGNED_OUT", change === "logout" ? null : { user: { id: "other-owner" } }),
        );
        // The synchronous auth subscription disposes even before a React rerender.
        expect(text(p.render())).toContain("session changed");
        h.user = change === "logout" ? "" : "other-owner";
      }
      resolve(record(234.5));
      await pending;
      expect(h.read).not.toHaveBeenCalled();
      expect(h.client.getQueryData(key)).toEqual(record());
      expect(text(p.render())).not.toContain("saved and confirmed");
      expect(text(p.render())).not.toContain("234.50");
    },
  );

  it("Cancel deliberately closes the draft and reopening uses the latest saved baseline", () => {
    const p = panel();
    p.click("Edit costs");
    p.fill("777");
    h.client.setQueryData(key, record(800));
    p.click("Cancel");
    p.click("Edit costs");
    expect(p.input().props.value).toBe("800");
    expect(text(p.render())).toContain("Leaving the page or refreshing the browser discards it");
  });
  it("M4 conflict preserves the draft until explicit discard/reload opens saved values", async () => {
    h.save.mockRejectedValueOnce(new AcquisitionSaveError("conflict"));
    const p = panel();
    p.click("Edit costs");
    p.fill("777");
    await p.click("Save acquisition costs");
    expect(p.input().props.value).toBe("777");
    expect(p.button("Save acquisition costs").props.disabled).toBe(true);
    h.client.setQueryData(key, record(800));
    await p.click("Discard draft and reload saved values");
    expect(p.input().props.value).toBe("800");
    expect(p.button("Save acquisition costs").props.disabled).toBe(false);
    expect(h.save).toHaveBeenCalledOnce();
  });

});
