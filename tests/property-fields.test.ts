import { describe, expect, it } from "vitest";

import {
  emptyPropertyForm,
  propertySchema,
  recordToForm,
  type PropertyRecord,
} from "@/lib/property/property-fields";

const base = { ...emptyPropertyForm, project_name: "Residensi Test" };

describe("property field rules", () => {
  it("requires a project name", () => {
    const result = propertySchema.safeParse({ ...base, project_name: "  " });
    expect(result.success).toBe(false);
  });

  it("keeps unknown numeric values as null, never zero", () => {
    const result = propertySchema.parse(base);
    expect(result.asking_price).toBeNull();
    expect(result.expected_monthly_rent).toBeNull();
    expect(result.built_up_sqft).toBeNull();
    expect(result.bedrooms).toBeNull();
    expect(result.lease_expiry_year).toBeNull();
    expect(result.bank_valuation).toBeNull();
  });

  it("keeps unknown text values as null, never empty strings", () => {
    const result = propertySchema.parse(base);
    expect(result.full_address).toBeNull();
    expect(result.city).toBeNull();
    expect(result.property_type).toBeNull();
    expect(result.tenure).toBeNull();
  });

  it("stores a genuine zero when the user types zero", () => {
    const result = propertySchema.parse({ ...base, car_parks: "0" });
    expect(result.car_parks).toBe(0);
  });

  it("accepts numbers typed with thousands separators", () => {
    const result = propertySchema.parse({ ...base, asking_price: "780,000" });
    expect(result.asking_price).toBe(780000);
  });

  it("rejects text in a numeric field instead of silently using zero", () => {
    const result = propertySchema.safeParse({ ...base, asking_price: "about half a million" });
    expect(result.success).toBe(false);
  });

  it("validates Malaysian postcodes", () => {
    expect(propertySchema.safeParse({ ...base, postcode: "50470" }).success).toBe(true);
    expect(propertySchema.safeParse({ ...base, postcode: "5047" }).success).toBe(false);
    expect(propertySchema.parse({ ...base, postcode: "" }).postcode).toBeNull();
  });

  it("only allows the agreed property statuses", () => {
    expect(propertySchema.safeParse({ ...base, property_status: "shortlisted" }).success).toBe(true);
    expect(propertySchema.safeParse({ ...base, property_status: "maybe" }).success).toBe(false);
  });

  it("defaults rent evidence to Missing / Not Verified", () => {
    expect(propertySchema.parse(base).rent_verification_status).toBe("missing");
  });

  it("turns a stored record back into form values without inventing zeros", () => {
    const record = {
      ...propertySchema.parse({ ...base, asking_price: "500000" }),
      id: "1",
      user_id: "u1",
      created_at: "",
      updated_at: "",
    } as PropertyRecord;
    const form = recordToForm(record);
    expect(form.asking_price).toBe(500000);
    expect(form.bedrooms).toBe("");
    expect(form.city).toBe("");
  });
});
