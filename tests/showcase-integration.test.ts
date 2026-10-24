import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { Showcase } from "@/showcase/Showcase";

const mocks = vi.hoisted(() => ({
  matches: [{ routeId: "/showcase" }],
  effects: [] as (() => void | (() => void))[],
  createClient: vi.fn(),
  onAuthStateChange: vi.fn(),
  getUser: vi.fn(),
  unsubscribe: vi.fn(),
  report: vi.fn(),
}));

// Flush the actual mounted effects explicitly, without a DOM dependency.
// The external client and every route module remain real; trap its SDK factory.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void | (() => void)) => mocks.effects.push(effect),
}));
vi.mock("@supabase/supabase-js", async (original) => ({
  ...(await original<typeof import("@supabase/supabase-js")>()),
  createClient: mocks.createClient,
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ matches: mocks.matches }),
  Outlet: () => createElement(Showcase),
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock("@/lib/lovable-error-reporting", () => ({ reportLovableError: mocks.report }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.matches = [{ routeId: "/showcase" }];
  mocks.effects = [];
  mocks.createClient.mockImplementation(() => {
    throw new Error("Showcase attempted to initialize Supabase");
  });
});
afterEach(() => vi.unstubAllGlobals());

async function renderRoot() {
  const { Route } = await import("@/routes/__root");
  const queryClient = new QueryClient();
  vi.spyOn(Route, "useRouteContext").mockReturnValue({ queryClient });
  const html = renderToStaticMarkup(createElement(Route.options.component as () => ReactNode));
  return { html, queryClient, effects: mocks.effects.map((effect) => effect()) };
}

describe("integrated showcase application boundary", () => {
  it("loads the complete router and renders the root with zero service, sample-storage or Auth effects", async () => {
    const forbidden = vi.fn(() => {
      throw new Error("External side effect");
    });
    for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"])
      vi.stubGlobal(name, forbidden);
    vi.stubGlobal("localStorage", {
      getItem: forbidden,
      setItem: forbidden,
      removeItem: forbidden,
    });
    // The existing Router reads scroll positions at module evaluation. Permit
    // only that infrastructure key; synthetic inputs must never be persisted.
    const scrollRead = vi.fn((key: string) => {
      expect(key).toBe("tsr-scroll-restoration-v1_3");
      return null;
    });
    vi.stubGlobal("sessionStorage", {
      getItem: scrollRead,
      setItem: forbidden,
      removeItem: forbidden,
    });
    // All generated routes, root imports and Start middleware are evaluated.
    await import("@/start");
    const { getRouter } = await import("@/router");
    const router = getRouter();
    expect(router.routesByPath["/showcase"]).toBeDefined();
    const { html, effects } = await renderRoot();
    expect(html).toContain("Synthetic Demonstration — No Real Property or Market Data");
    expect(html).toContain("nearby amenities are fictional");
    expect(html).toContain("do not enter confidential information");
    expect(html).toContain("Meranti Court");
    expect(html).toContain("Present / Print");
    expect(effects).toEqual([]);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });

  it.each(["/", "/login", "/_authenticated/properties/", "/showcase-unknown"])(
    "preserves Auth watching, cache clearing, redirect and cleanup outside the matched showcase: %s",
    async (routeId) => {
      mocks.matches = [{ routeId }];
      let emit!: (event: string, session: unknown) => void;
      mocks.onAuthStateChange.mockImplementation((callback) => {
        emit = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      });
      mocks.createClient.mockReturnValue({ auth: { onAuthStateChange: mocks.onAuthStateChange } });
      const { queryClient, effects } = await renderRoot();
      expect(mocks.createClient).toHaveBeenCalledOnce();
      expect(mocks.onAuthStateChange).toHaveBeenCalledOnce();
      const replace = vi.fn();
      vi.stubGlobal("window", { location: { replace } });
      emit("SIGNED_IN", { user: { id: "synthetic-user-a" } });
      queryClient.setQueryData(["properties"], ["private synthetic fixture"]);
      emit("SIGNED_OUT", null);
      expect(queryClient.getQueryData(["properties"])).toBeUndefined();
      expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
      for (const cleanup of effects) if (typeof cleanup === "function") cleanup();
      expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    },
  );

  it.each([
    { data: { user: null }, error: null },
    { data: { user: null }, error: new Error("synthetic auth failure") },
  ])("still rejects anonymous/error access at the existing protected parent", async (result) => {
    mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
    mocks.getUser.mockResolvedValue(result);
    const { Route } = await import("@/routes/_authenticated/route");
    expect(Route.options.ssr).toBe(false);
    const beforeLoad = Route.options.beforeLoad as () => Promise<unknown>;
    await expect(beforeLoad()).rejects.toMatchObject({ options: { to: "/login" } });
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("retains the validated real-user route context", async () => {
    const user = { id: "synthetic-user" };
    mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    const { Route } = await import("@/routes/_authenticated/route");
    const beforeLoad = Route.options.beforeLoad as () => Promise<unknown>;
    await expect(beforeLoad()).resolves.toEqual({ user });
  });

  it.each([true, false])(
    "keeps root error reporting local only on showcase: %s",
    async (showcase) => {
      mocks.matches = [{ routeId: showcase ? "/showcase" : "/login" }];
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const { Route } = await import("@/routes/__root");
        const error = new Error("Synthetic rehearsal failure");
        const ErrorView = Route.options.errorComponent as (props: {
          error: Error;
          reset: () => void;
        }) => ReactNode;
        const html = renderToStaticMarkup(createElement(ErrorView, { error, reset: vi.fn() }));
        for (const effect of mocks.effects) effect();
        expect(html).toContain("This page didn&#x27;t load");
        expect(mocks.report).toHaveBeenCalledTimes(showcase ? 0 : 1);
        expect(mocks.createClient).not.toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    },
  );
});
