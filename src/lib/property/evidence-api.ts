import { supabase } from "@/integrations/supabase/external-client";
import type { Json } from "@/integrations/supabase/types";
import {
  classifyRevisionError,
  isPropertyRevision,
  RevisionWriteError,
  type PropertySnapshot,
} from "./property-revision";
import {
  evidenceEqual,
  parseEvidence,
  type EvidenceSection,
  type SectionEvidence,
} from "./investment-evidence";
export const snapshotSection = (snapshot: PropertySnapshot, section: EvidenceSection) =>
  section === "properties" ? snapshot.property : snapshot[section];
/** Fixed metadata-only PATCH: never creates a child or submits values/declarations. */
export async function saveSectionEvidence(
  snapshot: PropertySnapshot,
  section: EvidenceSection,
  evidence: SectionEvidence,
  owner: string,
  isCurrent: () => boolean,
) {
  const original = snapshotSection(snapshot, section);
  let metadata;
  try {
    metadata = parseEvidence(section, evidence);
    const { data, error } = await supabase.auth.getUser();
    if (
      !original ||
      !metadata ||
      !isPropertyRevision(snapshot.property.revision) ||
      snapshot.property.user_id !== owner ||
      error ||
      data.user?.id !== owner ||
      !isCurrent()
    )
      throw Error();
  } catch {
    throw new RevisionWriteError("not-sent");
  }
  let result;
  try {
    result = await supabase.rpc("m4_write_property", {
      p_id: snapshot.property.id,
      p_revision: snapshot.property.revision,
      p_table: section,
      p_values: { evidence_metadata: metadata } as Json,
    });
  } catch {
    throw new RevisionWriteError("uncertain");
  }
  if (result?.error) throw new RevisionWriteError(classifyRevisionError(result.error.code));
  const reply = result?.data as { record?: Record<string, unknown>; revision?: number } | null;
  const row = reply?.record;
  try {
    if (
      result?.error !== null ||
      reply?.revision !== snapshot.property.revision + 1 ||
      !row ||
      !evidenceEqual(parseEvidence(section, row["evidence_metadata"]), metadata) ||
      Object.entries(original!).some(
        ([key, value]) =>
          !["evidence_metadata", "updated_at", "revision"].includes(key) &&
          !evidenceEqual(row[key], value),
      ) ||
      (section === "properties" && row["revision"] !== reply.revision)
    )
      throw new RevisionWriteError("uncertain");
    return row;
  } catch {
    throw new RevisionWriteError("uncertain");
  }
}
