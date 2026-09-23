// Data access for financing. Ownership is enforced by the database (RLS).
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/external-client";
import type { FinancingRecord, FinancingRow } from "./financing-fields";

const db = supabase as unknown as SupabaseClient<any, "public", any>;
const TABLE = "financing";

export async function getFinancing(propertyId: string): Promise<FinancingRecord | null> {
  const { data, error } = await db.from(TABLE).select("*").eq("property_id", propertyId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as FinancingRecord | null;
}

export async function saveFinancing(propertyId: string, values: FinancingRow): Promise<void> {
  const existing = await getFinancing(propertyId);
  const { error } = existing
    ? await db.from(TABLE).update(values).eq("id", existing.id)
    : await db.from(TABLE).insert({ ...values, property_id: propertyId });
  if (error) throw new Error(error.message);
}

export const financingKeys = {
  detail: (propertyId: string) => ["financing", propertyId] as const,
};
