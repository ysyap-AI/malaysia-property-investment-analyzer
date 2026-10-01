// Data access for financing. Ownership is enforced by the database (RLS).
import { supabase } from "@/integrations/supabase/external-client";
import type { FinancingRecord, FinancingRow } from "./financing-fields";
import { financingSchema } from "./financing-fields";
import { isSafeFinancialNumber } from "@/lib/finance/rounding";

const TABLE = "financing";

export async function getFinancing(propertyId: string): Promise<FinancingRecord | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("property_id", propertyId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function saveFinancing(propertyId: string, values: FinancingRow): Promise<void> {
  financingSchema.parse(values);
  for (const amount of [values.down_payment, values.calculated_monthly_instalment]) {
    if (amount !== null && (!isSafeFinancialNumber(amount) || amount < 0)) {
      throw new Error("Invalid financing amount");
    }
  }
  const existing = await getFinancing(propertyId);
  const { error } = existing
    ? await supabase.from(TABLE).update(values).eq("id", existing.id).select("id").single()
    : await supabase.from(TABLE).insert({ ...values, property_id: propertyId }).select("id").single();
  if (error) throw new Error(error.message);
}

export const financingKeys = {
  detail: (propertyId: string) => ["financing", propertyId] as const,
};
