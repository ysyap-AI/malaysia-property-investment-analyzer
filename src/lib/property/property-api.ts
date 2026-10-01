// Data access for the property module. Ownership is enforced by the database
// (Row Level Security); the user_id below simply stamps the row on creation.
import { supabase } from "@/integrations/supabase/external-client";
import type { PropertyInput, PropertyRecord } from "./property-fields";

const TABLE = "properties";

// Result assertions only narrow rent_verification_status to the values enforced
// by properties_rent_verification_status_check, which generated types omit.
// Table names, payloads, columns and database nullability remain schema-checked.
export async function listProperties(): Promise<PropertyRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PropertyRecord[];
}

export async function getProperty(id: string): Promise<PropertyRecord | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as PropertyRecord | null;
}

export async function createProperty(
  values: PropertyInput,
  userId: string,
): Promise<PropertyRecord> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PropertyRecord;
}

export async function updateProperty(id: string, values: PropertyInput): Promise<PropertyRecord> {
  const { data, error } = await supabase.from(TABLE).update(values).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as PropertyRecord;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const propertyKeys = {
  all: ["properties"] as const,
  detail: (id: string) => ["properties", id] as const,
};
