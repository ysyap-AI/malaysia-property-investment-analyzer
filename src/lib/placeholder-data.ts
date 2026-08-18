import type { DataStatus } from "@/components/common/StatusBadge";

/**
 * Placeholder rows only. Phase 1 ships the application shell; real property
 * records will come from the database once persistence is implemented.
 */
export interface PlaceholderProperty {
  id: string;
  name: string;
  location: string;
  state: string;
  propertyType: string;
  askingPrice: string;
  netYield: string | null;
  score: string | null;
  status: DataStatus;
}

export const placeholderProperties: PlaceholderProperty[] = [
  {
    id: "sample-1",
    name: "Residensi Sentral Suite",
    location: "KL Sentral, Kuala Lumpur",
    state: "Kuala Lumpur",
    propertyType: "Serviced Apartment",
    askingPrice: "RM 780,000",
    netYield: null,
    score: null,
    status: "listing-data",
  },
  {
    id: "sample-2",
    name: "Setia Alam Link House",
    location: "Setia Alam, Shah Alam",
    state: "Selangor",
    propertyType: "2-Storey Terrace",
    askingPrice: "RM 650,000",
    netYield: null,
    score: null,
    status: "user-entered",
  },
  {
    id: "sample-3",
    name: "Tanjung Tokong Condo",
    location: "Tanjung Tokong, Penang",
    state: "Penang",
    propertyType: "Condominium",
    askingPrice: "RM 920,000",
    netYield: null,
    score: null,
    status: "estimated",
  },
  {
    id: "sample-4",
    name: "Iskandar Puteri Apartment",
    location: "Iskandar Puteri, Johor",
    state: "Johor",
    propertyType: "Apartment",
    askingPrice: "RM 430,000",
    netYield: null,
    score: null,
    status: "missing",
  },
];

export function findPlaceholderProperty(id: string): PlaceholderProperty | undefined {
  return placeholderProperties.find((p) => p.id === id);
}
