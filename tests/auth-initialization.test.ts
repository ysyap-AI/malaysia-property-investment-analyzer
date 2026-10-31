import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { watchAuthIsolation } from "@/lib/auth-isolation";

it.each([null, "account-a"])("clears cache before admitting child reads (%s)", (id) => {
  let emit!: (event: string, session: unknown) => void;
  const auth = {
    onAuthStateChange(callback: typeof emit) {
      emit = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  } as unknown as SupabaseClient["auth"];
  const client = new QueryClient();
  client.setQueryData(["private-before-auth"], "private");
  const navigate = vi.fn();
  const initialized = vi.fn(() => {
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    client.setQueryData(["child-read"], "current");
  });
  const stop = watchAuthIsolation(auth, client, navigate, initialized);
  const session = id ? { user: { id } } : null;
  emit("INITIAL_SESSION", session);
  expect(initialized).toHaveBeenCalledOnce();
  expect(client.getQueryData(["child-read"])).toBe("current");
  emit("TOKEN_REFRESHED", session);
  expect(initialized).toHaveBeenCalledOnce();
  expect(client.getQueryData(["child-read"])).toBe("current");
  expect(navigate).not.toHaveBeenCalled();
  emit("SIGNED_IN", { user: { id: "other" } });
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  expect(initialized).toHaveBeenCalledOnce();
  if (id) expect(navigate).toHaveBeenCalledExactlyOnceWith("other");
  stop();
});
