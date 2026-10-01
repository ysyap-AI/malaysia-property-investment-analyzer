// Data access for operating expenses. Ownership is enforced by the database:
// a row is only reachable when the signed-in user owns the parent property.
import { supabase } from "@/integrations/supabase/external-client";
import { calculateTotalAnnualOperatingExpenses } from "@/lib/finance/operating-expenses";
import type { OperatingExpensesInput, OperatingExpensesRecord } from "./operating-expense-fields";

const TABLE = "operating_expenses";

export async function getOperatingExpenses(
  propertyId: string,
): Promise<OperatingExpensesRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function saveOperatingExpenses(
  propertyId: string,
  values: OperatingExpensesInput,
): Promise<OperatingExpensesRecord> {
  if (calculateTotalAnnualOperatingExpenses(values).status === "invalid") {
    throw new Error("Operating expenses contain invalid amounts or exceed the supported numeric range.");
  }
  const existing = await getOperatingExpenses(propertyId);
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

export const operatingExpenseKeys = {
  detail: (propertyId: string) => ["operating-expenses", propertyId] as const,
};
