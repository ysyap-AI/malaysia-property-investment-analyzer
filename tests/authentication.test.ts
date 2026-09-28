import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { watchAuthIsolation } from "@/lib/auth-isolation";

function setup() {
  let emit!: (event: string, session: unknown) => void;
  const unsubscribe = vi.fn();
  const auth = { onAuthStateChange: (callback: typeof emit) => {
    emit = callback;
    return { data: { subscription: { unsubscribe } } };
  } } as unknown as SupabaseClient["auth"];
  const queries = new QueryClient();
  const navigate = vi.fn();
  const cleanup = watchAuthIsolation(auth, queries, navigate);
  return { queries, navigate, unsubscribe, cleanup,
    emit: (id: string | null) => emit("SIGNED_IN", id ? { user: { id } } : null) };
}

describe("authentication cache isolation", () => {
  it.each([null, "user-b"])("discards private data when identity changes to %s", (next) => {
    const s = setup();
    s.emit("user-a");
    s.queries.setQueryData(["properties"], ["private-a"]);
    s.emit(next);
    expect(s.queries.getQueryData(["properties"])).toBeUndefined();
    expect(s.navigate).toHaveBeenCalledExactlyOnceWith(next);
    s.cleanup();
    expect(s.unsubscribe).toHaveBeenCalledOnce();
  });
  it("keeps data during refresh of the same user's token", () => {
    const s = setup();
    s.emit("user-a");
    s.queries.setQueryData(["properties"], ["private-a"]);
    s.emit("user-a");
    expect(s.queries.getQueryData(["properties"])).toEqual(["private-a"]);
    expect(s.navigate).not.toHaveBeenCalled();
    s.cleanup();
  });
  it("prevents a late response from restoring the preceding user's cache", async () => {
    const s = setup();
    s.emit("user-a");
    let resolve!: (data: string[]) => void;
    const pending = s.queries.fetchQuery({ queryKey: ["properties"], queryFn: () => new Promise<string[]>((done) => { resolve = done; }) }).catch(() => undefined);
    s.emit("user-b");
    resolve(["private-a"]);
    await pending;
    expect(s.queries.getQueryData(["properties"])).toBeUndefined();
    s.cleanup();
  });
});
