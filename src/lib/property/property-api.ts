import { evidenceEqual } from "./investment-evidence";
import { classifyRevisionError, isPropertyRevision } from "./property-revision";
// Data access for the property module. Ownership is enforced by the database
// (Row Level Security); the user_id below simply stamps the row on creation.
import { supabase } from "@/integrations/supabase/external-client";
import type { PropertyInput, PropertyRecord } from "./property-fields";
import { validatePropertyCreate, validatePropertyUpdate } from "./property-save-validation";
import { PropertyEditError, type PropertyEditAttempt } from "./property-edit";
import { PropertyCreateError, type CreateAttempt } from "./property-create";
import { PropertyDeleteError, type DeleteAttempt } from "./property-delete";

const TABLE = "properties";

// Result assertions only narrow rent_verification_status to the values enforced
// by properties_rent_verification_status_check, which generated types omit.
// Table names, payloads, columns and database nullability remain schema-checked.
export async function listProperties(): Promise<PropertyRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PropertyRecord[];
}

export async function getProperty(id: string): Promise<PropertyRecord | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Saved property information could not be loaded.");
  return (data ?? null) as PropertyRecord | null;
}

export async function createProperty(
  attempt: CreateAttempt,
  isCurrent: () => boolean,
): Promise<PropertyRecord> {
  let values: PropertyInput;
  try {
    values = validatePropertyCreate(attempt.values);
    // The API accepts already parsed stored values; never add defaults or coerce here.
    if (
      !attempt.owner ||
      Object.keys(values).length !== Object.keys(attempt.values).length ||
      Object.entries(values).some(
        ([key, value]) => !Object.is(attempt.values[key as keyof PropertyInput], value),
      )
    )
      throw Error("Invalid attempt");
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== attempt.owner || !isCurrent()) throw Error("Expired context");
  } catch {
    throw new PropertyCreateError("not-sent");
  }
  let result;
  try {
    // Existing INSERT contract only; Supabase transport cannot prove dispatch on failures.
    result = await supabase
      .from(TABLE)
      .insert({ ...values, user_id: attempt.owner })
      .select("*")
      .single();
  } catch {
    throw new PropertyCreateError("uncertain");
  }
  if (!result || typeof result !== "object") throw new PropertyCreateError("uncertain");
  const { data, error } = result;
  if (error) {
    const rejected = ["42501", "23502", "23503", "23505", "23514", "22001", "22P02"].includes(
      error.code,
    );
    throw new PropertyCreateError(rejected ? "rejected" : "uncertain");
  }
  if (!matchesCreatedProperty(data, values, attempt.owner))
    throw new PropertyCreateError("uncertain");
  return data as PropertyRecord;
}

export function matchesCreatedProperty(
  row: unknown,
  values: Readonly<PropertyInput>,
  owner: string,
): row is PropertyRecord {
  if (!row || typeof row !== "object") return false;
  const data = row as Record<string, unknown>;
  const timestamp = (value: unknown) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
  return (
    typeof data["id"] === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data["id"]) &&
    data["user_id"] === owner &&
    isPropertyRevision(data["revision"]) &&
    timestamp(data["created_at"]) &&
    timestamp(data["updated_at"]) &&
    Object.entries(values).every(
      ([key, value]) => Object.hasOwn(data, key) && Object.is(data[key], value),
    )
  );
}

export async function updateProperty(
  attempt: PropertyEditAttempt,
  isCurrent: () => boolean,
): Promise<PropertyRecord> {
  let payload;
  try {
    payload = validatePropertyUpdate(attempt.patch);
  } catch {
    throw new PropertyEditError("not-sent");
  }
  if (
    !isPropertyRevision(attempt.original.revision) ||
    !Object.keys(payload).length ||
    attempt.original.id !== attempt.id ||
    attempt.original.user_id !== attempt.owner ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      attempt.original.updated_at,
    )
  )
    throw new PropertyEditError("not-sent");
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== attempt.owner || !isCurrent())
      throw new PropertyEditError("not-sent");
  } catch {
    throw new PropertyEditError("not-sent");
  }
  let result;
  try {
    result = await supabase.rpc("m4_write_property", {
      p_id: attempt.id, p_revision: attempt.original.revision,
      p_table: TABLE, p_values: payload as import("@/integrations/supabase/types").Json,
    });
  } catch { throw new PropertyEditError("uncertain"); }
  if (!result || typeof result !== "object") throw new PropertyEditError("uncertain");
  const { error } = result;
  const reply = result.data as { record: unknown; revision: number } | null;
  const data = reply?.record as PropertyRecord | null;
  if (error) {
    // Only known statement rejection codes establish rejection.
    throw new PropertyEditError(classifyRevisionError(error.code));
  }
  if (error !== null || reply?.revision !== attempt.original.revision + 1 || data?.revision !== reply.revision)
    throw new PropertyEditError("uncertain");
  if (!data) throw new PropertyEditError("uncertain");
  if (
    data.id !== attempt.id ||
    data.user_id !== attempt.owner ||
    typeof data.project_name !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      data.updated_at,
    ) ||
    Object.keys(attempt.original).some((key) => !Object.hasOwn(data, key)) ||
    Object.entries(payload).some(
      ([key, value]) =>
        !Object.hasOwn(data, key) || !evidenceEqual(data[key as keyof typeof data], value),
    )
  )
    throw new PropertyEditError("uncertain");
  return data as PropertyRecord;
}

export async function deleteProperty(
  attempt: DeleteAttempt,
  isCurrent: () => boolean,
): Promise<void> {
  try {
    if (
      !isPropertyRevision(attempt.original.revision) ||
      !attempt.id ||
      !attempt.owner ||
      attempt.original.id !== attempt.id ||
      attempt.original.user_id !== attempt.owner ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
        attempt.original.updated_at,
      ) ||
      !Number.isFinite(Date.parse(attempt.original.updated_at))
    )
      throw Error("Invalid context");
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== attempt.owner || !isCurrent()) throw Error("Expired context");
  } catch {
    throw new PropertyDeleteError("not-sent");
  }
  let result;
  try {
    result = await supabase.rpc("m4_write_property", {
      p_id: attempt.id, p_revision: attempt.original.revision,
      p_table: TABLE, p_values: {}, p_delete: true,
    });
  } catch {
    throw new PropertyDeleteError("uncertain");
  }
  if (!result || typeof result !== "object") throw new PropertyDeleteError("uncertain");
  const { data, error } = result;
  if (error) throw new PropertyDeleteError(classifyRevisionError(error.code));
  if (error !== null || !data || typeof data !== "object" || Array.isArray(data) ||
    Object.entries(attempt.original).some(([key, value]) =>
      !Object.hasOwn(data, key) || !evidenceEqual((data as Record<string, unknown>)[key], value)))
    throw new PropertyDeleteError("uncertain");
}

/** Deliberate read only: not a reconciliation endpoint and never proof of an uncertain DELETE. */
export async function observeDeletedProperty(
  attempt: DeleteAttempt,
  isCurrent: () => boolean,
): Promise<boolean> {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || auth.user?.id !== attempt.owner || !isCurrent())
      throw Error("Expired context");
    const result = await supabase
      .from(TABLE)
      .select("id,user_id")
      .eq("id", attempt.id)
      .eq("user_id", attempt.owner)
      .maybeSingle();
    if (!isCurrent() || !result || !Object.hasOwn(result, "data") || result.error !== null)
      throw Error("Unavailable");
    if (result.data === null) return true;
    if (result.data?.id !== attempt.id || result.data.user_id !== attempt.owner)
      throw Error("Unavailable");
    return false;
  } catch {
    throw new Error("The deletion check could not be completed. No further deletion was sent.");
  }
}

export const propertyKeys = {
  all: ["properties"] as const,
  detail: (id: string) => ["properties", id] as const,
};
