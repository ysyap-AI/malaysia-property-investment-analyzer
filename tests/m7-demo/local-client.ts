import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Setup-only adapter: the CLI supplies its authenticated, fixed-loopback client in memory.
const client = (globalThis as typeof globalThis & { __m7DemoClient?: SupabaseClient<Database> })
  .__m7DemoClient;
if (!client) throw Error("The local demo client was not initialized by setup.mjs.");
export const supabase = client;
