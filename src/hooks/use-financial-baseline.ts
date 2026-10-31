import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/external-client";
import { getPropertySnapshot, type PropertySnapshot } from "@/lib/property/property-revision";

/** An explicit open/reload loads the values and revision together, never rebasing a draft. */
export function useFinancialBaseline(
  propertyId: string,
  owner: string,
  open: (snapshot: PropertySnapshot) => void | Promise<void>,
) {
  const [lifetime] = useState(() => ({ generation: 0 }));
  const [pending] = useState(() => ({ current: false }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== owner) lifetime.generation++;
    });
    return () => {
      lifetime.generation++;
      data.subscription.unsubscribe();
    };
  }, [owner, propertyId, lifetime]);
  async function load() {
    if (pending.current) return;
    const generation = lifetime.generation;
    const current = () => generation === lifetime.generation;
    pending.current = true;
    setLoading(true);
    setError(false);
    try {
      const snapshot = await getPropertySnapshot(propertyId, owner);
      const { data, error: authError } = await supabase.auth.getUser();
      if (!current() || authError || data.user?.id !== owner) return;
      await open(snapshot);
    } catch {
      if (current()) setError(true);
    } finally {
      pending.current = false;
      if (current()) setLoading(false);
    }
  }
  return { load, loading, error };
}
