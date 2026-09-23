// Data access for operating expenses. Ownership is enforced by the database:
// a row is only reachable when the signed-in user owns the parent property.
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/external-client";
import type { OperatingExpensesInput, OperatingExpensesRecord } from "./operating-expense-fields";

const db = supabase as unknown as SupabaseClient<any, "public", any>;

const TABLE = "operating_expenses";

export async function getOperatingExpenses(
  propertyId: string,
): Promise<OperatingExpensesRecord | null> {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as OperatingExpensesRecord | null;
}

export async function saveOperatingExpenses(
  propertyId: string,
  values: OperatingExpensesInput,
): Promise<OperatingExpensesRecord> {
  const existing = await getOperatingExpenses(propertyId);
  if (existing) {
    const { data, error } = await db
      .from(TABLE)
      .update(values)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as OperatingExpensesRecord;
  }
  const { data, error } = await db
    .from(TABLE)
    .insert({ ...values, property_id: propertyId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as OperatingExpensesRecord;
}

export const operatingExpenseKeys = {
  detail: (propertyId: string) => ["operating-expenses", propertyId] as const,
};
