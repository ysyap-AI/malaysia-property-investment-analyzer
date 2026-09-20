// Data access for acquisition costs. Ownership is enforced by the database:
// a row is only reachable when the signed-in user owns the parent property.
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/external-client";
import type { AcquisitionCostsInput, AcquisitionCostsRecord } from "./acquisition-fields";

const db = supabase as unknown as SupabaseClient<any, "public", any>;

const TABLE = "acquisition_costs";

export async function getAcquisitionCosts(
  propertyId: string,
): Promise<AcquisitionCostsRecord | null> {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as AcquisitionCostsRecord | null;
}

export async function saveAcquisitionCosts(
  propertyId: string,
  values: AcquisitionCostsInput,
): Promise<AcquisitionCostsRecord> {
  const existing = await getAcquisitionCosts(propertyId);
  if (existing) {
    const { data, error } = await db
      .from(TABLE)
      .update(values)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as AcquisitionCostsRecord;
  }
  const { data, error } = await db
    .from(TABLE)
    .insert({ ...values, property_id: propertyId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AcquisitionCostsRecord;
}

export const acquisitionKeys = {
  detail: (propertyId: string) => ["acquisition-costs", propertyId] as const,
};
