// Data access for the property module. Ownership is enforced by the database
// (Row Level Security); the user_id below simply stamps the row on creation.
import { supabase } from "@/integrations/supabase/external-client";
import type { PropertyInput, PropertyPatch, PropertyRecord } from "./property-fields";
import {
  PropertyValidationError,
  validatePropertyCreate,
  validatePropertyUpdate,
} from "./property-save-validation";

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
  if (error) throw new Error(error.message);
  return (data ?? null) as PropertyRecord | null;
}

export async function createProperty(
  values: PropertyInput,
  userId: string,
): Promise<PropertyRecord> {
  const payload = validatePropertyCreate(values);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...payload, user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PropertyRecord;
}

export class PropertySaveConflictError extends Error {
  readonly code = "PROPERTY_SAVE_CONFLICT";
  constructor() {
    super(
      "This property changed or is no longer available. Your draft is kept here. Reload the property and review your changes before saving again.",
    );
    this.name = "PropertySaveConflictError";
  }
}

/** Conditional write preparation, not a qualified database revision protocol.
 * Existing now()-based updated_at is not guaranteed unique or tamper-proof.
 * A future database-owned revision and real concurrency/RLS tests are required.
 */
export async function updateProperty(
  id: string,
  values: PropertyPatch,
  expectedUpdatedAt: string,
): Promise<PropertyRecord> {
  const payload = validatePropertyUpdate(values);
  if (Object.keys(payload).length === 0) {
    throw new PropertyValidationError([
      { field: "payload", code: "EMPTY_PATCH", message: "No changes to save." },
    ]);
  }
  if (
    typeof expectedUpdatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      expectedUpdatedAt,
    )
  ) {
    throw new PropertyValidationError([
      {
        field: "payload",
        code: "MISSING_SAVE_BASELINE",
        message: "Reload this property before saving changes.",
      },
    ]);
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new PropertySaveConflictError();
  return data as PropertyRecord;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const propertyKeys = {
  all: ["properties"] as const,
  detail: (id: string) => ["properties", id] as const,
};
