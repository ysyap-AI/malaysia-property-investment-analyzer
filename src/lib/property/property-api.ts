// Data access for the property module. Ownership is enforced by the database
// (Row Level Security); the user_id below simply stamps the row on creation.
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/external-client";
import type { PropertyInput, PropertyRecord } from "./property-fields";

// The generated types file belongs to the previous database, so property reads
// and writes use an untyped view of the same client.
const db = supabase as unknown as SupabaseClient<any, "public", any>;

const TABLE = "properties";

export async function listProperties(): Promise<PropertyRecord[]> {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PropertyRecord[];
}

export async function getProperty(id: string): Promise<PropertyRecord | null> {
  const { data, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as PropertyRecord | null;
}

export async function createProperty(
  values: PropertyInput,
  userId: string,
): Promise<PropertyRecord> {
  const { data, error } = await db
    .from(TABLE)
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PropertyRecord;
}

export async function updateProperty(id: string, values: PropertyInput): Promise<PropertyRecord> {
  const { data, error } = await db.from(TABLE).update(values).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as PropertyRecord;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await db.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const propertyKeys = {
  all: ["properties"] as const,
  detail: (id: string) => ["properties", id] as const,
};
