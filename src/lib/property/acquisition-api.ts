import { parseEvidence, evidenceEqual, type SectionEvidence } from "./investment-evidence";
import { writeFinancialRevision, RevisionWriteError } from "./property-revision";
// Data access for acquisition costs. Ownership is enforced by the database:
// a row is only reachable when the signed-in user owns the parent property.
import { supabase } from "@/integrations/supabase/external-client";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import type { AcquisitionCostsInput, AcquisitionCostsRecord } from "./acquisition-fields";
import { AcquisitionSaveError, isAcquisitionRecord } from "./acquisition-editor";

const TABLE = "acquisition_costs";

export async function getAcquisitionCosts(
  propertyId: string,
): Promise<AcquisitionCostsRecord | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error || (data !== null && !isAcquisitionRecord(data, propertyId))) throw new Error("Read failed");
    return data ?? null;
  } catch {
    throw new Error("Unable to load acquisition costs. Review the draft and try loading again.");
  }
}

export async function saveAcquisitionCosts(
  propertyId: string,
  values: AcquisitionCostsInput,
  isCurrent: () => boolean,
  revision: number | null,
  evidence?: SectionEvidence | null,
): Promise<AcquisitionCostsRecord> {
  let metadata: SectionEvidence | null | undefined;
  try { metadata = evidence === undefined ? undefined : parseEvidence("acquisition_costs", evidence); }
  catch { throw new AcquisitionSaveError("not-sent"); }
  const submitted = Object.freeze({ ...values });
  if (calculateTotalAcquisitionCost(submitted).status === "invalid") {
    throw new AcquisitionSaveError(
      "not-sent",
      "Acquisition costs contain invalid amounts or exceed the supported numeric range.",
    );
  }
  try {
    const { record: data } = await writeFinancialRevision(propertyId, "acquisition_costs", { ...submitted, ...(metadata !== undefined ? { evidence_metadata: metadata } : {}) }, revision, isCurrent);
    if (!(isAcquisitionRecord(data, propertyId) && Object.entries(submitted).every(([key, value]) => Object.is(data[key as keyof typeof submitted], value)))) throw new AcquisitionSaveError("uncertain");
    if (metadata !== undefined && !evidenceEqual((data as { evidence_metadata?: unknown }).evidence_metadata, metadata)) throw new AcquisitionSaveError("uncertain");
    return data as AcquisitionCostsRecord;
  } catch (error) {
    if (error instanceof AcquisitionSaveError) throw error;
    if (error instanceof RevisionWriteError) throw new AcquisitionSaveError(error.outcome);
    throw new AcquisitionSaveError("uncertain");
  }
}

export const acquisitionKeys = {
  detail: (propertyId: string) => ["acquisition-costs", propertyId] as const,
};
