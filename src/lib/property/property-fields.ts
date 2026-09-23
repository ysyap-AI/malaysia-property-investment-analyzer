// Single source of truth for the Phase 1 property record.
// No financial calculation lives here — this file only describes the fields,
// their allowed values and how a form value is turned into a stored value.
import { z } from "zod";

import type { DataStatus } from "@/components/common/StatusBadge";

export const MISSING_LABEL = "Missing / Not Verified";

export const PROPERTY_STATUSES = [
  { value: "prospect", label: "Prospect" },
  { value: "analysing", label: "Analysing" },
  { value: "watchlist", label: "Watchlist" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "purchased", label: "Purchased" },
  { value: "rejected", label: "Rejected" },
] as const;

export const ANALYSIS_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

export const RENT_VERIFICATION_STATUSES = [
  { value: "verified", label: "Verified" },
  { value: "user-entered", label: "User Entered" },
  { value: "estimated", label: "Estimated" },
  { value: "listing-data", label: "Listing Data" },
  { value: "missing", label: MISSING_LABEL },
] as const;

export const PROPERTY_TYPES = [
  "Condominium",
  "Serviced Apartment",
  "Apartment",
  "Terrace House",
  "Semi-Detached",
  "Bungalow",
  "Townhouse",
  "SoHo / SoFo / SoVo",
  "Other",
] as const;

export const TITLE_TYPES = ["Individual Title", "Strata Title", "Master Title"] as const;

export const TENURES = [
  { value: "freehold", label: "Freehold" },
  { value: "leasehold", label: "Leasehold" },
] as const;

export const FURNISHING_STATUSES = [
  "Unfurnished",
  "Partially Furnished",
  "Fully Furnished",
] as const;

export const UNIT_CONDITIONS = [
  "New / Vacant Possession",
  "Good",
  "Fair",
  "Needs Renovation",
] as const;

export const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number]["value"];
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number]["value"];
export type RentVerificationStatus = (typeof RENT_VERIFICATION_STATUSES)[number]["value"];

/** A blank form entry is unknown, not zero. */
const optionalText = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

const optionalNumber = (opts: { min?: number; max?: number } = {}) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const raw = typeof v === "number" ? String(v) : v.trim().replace(/,/g, "");
      if (raw === "") return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((v) => v === null || !Number.isNaN(v), { message: "Enter a number or leave it blank" })
    .refine((v) => v === null || opts.min === undefined || v >= opts.min, {
      message: `Must be ${opts.min} or more`,
    })
    .refine((v) => v === null || opts.max === undefined || v <= opts.max, {
      message: `Must be ${opts.max} or less`,
    });

const optionalEnum = <T extends string>(values: readonly T[]) =>
  z
    .union([z.enum(values as unknown as [T, ...T[]]), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === undefined ? null : (v as T | null)));

export const propertySchema = z.object({
  project_name: z.string().trim().min(1, { message: "Project name is required" }).max(200),
  full_address: optionalText,
  postcode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || /^[0-9]{5}$/.test(v), {
      message: "Malaysian postcodes have 5 digits",
    }),
  city: optionalText,
  district: optionalText,
  state: optionalEnum(MALAYSIAN_STATES),
  country: optionalText,
  property_type: optionalEnum(PROPERTY_TYPES),
  title_type: optionalEnum(TITLE_TYPES),
  tenure: optionalEnum(TENURES.map((t) => t.value)),
  lease_expiry_year: optionalNumber({ min: 1900, max: 3000 }),
  completion_year: optionalNumber({ min: 1900, max: 2100 }),
  developer: optionalText,
  built_up_sqft: optionalNumber({ min: 1 }),
  bedrooms: optionalNumber({ min: 0, max: 50 }),
  bathrooms: optionalNumber({ min: 0, max: 50 }),
  car_parks: optionalNumber({ min: 0, max: 50 }),
  floor_level: optionalText,
  total_floors: optionalNumber({ min: 1, max: 200 }),
  furnishing_status: optionalEnum(FURNISHING_STATUSES),
  unit_condition: optionalEnum(UNIT_CONDITIONS),
  asking_price: optionalNumber({ min: 0 }),
  target_purchase_price: optionalNumber({ min: 0 }),
  bank_valuation: optionalNumber({ min: 0 }),
  expected_monthly_rent: optionalNumber({ min: 0 }),
  rent_verification_status: z.enum(["verified", "user-entered", "estimated", "listing-data", "missing"]),
  property_status: z.enum(["prospect", "analysing", "watchlist", "shortlisted", "purchased", "rejected"]),
  analysis_status: z.enum(["not_started", "in_progress", "completed", "archived"]),
  listing_url: optionalText,
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

/** What the form holds (all strings) before validation. */
export type PropertyFormValues = z.input<typeof propertySchema>;
/** What gets written to the database (unknown values are null). */
export type PropertyInput = z.output<typeof propertySchema>;

export type PropertyRecord = PropertyInput & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export const emptyPropertyForm: PropertyFormValues = {
  project_name: "",
  full_address: "",
  postcode: "",
  city: "",
  district: "",
  state: "",
  country: "Malaysia",
  property_type: "",
  title_type: "",
  tenure: "",
  lease_expiry_year: "",
  completion_year: "",
  developer: "",
  built_up_sqft: "",
  bedrooms: "",
  bathrooms: "",
  car_parks: "",
  floor_level: "",
  total_floors: "",
  furnishing_status: "",
  unit_condition: "",
  asking_price: "",
  target_purchase_price: "",
  bank_valuation: "",
  expected_monthly_rent: "",
  rent_verification_status: "missing",
  property_status: "prospect",
  analysis_status: "not_started",
  listing_url: "",
  notes: "",
};

/** Turn a stored record back into form values without inventing zeros. */
export function recordToForm(record: PropertyRecord): PropertyFormValues {
  const out = { ...emptyPropertyForm } as Record<string, unknown>;
  for (const key of Object.keys(emptyPropertyForm)) {
    const value = (record as Record<string, unknown>)[key];
    out[key] = value === null || value === undefined ? (emptyPropertyForm as Record<string, unknown>)[key] : value;
  }
  // Text defaults must not be reintroduced when the stored value is genuinely empty.
  if (record.country === null) out['country'] = "";
  return out as PropertyFormValues;
}

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null,
): string {
  if (!value) return MISSING_LABEL;
  return options.find((o) => o.value === value)?.label ?? value;
}

export function rentStatusToDataStatus(value: string | null): DataStatus {
  const allowed: DataStatus[] = ["verified", "user-entered", "estimated", "listing-data", "missing"];
  return allowed.includes(value as DataStatus) ? (value as DataStatus) : "missing";
}

/** Display helpers — presentation only, no calculation. */
export function displayText(value: string | null | undefined): string {
  return value === null || value === undefined || value === "" ? MISSING_LABEL : value;
}

export function displayNumber(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) return MISSING_LABEL;
  return `${value.toLocaleString("en-MY")}${suffix}`;
}

export function displayMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return MISSING_LABEL;
  return `RM ${value.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
}
