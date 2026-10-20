import { locationCommand, locationPayload } from "../../src/lib/location/contracts";
import { instant, positiveInt, safeInt, sha256, uuid } from "../../src/lib/location/primitives";
import type { LocationFieldsV1 } from "../../src/lib/location/contracts";
import type { LocationVersion } from "../../src/lib/location/read-eligibility";

export const propertyId = uuid("f1000000-0000-0000-0000-000000000001");
export const actorId = uuid("f2000000-0000-0000-0000-000000000001");
export const operationId = uuid("f3000000-0000-0000-0000-000000000001");
export const versionId = uuid("f4000000-0000-0000-0000-000000000001");
export const providerId = uuid("f5000000-0000-0000-0000-000000000001");
export const digest = sha256("a".repeat(64));
export const time = instant("2026-10-20T01:02:03.000Z");
export const property = Object.freeze({
  project_name: "Synthetic",
  full_address: null,
  city: "Kuala Lumpur",
  district: null,
  state: "WP Kuala Lumpur",
  postcode: "50000",
  country: "Malaysia",
});
export const pin = Object.freeze({
  input_address: null,
  normalized_address: null,
  normalization_version: null,
  longitude: 101.6869,
  latitude: 3.139,
  coordinate_source: "USER_PIN",
  source_crs: "EPSG:4326",
  provider_version_id: null,
  provider_candidate_id: null,
  retrieved_at: null,
  coordinate_precision: "USER_PIN",
  accuracy_m: null,
  geocode_confidence: "UNKNOWN",
  confidence_mapping_version: null,
  confirmation_status: "REVIEW_REQUIRED",
  confirmed_by: null,
  change_reason: "INITIAL_INPUT",
});
export const none = Object.freeze({
  ...pin,
  longitude: null,
  latitude: null,
  coordinate_source: "NONE",
  source_crs: null,
  coordinate_precision: "UNKNOWN",
  input_address: "Address",
  confirmation_status: "UNCONFIRMED",
});
export const cleared = Object.freeze({
  ...none,
  input_address: null,
  confirmation_status: "CLEARED",
  change_reason: "LOCATION_CLEARED",
});
export const confirmed = Object.freeze({
  ...pin,
  confirmation_status: "CONFIRMED",
  confirmed_by: actorId,
  change_reason: "PIN_CONFIRMED",
});
export const geocoded = Object.freeze({
  ...pin,
  coordinate_source: "GEOCODER",
  coordinate_precision: "ROOFTOP",
  provider_version_id: providerId,
  provider_candidate_id: "opaque-1",
  retrieved_at: time,
  change_reason: "GEOCODE_SELECTED",
});
export function command(payload: unknown = pin) {
  return locationCommand(
    {
      serializer: "mpia-location-command-v1",
      propertyId,
      operationId,
      expected: { kind: "ABSENT" },
      propertyInput: { serializer: "mpia-property-location-input-v1", digest },
      operationKind: "APPEND_LOCATION",
      payload,
    },
    actorId,
  );
}
export function version(payload: unknown = confirmed): LocationVersion {
  const p = locationPayload(payload, actorId);
  return Object.freeze({
    id: versionId,
    propertyId,
    versionNumber: positiveInt(1),
    propertyInputHash: digest,
    payload: p,
    createdBy: actorId,
    createdAt: time,
    confirmedAt: p.confirmation_status === "CONFIRMED" ? time : null,
  });
}
export const state = Object.freeze({
  propertyId,
  revision: safeInt(1),
  currentLocationVersionId: versionId,
});
export const unsafePayload = (value: unknown) => value as LocationFieldsV1;
