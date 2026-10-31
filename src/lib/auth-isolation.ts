import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

/** Invalidate private cached data on every identity change, including other tabs. */
export function watchAuthIsolation(
  auth: SupabaseClient["auth"],
  queries: QueryClient,
  onIdentityChange: (nextUserId: string | null) => void,
  onInitialized?: () => void,
) {
  let previous: string | null | undefined;
  const { data } = auth.onAuthStateChange((_event, session) => {
    const initializing = previous === undefined;
    const next = session?.user.id ?? null;
    if (previous !== next) {
      // clear() also cancels/removes pending queries; old responses cannot refill them.
      queries.clear();
      const hadIdentity = previous != null;
      previous = next;
      // A full navigation also discards forms containing the preceding user's data.
      if (hadIdentity) onIdentityChange(next);
    }
    // Private routes must mount after the initial cache clear, otherwise an
    // already-observed first read can be detached and remain loading forever.
    if (initializing) onInitialized?.();
  });
  return () => data.subscription.unsubscribe();
}
