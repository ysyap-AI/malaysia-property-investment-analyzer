import { z } from "zod";

/** Save admission only. This must never narrow the unrestricted location V1 serializer. */
export const PROPERTY_SAVE_POLICY = "mpia-property-save-location-eligibility-v1";
export const PROPERTY_SCALAR_LIMITS = Object.freeze({
  project_name: 200,
  full_address: 500,
  city: 100,
  district: 100,
  state: 100,
  postcode: 20,
  country: 100,
});
export type PropertyTextField = keyof typeof PROPERTY_SCALAR_LIMITS;
export const PROPERTY_TEXT_LABELS: Readonly<Record<PropertyTextField, string>> = {
  project_name: "Project name",
  full_address: "Full address",
  city: "City",
  district: "District",
  state: "State",
  postcode: "Postcode",
  country: "Country",
};

export function isPropertyTextField(field: string): field is PropertyTextField {
  return Object.hasOwn(PROPERTY_SCALAR_LIMITS, field);
}

/** No allocation proportional to the number of scalars; never repairs invalid UTF-16. */
export function measurePropertyText(value: string): {
  count: number;
  error: "INVALID_UNICODE" | "NUL_NOT_ALLOWED" | null;
} {
  let count = 0;
  let error: "INVALID_UNICODE" | "NUL_NOT_ALLOWED" | null = null;
  for (const scalar of value) {
    const point = scalar.codePointAt(0)!;
    count++;
    if (point >= 0xd800 && point <= 0xdfff) error = "INVALID_UNICODE";
    else if (point === 0 && error === null) error = "NUL_NOT_ALLOWED";
  }
  return { count, error };
}

/** Checks the exact prospective stored value; no trim, normalization or truncation. */
export function propertySaveTextSchema(field: PropertyTextField) {
  return z
    .string()
    .nullable()
    .superRefine((value, ctx) => {
      const issue = (validationCode: string, message: string, count?: number) =>
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          params: { validationCode, limit: PROPERTY_SCALAR_LIMITS[field], count },
        });
      if (value === null) {
        if (field === "project_name") issue("REQUIRED", "Project name is required");
        return;
      }
      const { count, error } = measurePropertyText(value);
      const label = PROPERTY_TEXT_LABELS[field];
      if (error) {
        issue(
          error,
          error === "INVALID_UNICODE"
            ? `${label} contains an invalid Unicode sequence.`
            : `${label} cannot contain a NUL character.`,
        );
      } else if (count > PROPERTY_SCALAR_LIMITS[field]) {
        issue(
          "TOO_LONG",
          `${label} must be ${PROPERTY_SCALAR_LIMITS[field]} Unicode characters or fewer.`,
          count,
        );
      }
      if (field === "project_name" && value.trim() === "") {
        issue("REQUIRED", "Project name is required");
      }
    });
}
