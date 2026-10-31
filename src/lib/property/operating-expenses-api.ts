import { parseEvidence, evidenceEqual, type SectionEvidence } from "./investment-evidence";
import { writeFinancialRevision, RevisionWriteError } from "./property-revision";
// Data access for operating expenses. Ownership is enforced by the database:
// a row is only reachable when the signed-in user owns the parent property.
import { supabase } from "@/integrations/supabase/external-client";
import type { OperatingExpensesInput, OperatingExpensesRecord } from "./operating-expense-fields";
import {
  OperatingExpensesSaveError,
  isOperatingExpensesRecord,
  isOperatingExpensesInput,
  matchesOperatingExpensesRow,
} from "./operating-expenses-editor";

const TABLE = "operating_expenses";

export async function getOperatingExpenses(
  propertyId: string,
): Promise<OperatingExpensesRecord | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error || (data !== null && !isOperatingExpensesRecord(data, propertyId)))
      throw new Error("Read failed");
    return data;
  } catch {
    throw new Error("Unable to load operating expenses. Review the draft and try loading again.");
  }
}

export async function saveOperatingExpenses(
  propertyId: string,
  values: OperatingExpensesInput,
  isCurrent: () => boolean,
  revision: number | null,
  evidence?: SectionEvidence | null,
): Promise<OperatingExpensesRecord> {
  let metadata: SectionEvidence | null | undefined;
  try { metadata = evidence === undefined ? undefined : parseEvidence("operating_expenses", evidence); }
  catch { throw new OperatingExpensesSaveError("not-sent"); }
  const submitted = Object.freeze({ ...values });
  if (!isOperatingExpensesInput(submitted)) {
    throw new OperatingExpensesSaveError(
      "not-sent",
      "Operating expenses contain invalid amounts or exceed the supported numeric range.",
    );
  }
  try {
    const { record: data } = await writeFinancialRevision(propertyId, "operating_expenses", { ...submitted, ...(metadata !== undefined ? { evidence_metadata: metadata } : {}) }, revision, isCurrent);
    if (!(matchesOperatingExpensesRow(data, propertyId, submitted))) throw new OperatingExpensesSaveError("uncertain");
    if (metadata !== undefined && !evidenceEqual((data as { evidence_metadata?: unknown }).evidence_metadata, metadata)) throw new OperatingExpensesSaveError("uncertain");
    return data as OperatingExpensesRecord;
  } catch (error) {
    if (error instanceof OperatingExpensesSaveError) throw error;
    if (error instanceof RevisionWriteError) throw new OperatingExpensesSaveError(error.outcome);
    throw new OperatingExpensesSaveError("uncertain");
  }
}

export const operatingExpenseKeys = {
  detail: (propertyId: string) => ["operating-expenses", propertyId] as const,
};
