import { supabase } from "@/integrations/supabase/external-client";
import type { Json } from "@/integrations/supabase/types";
import type { PropertyRecord } from "./property-fields";
import type { AcquisitionCostsRecord } from "./acquisition-fields";
import type { FinancingRecord } from "./financing-fields";
import type { OperatingExpensesRecord } from "./operating-expense-fields";
import { isAcquisitionRecord } from "./acquisition-editor";
import { isFinancingRecord } from "./financing-editor";
import { isOperatingExpensesRecord } from "./operating-expenses-editor";

export const isPropertyRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export type PropertySnapshot = {
  property: PropertyRecord;
  acquisition_costs: AcquisitionCostsRecord | null;
  financing: FinancingRecord | null;
  operating_expenses: OperatingExpensesRecord | null;
};

/** Read data and revision in one database snapshot, before creating a draft. */
export async function getPropertySnapshot(id: string, owner: string): Promise<PropertySnapshot> {
  const { data, error } = await supabase.rpc("m4_property_snapshot", { p_id: id });
  const snapshot = data as PropertySnapshot | null;
  if (
    error ||
    !snapshot ||
    snapshot.property?.id !== id ||
    snapshot.property.user_id !== owner ||
    !isPropertyRevision(snapshot.property.revision) ||
    !(snapshot.acquisition_costs === null || isAcquisitionRecord(snapshot.acquisition_costs, id)) ||
    !(snapshot.financing === null || isFinancingRecord(snapshot.financing, id)) ||
    !(
      snapshot.operating_expenses === null ||
      isOperatingExpensesRecord(snapshot.operating_expenses, id)
    )
  )
    throw new Error("Saved information could not be loaded. Your draft has been retained.");
  return snapshot;
}

export type RevisionFailure = "not-sent" | "conflict" | "rejected" | "uncertain";
export class RevisionWriteError extends Error {
  constructor(readonly outcome: RevisionFailure) {
    super("Property save requires review.");
  }
}

export async function writeFinancialRevision(
  id: string,
  table: "acquisition_costs" | "financing" | "operating_expenses",
  values: object,
  revision: number | null,
  isCurrent: () => boolean,
): Promise<{ record: unknown; revision: number }> {
  if (!isPropertyRevision(revision) || !isCurrent()) throw new RevisionWriteError("not-sent");
  let result;
  try {
    result = await supabase.rpc("m4_write_property", {
      p_id: id,
      p_table: table,
      p_values: values as Json,
      p_revision: revision,
    });
  } catch {
    throw new RevisionWriteError("uncertain");
  }
  if (!result || typeof result !== "object") throw new RevisionWriteError("uncertain");
  const { data, error } = result;
  if (error) throw new RevisionWriteError(classifyRevisionError(error.code));
  const reply = data as { record: unknown; revision: number } | null;
  if (error !== null || !reply || reply.revision !== revision + 1)
    throw new RevisionWriteError("uncertain");
  return reply;
}

export function classifyRevisionError(code: string): "conflict" | "rejected" | "uncertain" {
  if (code === "PT409") return "conflict";
  return ["23502", "23503", "23505", "23514", "42501", "22001", "22003", "22023", "22P02"].includes(
    code,
  )
    ? "rejected"
    : "uncertain";
}
