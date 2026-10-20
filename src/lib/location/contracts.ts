import {
  coordinates,
  instant,
  nullableText,
  oneOf,
  operationId,
  positiveMetres,
  record,
  requireRule,
  safeInt,
  sha256,
  uuid,
} from "./primitives";
import type {
  Brand,
  Coordinates,
  Instant,
  Latitude,
  Longitude,
  PositiveInt,
  PositiveMetres,
  SafeInt,
  Sha256,
  UUID,
} from "./primitives";
import type { LocationWriteError } from "./errors";

export const propertyInputFields = [
  "project_name",
  "full_address",
  "city",
  "district",
  "state",
  "postcode",
  "country",
] as const;
export type PropertyLocationInputs = Readonly<
  Record<(typeof propertyInputFields)[number], string | null>
>;
/** Project exactly the seven stored fields; unrelated financial row fields are excluded. */
export function propertyLocationInputs(value: unknown): PropertyLocationInputs {
  requireRule(typeof value === "object" && value !== null, "propertyInput", "row object");
  const v = value as Record<string, unknown>;
  return Object.freeze(
    Object.fromEntries(
      propertyInputFields.map((key) => {
        requireRule(Object.hasOwn(v, key), key, "explicit own field");
        // v1 does not impose new address lengths/nonblank rules on saved Phase 1 text.
        return [key, nullableText(v[key], key, Number.MAX_SAFE_INTEGER)];
      }),
    ) as PropertyLocationInputs,
  );
}
export type ExpectedLocationState =
  | Readonly<{ kind: "ABSENT" }>
  | Readonly<{ kind: "EXACT"; revision: SafeInt; currentLocationVersionId: UUID | null }>;
export function expectedLocationState(value: unknown): ExpectedLocationState {
  requireRule(typeof value === "object" && value !== null, "expected", "object");
  const kind = (value as Record<string, unknown>)["kind"];
  if (kind === "ABSENT") {
    record(value, ["kind"], "expected");
    return Object.freeze({ kind });
  }
  const v = record(value, ["kind", "revision", "currentLocationVersionId"], "expected");
  oneOf(v["kind"], ["EXACT"], "expected.kind");
  return Object.freeze({
    kind: "EXACT",
    revision: safeInt(v["revision"]),
    currentLocationVersionId:
      v["currentLocationVersionId"] === null ? null : uuid(v["currentLocationVersionId"]),
  });
}
export type LocationInputFingerprint = Readonly<{
  serializer: "mpia-property-location-input-v1";
  digest: Sha256;
}>;
export const coordinateSources = ["NONE", "USER_PIN", "GEOCODER"] as const;
export const confirmationStatuses = [
  "UNCONFIRMED",
  "REVIEW_REQUIRED",
  "CONFIRMED",
  "CLEARED",
] as const;
export const precisions = [
  "UNKNOWN",
  "ROOFTOP",
  "BUILDING",
  "PARCEL",
  "STREET",
  "LOCALITY",
  "REGION",
  "USER_PIN",
] as const;
export const confidences = ["UNKNOWN", "LOW", "MEDIUM", "HIGH"] as const;
export const changeReasons = [
  "INITIAL_INPUT",
  "ADDRESS_CHANGED",
  "GEOCODE_SELECTED",
  "PIN_CONFIRMED",
  "LOCATION_CORRECTED",
  "METADATA_CORRECTED",
  "LOCATION_CLEARED",
] as const;
export type CoordinateSource = (typeof coordinateSources)[number];
export type ConfirmationStatus = (typeof confirmationStatuses)[number];
export type CoordinatePrecision = (typeof precisions)[number];
export type ChangeReason = (typeof changeReasons)[number];
export const semanticFields = [
  "input_address",
  "normalized_address",
  "normalization_version",
  "longitude",
  "latitude",
  "coordinate_source",
  "source_crs",
  "provider_version_id",
  "provider_candidate_id",
  "retrieved_at",
  "coordinate_precision",
  "accuracy_m",
  "geocode_confidence",
  "confidence_mapping_version",
  "confirmation_status",
  "confirmed_by",
  "change_reason",
] as const;
export type LocationFieldsV1 = Readonly<{
  input_address: string | null;
  normalized_address: string | null;
  normalization_version: string | null;
  longitude: Longitude | null;
  latitude: Latitude | null;
  coordinate_source: CoordinateSource;
  source_crs: "EPSG:4326" | null;
  provider_version_id: UUID | null;
  provider_candidate_id: string | null;
  retrieved_at: Instant | null;
  coordinate_precision: CoordinatePrecision;
  accuracy_m: PositiveMetres | null;
  geocode_confidence: (typeof confidences)[number];
  confidence_mapping_version: string | null;
  confirmation_status: ConfirmationStatus;
  confirmed_by: UUID | null;
  change_reason: ChangeReason;
}>;
export type ValidatedLocationPayload = Brand<LocationFieldsV1, "ValidatedLocationCombination">;
/** SQL-local combinations. Registry rights, receipt/created time and first-history reason
 * require trusted context later; this function establishes neither Auth nor persistence rights. */
export function locationPayload(value: unknown, actorId: UUID): ValidatedLocationPayload {
  uuid(actorId, "actorId");
  const v = record(value, semanticFields, "payload");
  const point =
    v["longitude"] === null && v["latitude"] === null
      ? null
      : coordinates({ crs: v["source_crs"], longitude: v["longitude"], latitude: v["latitude"] });
  const p: LocationFieldsV1 = {
    input_address: nullableText(v["input_address"], "input_address", 4000, true),
    normalized_address: nullableText(v["normalized_address"], "normalized_address", 4000, true),
    normalization_version: nullableText(
      v["normalization_version"],
      "normalization_version",
      160,
      true,
    ),
    longitude: point?.longitude ?? null,
    latitude: point?.latitude ?? null,
    coordinate_source: oneOf(v["coordinate_source"], coordinateSources, "coordinate_source"),
    source_crs:
      v["source_crs"] === null ? null : oneOf(v["source_crs"], ["EPSG:4326"], "source_crs"),
    provider_version_id: v["provider_version_id"] === null ? null : uuid(v["provider_version_id"]),
    provider_candidate_id: nullableText(
      v["provider_candidate_id"],
      "provider_candidate_id",
      1000,
      true,
    ),
    retrieved_at: v["retrieved_at"] === null ? null : instant(v["retrieved_at"]),
    coordinate_precision: oneOf(v["coordinate_precision"], precisions, "coordinate_precision"),
    accuracy_m: v["accuracy_m"] === null ? null : positiveMetres(v["accuracy_m"]),
    geocode_confidence: oneOf(v["geocode_confidence"], confidences, "geocode_confidence"),
    confidence_mapping_version: nullableText(
      v["confidence_mapping_version"],
      "confidence_mapping_version",
      160,
      true,
    ),
    confirmation_status: oneOf(
      v["confirmation_status"],
      confirmationStatuses,
      "confirmation_status",
    ),
    confirmed_by: v["confirmed_by"] === null ? null : uuid(v["confirmed_by"]),
    change_reason: oneOf(v["change_reason"], changeReasons, "change_reason"),
  };
  const unknownConfidence =
    p.geocode_confidence === "UNKNOWN" && p.confidence_mapping_version === null;
  requireRule(
    (p.normalized_address === null && p.normalization_version === null) ||
      (p.normalized_address !== null &&
        p.normalization_version !== null &&
        p.input_address !== null),
    "normalization",
    "paired with input",
  );
  requireRule(
    unknownConfidence ||
      (p.geocode_confidence !== "UNKNOWN" && p.confidence_mapping_version !== null),
    "confidence",
    "mapping iff known",
  );
  requireRule(
    p.provider_version_id === null
      ? p.provider_candidate_id === null && p.retrieved_at === null && unknownConfidence
      : p.retrieved_at !== null,
    "provider",
    "paired provider receipt",
  );
  requireRule(
    p.coordinate_source === "NONE"
      ? point === null &&
          p.source_crs === null &&
          p.coordinate_precision === "UNKNOWN" &&
          p.accuracy_m === null &&
          unknownConfidence
      : point !== null &&
          (p.coordinate_source === "USER_PIN"
            ? p.coordinate_precision === "USER_PIN" && unknownConfidence
            : p.coordinate_precision !== "USER_PIN" && p.provider_version_id !== null),
    "source",
    "coordinate/source combination",
  );
  requireRule(
    p.confirmation_status === "CONFIRMED"
      ? point !== null && p.confirmed_by === actorId
      : p.confirmed_by === null,
    "confirmation",
    "explicit actor and point",
  );
  requireRule(
    p.confirmation_status === "UNCONFIRMED"
      ? p.input_address !== null && p.coordinate_source === "NONE"
      : p.confirmation_status === "REVIEW_REQUIRED"
        ? p.input_address !== null || point !== null
        : p.confirmation_status === "CLEARED"
          ? p.coordinate_source === "NONE" &&
            p.input_address === null &&
            p.normalized_address === null &&
            p.normalization_version === null &&
            p.provider_version_id === null &&
            p.provider_candidate_id === null &&
            p.retrieved_at === null
          : true,
    "status",
    "SQL status combination",
  );
  requireRule(
    (p.change_reason === "LOCATION_CLEARED") === (p.confirmation_status === "CLEARED") &&
      (p.change_reason !== "PIN_CONFIRMED" ||
        (p.confirmation_status === "CONFIRMED" && p.coordinate_source === "USER_PIN")) &&
      (p.change_reason !== "GEOCODE_SELECTED" ||
        (p.coordinate_source === "GEOCODER" && point !== null)),
    "reason",
    "SQL reason combination",
  );
  return Object.freeze(p) as ValidatedLocationPayload;
}
export type ConfirmationState =
  | Readonly<{ kind: "UNCONFIRMED"; inputAddress: string; coordinates: null }>
  | Readonly<{
      kind: "REVIEW_REQUIRED";
      inputAddress: string | null;
      coordinates: Coordinates | null;
    }>
  | Readonly<{
      kind: "CONFIRMED";
      coordinates: Coordinates;
      confirmedBy: UUID;
      confirmedAt: Instant;
    }>
  | Readonly<{ kind: "CLEARED"; coordinates: null }>;
/** Only a later isolated server verifier may construct this capability. No constructor here. */
export type VerifiedActor = Brand<
  Readonly<{ userId: UUID; verifiedAt: Instant; issuer: string }>,
  "ServerVerifiedActor"
>;
export type TrustedLocationCommand = Readonly<{
  serializer: "mpia-location-command-v1";
  propertyId: UUID;
  operationId: UUID;
  expected: ExpectedLocationState;
  propertyInput: LocationInputFingerprint;
  operationKind: "APPEND_LOCATION";
  payload: ValidatedLocationPayload;
}>;
/** Structural validation only. Invoking it does not make a browser/provider trusted. */
export function locationCommand(value: unknown, actorId: UUID): TrustedLocationCommand {
  const v = record(
    value,
    [
      "serializer",
      "propertyId",
      "operationId",
      "expected",
      "propertyInput",
      "operationKind",
      "payload",
    ],
    "command",
  );
  oneOf(v["serializer"], ["mpia-location-command-v1"], "serializer");
  oneOf(v["operationKind"], ["APPEND_LOCATION"], "operationKind");
  const fingerprint = record(v["propertyInput"], ["serializer", "digest"], "propertyInput");
  oneOf(fingerprint["serializer"], ["mpia-property-location-input-v1"], "propertyInput.serializer");
  return Object.freeze({
    serializer: "mpia-location-command-v1",
    propertyId: uuid(v["propertyId"]),
    operationId: operationId(v["operationId"]),
    expected: expectedLocationState(v["expected"]),
    propertyInput: Object.freeze({
      serializer: "mpia-property-location-input-v1",
      digest: sha256(fingerprint["digest"]),
    }),
    operationKind: "APPEND_LOCATION",
    payload: locationPayload(v["payload"], actorId),
  });
}
export type StateObservation = Readonly<{
  revision: SafeInt;
  currentLocationVersionId: UUID | null;
}>;
export type PinnedOrigin = Readonly<{
  propertyId: UUID;
  locationVersionId: UUID;
  versionNumber: PositiveInt;
  coordinates: Coordinates;
}>;
export type LocationWriteSuccess = Readonly<{
  kind: "COMMITTED";
  disposition: "CREATED" | "DUPLICATE";
  operationId: UUID;
  version: Readonly<{
    id: UUID;
    propertyId: UUID;
    versionNumber: PositiveInt;
    propertyInputHash: Sha256;
    confirmation: ConfirmationState;
    createdAt: Instant;
  }>;
  observedState: StateObservation;
  versionIsObservedCurrent: boolean;
}>;
export type LocationWriteResult = LocationWriteSuccess | LocationWriteError;
/** Port only; no implementation, HTTP endpoint or provider access to this port. */
export interface TrustedLocationWriter {
  execute(actor: VerifiedActor, command: TrustedLocationCommand): Promise<LocationWriteResult>;
}
