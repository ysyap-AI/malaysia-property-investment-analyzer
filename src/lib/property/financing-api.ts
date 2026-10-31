import { parseEvidence, evidenceEqual, type SectionEvidence } from "./investment-evidence";
import { writeFinancialRevision, RevisionWriteError } from "./property-revision";
// Data access for financing. Ownership is enforced by the database (RLS).
import { supabase } from "@/integrations/supabase/external-client";
import type { FinancingRecord, FinancingRow } from "./financing-fields";
import {
  FinancingSaveError,
  isFinancingRecord,
  isFinancingRow,
  matchesFinancingRow,
} from "./financing-editor";

const TABLE = "financing";

export async function getFinancing(propertyId: string): Promise<FinancingRecord | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error || (data !== null && !isFinancingRecord(data, propertyId)))
      throw new Error("Read failed");
    return data;
  } catch {
    throw new Error("Unable to load financing. Review the draft and try loading again.");
  }
}

export async function saveFinancing(
  propertyId: string,
  values: FinancingRow,
  canDispatch: () => boolean,
  revision: number | null,
  evidence?: SectionEvidence | null,
): Promise<FinancingRecord> {
  let metadata: SectionEvidence | null | undefined;
  try { metadata = evidence === undefined ? undefined : parseEvidence("financing", evidence); }
  catch { throw new FinancingSaveError("not-sent"); }
  const submitted = Object.freeze({ ...values });
  if (!isFinancingRow(submitted)) throw new FinancingSaveError("not-sent");
  try {
    const { record: data } = await writeFinancialRevision(propertyId, "financing", { ...submitted, ...(metadata !== undefined ? { evidence_metadata: metadata } : {}) }, revision, canDispatch);
    if (!(matchesFinancingRow(data, propertyId, submitted))) throw new FinancingSaveError("uncertain");
    if (metadata !== undefined && !evidenceEqual((data as { evidence_metadata?: unknown }).evidence_metadata, metadata)) throw new FinancingSaveError("uncertain");
    return data as FinancingRecord;
  } catch (error) {
    if (error instanceof FinancingSaveError) throw error;
    if (error instanceof RevisionWriteError) throw new FinancingSaveError(error.outcome);
    throw new FinancingSaveError("uncertain");
  }
}

export const financingKeys = {
  detail: (propertyId: string) => ["financing", propertyId] as const,
};
