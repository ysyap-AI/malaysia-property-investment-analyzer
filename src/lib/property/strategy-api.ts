import { supabase } from "@/integrations/supabase/external-client";
import type { Json } from "@/integrations/supabase/types";
import { evidenceEqual } from "./investment-evidence";
import {
  classifyRevisionError,
  isPropertyRevision,
  RevisionWriteError,
  type PropertySnapshot,
} from "./property-revision";
import { parseStrategyAssumptions, type StrategyAssumptions } from "@/lib/strategies/contracts";

/** Fixed, metadata-only PATCH; assumptions, targets and evidence share the property revision. */
export async function saveStrategyAssumptions(
  snapshot: PropertySnapshot,
  draft: StrategyAssumptions,
  owner: string,
  current: () => boolean,
) {
  let values: StrategyAssumptions | null;
  try {
    values = parseStrategyAssumptions(draft);
    const { data, error } = await supabase.auth.getUser();
    if (
      !values ||
      error ||
      data.user?.id !== owner ||
      snapshot.property.user_id !== owner ||
      !isPropertyRevision(snapshot.property.revision) ||
      !current()
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
      p_table: "properties",
      p_values: { investment_strategy_assumptions: values } as unknown as Json,
    });
  } catch {
    throw new RevisionWriteError("uncertain");
  }
  if (result?.error) throw new RevisionWriteError(classifyRevisionError(result.error.code));
  const reply = result?.data as { record?: Record<string, unknown>; revision?: number } | null;
  try {
    const row = reply?.record;
    if (
      result?.error !== null ||
      reply?.revision !== snapshot.property.revision + 1 ||
      !row ||
      row["revision"] !== reply.revision ||
      !evidenceEqual(parseStrategyAssumptions(row["investment_strategy_assumptions"]), values) ||
      Object.entries(snapshot.property).some(
        ([key, value]) =>
          !["investment_strategy_assumptions", "revision", "updated_at"].includes(key) &&
          !evidenceEqual(row[key], value),
      )
    )
      throw Error();
    return row;
  } catch {
    throw new RevisionWriteError("uncertain");
  }
}
