// Data access for acquisition costs. Ownership is enforced by the database:
// a row is only reachable when the signed-in user owns the parent property.
import { supabase } from "@/integrations/supabase/external-client";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import type { AcquisitionCostsInput, AcquisitionCostsRecord } from "./acquisition-fields";

const TABLE = "acquisition_costs";

export async function getAcquisitionCosts(
  propertyId: string,
): Promise<AcquisitionCostsRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function saveAcquisitionCosts(
  propertyId: string,
  values: AcquisitionCostsInput,
): Promise<AcquisitionCostsRecord> {
  if (calculateTotalAcquisitionCost(values).status === "invalid") {
    throw new Error("Acquisition costs contain invalid amounts or exceed the supported numeric range.");
  }
  const existing = await getAcquisitionCosts(propertyId);
  if (existing) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(values)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...values, property_id: propertyId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export const acquisitionKeys = {
  detail: (propertyId: string) => ["acquisition-costs", propertyId] as const,
};
