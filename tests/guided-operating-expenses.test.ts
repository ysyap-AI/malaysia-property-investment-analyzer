import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { MutationObserver, QueryClient, type MutationObserverOptions } from "@tanstack/react-query";
import { OperatingExpensesPanel } from "@/components/property/OperatingExpensesPanel";
import {
  operatingExpensesSchema,
  type OperatingExpensesRecord,
} from "@/lib/property/operating-expense-fields";
import { OperatingExpensesSaveError } from "@/lib/property/operating-expenses-editor";
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
  mutation: undefined as MutationObserver<OperatingExpensesRecord, Error, unknown> | undefined,
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
vi.mock("@/lib/property/operating-expenses-api", async (original) => ({
  ...(await original<typeof import("@/lib/property/operating-expenses-api")>()),
  saveOperatingExpenses: h.save,
  getOperatingExpenses: h.read,
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
    useMutation: (options: MutationObserverOptions<OperatingExpensesRecord, Error, unknown>) => {
      h.mutation ??= new actual.MutationObserver(h.client, options);
      return { mutateAsync: (attempt: unknown) => h.mutation!.mutate(attempt) };
    },
  };
});
const id = "synthetic-property";
const key = ["operating-expenses", id];
const record = (price = 100, propertyId = id) =>
  ({
    ...operatingExpensesSchema.parse({ annual_maintenance_fee: price, annual_sinking_fund: 0 }),
    id: "row",
    property_id: propertyId,
  }) as OperatingExpensesRecord;
interface ElementProps {
  children?: ReactNode;
  id?: string;
  onClick?: () => Promise<void> | void;
  onChange?: (event: unknown) => void;
  value?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
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
    const shell = OperatingExpensesPanel({ propertyId }) as ReactElement<{
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
  const input = (field = "annual_maintenance_fee") =>
    nodes(render()).find((node) => node.type === Input && node.props.id === field)!;
  const basis = (label = "Maintenance fee per month") =>
    nodes(render()).find((node) => node.type === "button" && node.props["aria-label"] === label)!;
  return {
    render,
    button,
    input,
    basis,
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
  h.save.mockImplementation(async (_propertyId: string, values: object) => ({
    ...record(),
    ...values,
  }));
  h.read.mockResolvedValue(record(200));
});
afterEach(() => {
  cleanup();
  h.client.clear();
});

type Harness = ReturnType<typeof panel>;
function presentation(p: Harness, mode: "simple" | "advanced") {
  const node = nodes(p.render()).find(
    (n) => typeof n.type === "function" && n.type.name === "ExpensePresentation",
  )!;
  (node.props as unknown as { onChange: (mode: string) => void }).onChange(mode);
  p.render();
}
function completeness(p: Harness) {
  const node = nodes(p.render()).find(
    (n) => typeof n.type === "function" && n.type.name === "ExpenseCompleteness",
  )!;
  return (node.type as (props: unknown) => ReactNode)(node.props);
}
function editorState() {
  return (
    h.state.find((s) => s && typeof s === "object" && "getSnapshot" in s) as {
      getSnapshot: () => import("@/lib/property/operating-expenses-editor").OperatingExpensesEditorState;
    }
  ).getSnapshot();
}
describe("guided expense presentation with the accepted editor", () => {
  it("retains exact draft, basis and original baseline object identities without any side effect", () => {
    const p = panel();
    p.click("Edit expenses");
    p.fill(" 001,234.50 ");
    p.basis().props.onClick!();
    const before = editorState();
    h.client.setQueryData(key, record(999));
    presentation(p, "advanced");
    presentation(p, "simple");
    expect(editorState()).toBe(before);
    expect(editorState().baseline).toBe(before.baseline);
    expect(editorState().values).toBe(before.values);
    expect(editorState().bases).toBe(before.bases);
    expect(h.save).not.toHaveBeenCalled();
    expect(h.read).not.toHaveBeenCalled();
    p.click("Cancel");
    p.click("Edit expenses");
    expect(p.input().props.value).toBe("999");
    expect(p.basis().props["aria-pressed"]).toBe(false);
  });
  it("retains pending and reviewing snapshots and financial-control locks", async () => {
    let resolve!: (row: OperatingExpensesRecord) => void;
    h.save.mockReturnValueOnce(
      new Promise<OperatingExpensesRecord>((yes) => {
        resolve = yes;
      }),
    );
    const p = panel();
    p.click("Edit expenses");
    p.fill("200");
    const pending = p.click("Save operating expenses");
    await vi.waitFor(() => expect(h.save).toHaveBeenCalledOnce());
    const before = editorState();
    presentation(p, "advanced");
    presentation(p, "simple");
    expect(editorState()).toBe(before);
    expect(p.input().props.disabled).toBe(true);
    resolve(record(200));
    await pending;
    h.read.mockReturnValueOnce(
      new Promise<OperatingExpensesRecord>((yes) => {
        resolve = yes;
      }),
    );
    const review = p.click("Review saved values");
    await vi.waitFor(() => expect(editorState().reviewing).toBe(true));
    const during = editorState();
    presentation(p, "advanced");
    presentation(p, "simple");
    expect(editorState()).toBe(during);
    expect(p.input().props.disabled).toBe(true);
    resolve(record(800));
    await review;
    expect(p.input().props.value).toBe("200");
    expect(h.save).toHaveBeenCalledOnce();
  });
  it.each(["rejected", "uncertain"] as const)(
    "keeps %s and separate Review outcomes unchanged",
    async (outcome) => {
      const p = panel();
      p.click("Edit expenses");
      p.fill("0123.");
      p.basis().props.onClick!();
      h.save.mockRejectedValueOnce(new OperatingExpensesSaveError(outcome));
      await p.click("Save operating expenses");
      const before = editorState();
      presentation(p, "advanced");
      presentation(p, "simple");
      expect(editorState()).toBe(before);
      expect(p.button("Save operating expenses").props.disabled).toBe(outcome === "uncertain");
      await p.click("Review saved values");
      const after = editorState();
      presentation(p, "advanced");
      presentation(p, "simple");
      expect(editorState()).toBe(after);
      expect(editorState().outcome).toBe(outcome);
      expect(p.input().props.value).toBe("0123.");
      expect(h.save).toHaveBeenCalledOnce();
    },
  );
  it("distinguishes all fourteen known/zero/missing/invalid states using shared annualization", () => {
    const p = panel();
    p.click("Edit expenses");
    p.fill("10");
    p.basis().props.onClick!();
    const rendered = completeness(p);
    expect(nodes(rendered).filter((n) => n.type === "li")).toHaveLength(14);
    const review = text(rendered);
    expect(review).toContain("User-entered amount: RM 120 / year");
    expect(review).toContain("User-entered zero: RM 0 / year");
    expect(review).toContain("12 unresolved lines");
    expect(review).toContain("final net operating cost is unavailable");
    p.fill("0.0001");
    expect(text(completeness(p))).toContain("RM 0 / year (rounded from a non-zero entry)");
    expect(
      nodes(completeness(p)).filter(
        (n) => (n.props as Record<string, unknown>)["data-expense-state"] === "zero",
      ),
    ).toHaveLength(1);
    p.fill("NaN");
    expect(text(completeness(p))).toContain("Invalid / unresolved");
    expect(text(completeness(p))).toContain("no draft subtotal is available");
    expect(h.save).not.toHaveBeenCalled();
  });
  it("retains refresh failure and annual values across presentation and reopen", async () => {
    const p = panel();
    p.click("Edit expenses");
    p.fill("10");
    p.basis().props.onClick!();
    h.read.mockRejectedValueOnce(new Error("private refresh payload"));
    await p.click("Save operating expenses");
    expect(h.save.mock.calls[0]![1].annual_maintenance_fee).toBe(120);
    const before = editorState();
    presentation(p, "advanced");
    presentation(p, "simple");
    expect(editorState()).toBe(before);
    expect(before.outcome).toBe("saved-refresh-failed");
    p.click("Cancel");
    // A failed saved read still blocks reopening; explicitly recover that query first.
    h.client.setQueryData(key, record(120));
    p.click("Edit expenses");
    expect(p.input().props.value).toBe("120");
    expect(p.basis().props["aria-pressed"]).toBe(false);
    presentation(p, "advanced");
    await p.click("Save operating expenses");
    expect(h.save.mock.calls[1]![1].annual_maintenance_fee).toBe(120);
  });
});
