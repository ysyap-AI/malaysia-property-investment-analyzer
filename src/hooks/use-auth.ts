import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/external-client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedEvent = true;
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active || receivedEvent) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!active || receivedEvent) return;
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, user, loading };
}
