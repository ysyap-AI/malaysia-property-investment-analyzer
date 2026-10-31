import { z } from "zod";
import { MALAYSIAN_STATES, propertySchema, type PropertyPatch } from "./property-fields";
import { PROPERTY_SAVE_POLICY, propertySaveTextSchema } from "./property-save-policy";

/** API inputs are prospective stored values, not display values. No text defaults on PATCH. */
const storedShape = propertySchema
  .extend({
    project_name: propertySaveTextSchema("project_name").refine((v): v is string => v !== null),
    full_address: propertySaveTextSchema("full_address"),
    city: propertySaveTextSchema("city"),
    district: propertySaveTextSchema("district"),
    state: propertySaveTextSchema("state").refine(
      (v) => v === null || v === "" || MALAYSIAN_STATES.some((state) => state === v),
      { message: "Choose a Malaysian state", params: { validationCode: "INVALID_STATE" } },
    ),
    postcode: propertySaveTextSchema("postcode").refine(
      (v) => v === null || v === "" || /^[0-9]{5}$/.test(v),
      {
        message: "Malaysian postcodes have 5 digits",
        params: { validationCode: "INVALID_POSTCODE" },
      },
    ),
    country: propertySaveTextSchema("country"),
    developer: propertySchema.shape.developer.nullable(),
    floor_level: propertySchema.shape.floor_level.nullable(),
    listing_url: propertySchema.shape.listing_url.nullable(),
    notes: propertySchema.shape.notes.nullable(),
  })
  .strict();

// These match the nullable/defaulted database columns for application creation.
const createSchema = storedShape.extend({
  full_address: storedShape.shape.full_address.default(null),
  city: storedShape.shape.city.default(null),
  district: storedShape.shape.district.default(null),
  state: storedShape.shape.state.default(null),
  postcode: storedShape.shape.postcode.default(null),
  country: storedShape.shape.country.default("Malaysia"),
});
const updateSchema = storedShape.partial();

export type PropertyValidationIssue = Readonly<{
  field: string;
  code: string;
  message: string;
  limit?: number;
  count?: number;
}>;

export class PropertyValidationError extends Error {
  readonly code = "PROPERTY_VALIDATION_FAILED";
  readonly policy = PROPERTY_SAVE_POLICY;
  constructor(readonly issues: readonly PropertyValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "PropertyValidationError";
  }
}

function parse<S extends z.ZodTypeAny>(schema: S, values: unknown): z.output<S> {
  // Undefined is neither an intentional clear nor an omitted own property.
  if (values && typeof values === "object" && Object.values(values).some((v) => v === undefined)) {
    throw new PropertyValidationError([
      {
        field: "payload",
        code: "UNDEFINED_VALUE",
        message: "Omit unchanged fields; use null to clear a permitted field.",
      },
    ]);
  }
  const result = schema.safeParse(values);
  if (result.success) return result.data;
  throw new PropertyValidationError(
    result.error.issues.map((issue) => {
      const field =
        typeof issue.path[0] === "string" && Object.hasOwn(storedShape.shape, issue.path[0])
          ? issue.path[0]
          : "payload";
      const params = issue.code === "custom" ? issue.params : undefined;
      // Zod's generated enum/unknown-key messages may contain submitted values.
      return {
        field,
        code:
          typeof params?.["validationCode"] === "string"
            ? params["validationCode"]
            : "INVALID_VALUE",
        message: issue.code === "custom" ? issue.message : `Invalid ${field.replaceAll("_", " ")}.`,
        ...(typeof params?.["limit"] === "number" ? { limit: params["limit"] } : {}),
        ...(typeof params?.["count"] === "number" ? { count: params["count"] } : {}),
      };
    }),
  );
}

export const validatePropertyCreate = (values: unknown) => parse(createSchema, values);
export function validatePropertyUpdate(values: unknown): PropertyPatch {
  // parse rejects every explicit undefined; Zod's partial output type still includes it.
  return parse(updateSchema, values) as PropertyPatch;
}
