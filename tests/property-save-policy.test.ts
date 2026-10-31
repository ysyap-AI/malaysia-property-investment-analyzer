import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  emptyPropertyForm,
  propertySchema,
  propertyFormPatch,
  propertyUpdateFormSchema,
  recordToForm,
  type PropertyRecord,
} from "@/lib/property/property-fields";
import {
  PROPERTY_SAVE_POLICY,
  PROPERTY_SCALAR_LIMITS,
  measurePropertyText,
  propertySaveTextSchema,
  type PropertyTextField,
} from "@/lib/property/property-save-policy";
import {
  PropertyValidationError,
  validatePropertyCreate,
  validatePropertyUpdate,
} from "@/lib/property/property-save-validation";
import { propertyInputBytes, propertyInputHash } from "@/lib/location/canonical";
import { propertyBytes as referenceBytes } from "./phase2a03/canon-poc/reference-model.mjs";

const base = () => propertySchema.parse({ ...emptyPropertyForm, project_name: "Sample" });
const fields = Object.keys(PROPERTY_SCALAR_LIMITS) as PropertyTextField[];

describe("separate property-save scalar policy", () => {
  it("names the approved policy and exactly seven limits", () => {
    expect(PROPERTY_SAVE_POLICY).toBe("mpia-property-save-location-eligibility-v1");
    expect(PROPERTY_SCALAR_LIMITS).toEqual({
      project_name: 200,
      full_address: 500,
      city: 100,
      district: 100,
      state: 100,
      postcode: 20,
      country: 100,
    });
  });
  for (const field of fields) {
    for (const scalar of ["A", "中", "த", "😀"]) {
      it.each([-1, 0, 1])(`${field}: ${scalar} at limit %+i`, (delta) => {
        const value = scalar.repeat(PROPERTY_SCALAR_LIMITS[field] + delta);
        expect(propertySaveTextSchema(field).safeParse(value).success).toBe(delta <= 0);
      });
    }
    it(`${field}: accepts null only where nullable, with empty distinct from null`, () => {
      expect(propertySaveTextSchema(field).safeParse(null).success).toBe(field !== "project_name");
      expect(propertySaveTextSchema(field).safeParse("").success).toBe(field !== "project_name");
      if (field !== "project_name") expect(propertySaveTextSchema(field).parse("")).toBe("");
    });
    it.each(["\ud800", "\udfff", "a\ud800b", "\udc00\ud800", "\u0000"])(
      `${field}: rejects malformed/NUL %j`,
      (value) => {
        expect(propertySaveTextSchema(field).safeParse(value).success).toBe(false);
        expect(() => validatePropertyUpdate({ [field]: value })).toThrow(PropertyValidationError);
      },
    );
  }
  it.each([
    ["ASCII", 5],
    ["中文", 2],
    ["தமிழ்", 5],
    ["😀", 1],
    ["e\u0301", 2],
    ["é", 1],
    ["👩\u200d💻", 3],
    ["\u0001\t\n\r\u007f\u2028\uffff", 7],
  ])("counts %j by scalars", (value, count) => {
    expect(measurePropertyText(value as string)).toEqual({ count, error: null });
    expect(propertySaveTextSchema("full_address").parse(value)).toBe(value);
  });
  it("counts combining marks and joiners independently at the boundary", () => {
    expect(propertySaveTextSchema("city").safeParse("e\u0301".repeat(50)).success).toBe(true);
    expect(propertySaveTextSchema("city").safeParse("e\u0301".repeat(50) + "\u200d").success).toBe(
      false,
    );
  });
});

describe("entry versus prospective stored values", () => {
  it("keeps trimming, blank-to-null, country defaults and existing numeric behavior", () => {
    const value = propertySchema.parse({
      ...emptyPropertyForm,
      project_name: " Sample ",
      city: "  ",
      asking_price: "500,000",
    });
    expect(value).toMatchObject({
      project_name: "Sample",
      city: null,
      country: "Malaysia",
      asking_price: 500000,
    });
    expect(validatePropertyCreate(value)).toEqual(value);
    const { country: _country, ...omitted } = value;
    expect(validatePropertyCreate(omitted).country).toBe("Malaysia");
    expect(validatePropertyCreate({ ...value, country: null }).country).toBeNull();
    expect(validatePropertyCreate({ ...value, country: "" }).country).toBe("");
  });
  it("validates actual API stored bytes without silently trimming or normalizing", () => {
    expect(
      propertySchema.parse({
        ...emptyPropertyForm,
        project_name: "Sample",
        city: ` ${"a".repeat(100)} `,
      }).city,
    ).toHaveLength(100);
    expect(() => validatePropertyUpdate({ city: ` ${"a".repeat(100)} ` })).toThrow(
      PropertyValidationError,
    );
    expect(validatePropertyUpdate({ city: " e\u0301 " })).toEqual({ city: " e\u0301 " });
  });
  it.each(["full_address", "city", "district", "country", "project_name"])(
    "rejects changed oversized %s in form and API",
    (field) => {
      const value = "😀".repeat(PROPERTY_SCALAR_LIMITS[field as PropertyTextField] + 1);
      expect(propertyUpdateFormSchema.safeParse({ [field]: value }).success).toBe(false);
      expect(() => validatePropertyCreate({ ...base(), [field]: value })).toThrow(
        PropertyValidationError,
      );
      expect(() => validatePropertyUpdate({ [field]: value })).toThrow(PropertyValidationError);
    },
  );
  it("preserves the five-ASCII-digit postcode and Malaysian-state entry vocabulary", () => {
    for (const postcode of ["1234", "123456", "１２３４５", "abcde"]) {
      expect(
        propertySchema.safeParse({ ...emptyPropertyForm, project_name: "Sample", postcode })
          .success,
      ).toBe(false);
      expect(() => validatePropertyUpdate({ postcode })).toThrow(PropertyValidationError);
    }
    expect(propertyUpdateFormSchema.parse({ postcode: " 50470 " })).toEqual({ postcode: "50470" });
    expect(propertyUpdateFormSchema.parse({ state: "Selangor" })).toEqual({ state: "Selangor" });
    expect(propertyUpdateFormSchema.safeParse({ state: "Legacy state" }).success).toBe(false);
    expect(() => validatePropertyUpdate({ state: "Legacy state" })).toThrow(
      PropertyValidationError,
    );
  });
  it("does not impose the new caps on unrelated optional text", () => {
    expect(
      propertySchema.parse({
        ...emptyPropertyForm,
        project_name: "Sample",
        developer: "D".repeat(300),
      }).developer,
    ).toHaveLength(300);
  });
  it("returns value-free structured errors and rejects unsafe payload keys/types/undefined", () => {
    for (const value of [
      null,
      [],
      "secret input",
      { user_id: "private owner" },
      { city: 123 },
      { city: undefined },
      { property_status: "private status" },
    ]) {
      expect(() => validatePropertyUpdate(value)).toThrow(PropertyValidationError);
    }
    try {
      validatePropertyUpdate({ city: "x".repeat(101) });
    } catch (error) {
      expect(error).toMatchObject({
        code: "PROPERTY_VALIDATION_FAILED",
        policy: PROPERTY_SAVE_POLICY,
        issues: [{ field: "city", code: "TOO_LONG", limit: 100, count: 101 }],
      });
      expect(JSON.stringify(error)).not.toContain("x".repeat(101));
    }
    expect(() => validatePropertyCreate({ ...base(), project_name: null })).toThrow(
      PropertyValidationError,
    );
  });
});

describe("partial edit preservation", () => {
  const legacy = () =>
    ({
      ...base(),
      city: " city ",
      country: null,
      full_address: "x".repeat(501),
      state: "Old state",
      postcode: "OLD",
      district: "",
      id: "p1",
      user_id: "u1",
      created_at: "",
      updated_at: "2026-10-22T10:00:00.000001+00:00",
    }) as PropertyRecord;
  it("open/cancel and untouched null/empty/legacy values produce no patch", () => {
    const original = legacy();
    const initial = recordToForm(original);
    expect(initial.country).toBe("");
    expect(propertyFormPatch(initial, initial, new Set())).toEqual({});
    expect(original).toMatchObject({
      city: " city ",
      country: null,
      district: "",
      postcode: "OLD",
      state: "Old state",
    });
  });
  it("an unrelated price edit omits every legacy field and does not invent defaults", () => {
    const initial = recordToForm(legacy());
    const patch = propertyUpdateFormSchema.parse(
      propertyFormPatch({ ...initial, asking_price: "600000" }, initial, new Set(["asking_price"])),
    );
    expect(patch).toEqual({ asking_price: 600000 });
    expect(validatePropertyUpdate(patch)).toEqual(patch);
  });
  it("validates just a modified field, allows remediation and an explicit clear", () => {
    expect(propertyUpdateFormSchema.parse({ full_address: " Fixed " })).toEqual({
      full_address: "Fixed",
    });
    expect(validatePropertyUpdate({ full_address: "Fixed" })).toEqual({ full_address: "Fixed" });
    expect(validatePropertyUpdate({ country: null })).toEqual({ country: null });
    expect(validatePropertyUpdate({ country: "" })).toEqual({ country: "" });
    expect(validatePropertyUpdate({})).toEqual({});
  });
  it("editing then reverting a display value does not transform its original stored bytes", () => {
    const initial = recordToForm(legacy());
    expect(
      propertyFormPatch(initial, initial, new Set(["city", "country", "full_address"])),
    ).toEqual({});
  });
});

describe("unchanged canonical reference compatibility", () => {
  it.each(["ASCII", "中文 தமிழ்", "😀👩\u200d💻", "e\u0301", "é", "\u0001\t\n\u2028\uffff", '\\"'])(
    "compares exact V1 bytes and SHA-256 for %j",
    async (text) => {
      const row = Object.fromEntries(fields.map((field) => [field, text]));
      for (const field of fields) propertySaveTextSchema(field).parse(row[field]);
      const reference = referenceBytes(row);
      expect(Buffer.from(propertyInputBytes(row), "utf8")).toEqual(reference);
      expect(await propertyInputHash(row)).toBe(
        createHash("sha256").update(reference).digest("hex"),
      );
    },
  );
  it("attains the exact 6,776-byte save-policy ceiling independently of entry-format rules", () => {
    const row = Object.fromEntries(
      fields.map((field) => [field, "\u0001".repeat(PROPERTY_SCALAR_LIMITS[field])]),
    );
    for (const field of fields) propertySaveTextSchema(field).parse(row[field]);
    expect(Buffer.byteLength(propertyInputBytes(row), "utf8")).toBe(56 + 6 * 1120);
    expect(Buffer.from(propertyInputBytes(row), "utf8")).toEqual(referenceBytes(row));
  });
  it("retains unrestricted oversized serializer input and distinct composed spelling", () => {
    const row = { ...base(), full_address: "x".repeat(10000) };
    expect(Buffer.from(propertyInputBytes(row))).toEqual(referenceBytes(row));
    expect(propertyInputBytes({ ...row, city: "é" })).not.toBe(
      propertyInputBytes({ ...row, city: "e\u0301" }),
    );
  });
});
