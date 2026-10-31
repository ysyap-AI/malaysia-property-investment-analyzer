import { beforeEach, expect, it, vi } from "vitest";
import { useFinancialBaseline } from "@/hooks/use-financial-baseline";
const h = vi.hoisted(() => ({
  state: [] as unknown[],
  cursor: 0,
  cleanup: undefined as undefined | (() => void),
  callback: undefined as undefined | ((event: string, session: unknown) => void),
  snapshot: vi.fn(),
  getUser: vi.fn(),
}));
// A deterministic hook lifecycle harness; no DOM/browser/database claim.
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = h.cursor++;
    if (!(slot in h.state)) h.state[slot] = typeof initial === "function" ? initial() : initial;
    return [
      h.state[slot],
      (next: unknown) => {
        h.state[slot] = next;
      },
    ];
  },
  useEffect: (effect: () => () => void) => {
    h.cleanup ??= effect();
  },
}));
vi.mock("@/lib/property/property-revision", () => ({ getPropertySnapshot: h.snapshot }));
vi.mock("@/integrations/supabase/external-client", () => ({
  supabase: {
    auth: {
      getUser: h.getUser,
      onAuthStateChange: (callback: typeof h.callback) => {
        h.callback = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  },
}));
const saved = {
  property: { id: "p", user_id: "owner", revision: 7 },
  acquisition_costs: null,
  financing: null,
  operating_expenses: null,
};
beforeEach(() => {
  h.cleanup?.();
  h.cleanup = undefined;
  h.callback = undefined;
  h.state = [];
  h.cursor = 0;
  h.snapshot.mockReset().mockResolvedValue(saved);
  h.getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
});
function Probe(open: (snapshot: unknown) => void) {
  h.cursor = 0;
  return useFinancialBaseline("p", "owner", open);
}
it("opens the exact snapshot with its revision after an identity check", async () => {
  const open = vi.fn();
  await Probe(open).load();
  expect(open).toHaveBeenCalledExactlyOnceWith(saved);
  expect(h.snapshot).toHaveBeenCalledExactlyOnceWith("p", "owner");
});
it.each(["identity", "unmount"])("a held snapshot cannot open after %s changes", async (change) => {
  let release!: (v: unknown) => void;
  h.snapshot.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const open = vi.fn(),
    baseline = Probe(open);
  const pending = baseline.load();
  if (change === "identity") h.callback?.("SIGNED_IN", { user: { id: "other" } });
  else h.cleanup?.();
  release(saved);
  await pending;
  expect(open).not.toHaveBeenCalled();
});
it("concurrent clicks load only once and read failure retains the existing draft", async () => {
  let reject!: (error: unknown) => void;
  h.snapshot.mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const open = vi.fn(),
    baseline = Probe(open);
  const pending = baseline.load();
  await baseline.load();
  expect(h.snapshot).toHaveBeenCalledOnce();
  reject(Error("PRIVATE_BACKEND"));
  await pending;
  expect(open).not.toHaveBeenCalled();
  expect(Probe(open).error).toBe(true);
});
it("a changed authenticated identity cannot adopt the old snapshot", async () => {
  h.getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  const open = vi.fn();
  await Probe(open).load();
  expect(open).not.toHaveBeenCalled();
});
