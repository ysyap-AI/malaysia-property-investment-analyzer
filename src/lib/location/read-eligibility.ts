import { locationPayload } from "./contracts";
import type {
  ConfirmationStatus,
  ExpectedLocationState,
  LocationFieldsV1,
  LocationInputFingerprint,
  PinnedOrigin,
} from "./contracts";
import {
  coordinates,
  instant,
  LocationValidationError,
  positiveInt,
  requireRule,
  safeInt,
  sha256,
  uuid,
} from "./primitives";
import type { Instant, PositiveInt, SafeInt, Sha256, UUID } from "./primitives";

/** Data access must authorize and obtain one coherent snapshot before invoking this
 * module. Eligibility is not authorization, freshness, or a transaction-time recheck. */
export type LocationVersion = Readonly<{
  id: UUID;
  propertyId: UUID;
  versionNumber: PositiveInt;
  propertyInputHash: Sha256;
  payload: LocationFieldsV1;
  createdBy: UUID;
  createdAt: Instant;
  confirmedAt: Instant | null;
}>;
export type LocationState = Readonly<{
  propertyId: UUID;
  revision: SafeInt;
  currentLocationVersionId: UUID | null;
}>;
export type AuthorizedLocationSnapshot = Readonly<{
  propertyId: UUID;
  currentPropertyInput: LocationInputFingerprint;
  state: LocationState | null;
  pointedVersion: LocationVersion | null;
}>;
export type UnavailableReason =
  | "NO_LOCATION_INTENT"
  | "UNCONFIRMED"
  | "REVIEW_REQUIRED"
  | "CLEARED"
  | "STALE_PROPERTY_INPUT"
  | "INVALID_LINEAGE"
  | "INVALID_COORDINATES"
  | "INVALID_LOCATION_STATE";
export type OriginEligibility =
  | Readonly<{ kind: "USABLE"; origin: PinnedOrigin }>
  | Readonly<{ kind: "UNAVAILABLE"; reason: UnavailableReason }>;
export type LocationReadDecision = Readonly<{
  stateObservation: ExpectedLocationState | null;
  latestIntent: Readonly<{ id: UUID; status: ConfirmationStatus }> | null;
  inputRelation: "MATCH" | "MISMATCH" | "NOT_APPLICABLE";
  currentOrigin: OriginEligibility;
}>;
const unavailable = (reason: UnavailableReason): OriginEligibility =>
  Object.freeze({ kind: "UNAVAILABLE", reason });
function invalidReason(error: unknown): UnavailableReason {
  return error instanceof LocationValidationError &&
    ["coordinates", "longitude", "latitude", "crs", "source_crs"].includes(error.field)
    ? "INVALID_COORDINATES"
    : "INVALID_LOCATION_STATE";
}
function lexicalInstant(value: Instant): string {
  const [base, fraction = ""] = value.slice(0, -1).split(".");
  return `${base}.${fraction.padEnd(6, "0")}`;
}
function validateVersion(version: LocationVersion): LocationFieldsV1 {
  uuid(version.id);
  uuid(version.propertyId);
  positiveInt(version.versionNumber);
  sha256(version.propertyInputHash);
  const createdAt = instant(version.createdAt);
  const p = locationPayload(version.payload, uuid(version.createdBy));
  if (p.confirmation_status === "CONFIRMED") {
    requireRule(
      version.confirmedAt !== null &&
        lexicalInstant(instant(version.confirmedAt)) === lexicalInstant(createdAt),
      "confirmedAt",
      "database-stamped creation instant",
    );
  } else requireRule(version.confirmedAt === null, "confirmedAt", "null when unconfirmed");
  requireRule(
    p.retrieved_at === null || lexicalInstant(p.retrieved_at) <= lexicalInstant(createdAt),
    "retrieved_at",
    "not after creation",
  );
  return p;
}
function origin(version: LocationVersion, payload: LocationFieldsV1): PinnedOrigin {
  return Object.freeze({
    propertyId: version.propertyId,
    locationVersionId: version.id,
    versionNumber: version.versionNumber,
    coordinates: coordinates({
      crs: payload.source_crs,
      longitude: payload.longitude,
      latitude: payload.latitude,
    }),
  });
}
export function evaluateCurrentOrigin(snapshot: AuthorizedLocationSnapshot): LocationReadDecision {
  let stateObservation: ExpectedLocationState | null = null;
  let latestIntent: LocationReadDecision["latestIntent"] = null;
  let inputRelation: LocationReadDecision["inputRelation"] = "NOT_APPLICABLE";
  const finish = (currentOrigin: OriginEligibility): LocationReadDecision =>
    Object.freeze({ stateObservation, latestIntent, inputRelation, currentOrigin });
  try {
    uuid(snapshot.propertyId);
    requireRule(
      snapshot.currentPropertyInput.serializer === "mpia-property-location-input-v1",
      "serializer",
      "v1 only",
    );
    sha256(snapshot.currentPropertyInput.digest);
    if (snapshot.state === null) {
      stateObservation = Object.freeze({ kind: "ABSENT" });
      return finish(
        unavailable(snapshot.pointedVersion === null ? "NO_LOCATION_INTENT" : "INVALID_LINEAGE"),
      );
    }
    const state = snapshot.state;
    requireRule(uuid(state.propertyId) === snapshot.propertyId, "lineage", "state property");
    safeInt(state.revision);
    if (state.currentLocationVersionId !== null) uuid(state.currentLocationVersionId);
    stateObservation = Object.freeze({
      kind: "EXACT",
      revision: state.revision,
      currentLocationVersionId: state.currentLocationVersionId,
    });
    if (state.currentLocationVersionId === null)
      return finish(
        unavailable(snapshot.pointedVersion === null ? "NO_LOCATION_INTENT" : "INVALID_LINEAGE"),
      );
    uuid(state.currentLocationVersionId);
    const version = snapshot.pointedVersion;
    if (
      version === null ||
      version.propertyId !== snapshot.propertyId ||
      version.id !== state.currentLocationVersionId
    )
      return finish(unavailable("INVALID_LINEAGE"));
    uuid(version.id);
    uuid(version.propertyId);
    positiveInt(version.versionNumber);
    sha256(version.propertyInputHash);
    // Relation remains visible for nonconfirmed intents too; status has precedence.
    inputRelation =
      version.propertyInputHash === snapshot.currentPropertyInput.digest ? "MATCH" : "MISMATCH";
    let payload: LocationFieldsV1;
    try {
      payload = validateVersion(version);
    } catch (error) {
      return finish(unavailable(invalidReason(error)));
    }
    latestIntent = Object.freeze({ id: version.id, status: payload.confirmation_status });
    if (payload.confirmation_status !== "CONFIRMED")
      return finish(unavailable(payload.confirmation_status));
    if (inputRelation === "MISMATCH") return finish(unavailable("STALE_PROPERTY_INPUT"));
    return finish(Object.freeze({ kind: "USABLE", origin: origin(version, payload) }));
  } catch {
    return finish(unavailable("INVALID_LINEAGE"));
  }
}
export type AuthorizedHistoricalPin = Readonly<{
  propertyId: UUID;
  locationVersionId: UUID;
  version: LocationVersion | null;
}>;
export type HistoricalOriginDecision = Readonly<{
  mode: "HISTORICAL";
  propertyInputHash: Sha256 | null;
  historicalOrigin: OriginEligibility;
}>;
/** Resolve only the explicitly requested pair. Today's pointer/hash are irrelevant. */
export function evaluateHistoricalOrigin(pin: AuthorizedHistoricalPin): HistoricalOriginDecision {
  let propertyInputHash: Sha256 | null = null;
  const finish = (historicalOrigin: OriginEligibility): HistoricalOriginDecision =>
    Object.freeze({ mode: "HISTORICAL", propertyInputHash, historicalOrigin });
  try {
    uuid(pin.propertyId);
    uuid(pin.locationVersionId);
    const version = pin.version;
    if (
      version === null ||
      version.id !== pin.locationVersionId ||
      version.propertyId !== pin.propertyId
    )
      return finish(unavailable("INVALID_LINEAGE"));
    uuid(version.id);
    uuid(version.propertyId);
    positiveInt(version.versionNumber);
    propertyInputHash = sha256(version.propertyInputHash);
    let payload: LocationFieldsV1;
    try {
      payload = validateVersion(version);
    } catch (error) {
      return finish(unavailable(invalidReason(error)));
    }
    if (payload.confirmation_status !== "CONFIRMED")
      return finish(unavailable(payload.confirmation_status));
    return finish(Object.freeze({ kind: "USABLE", origin: origin(version, payload) }));
  } catch {
    return finish(unavailable("INVALID_LINEAGE"));
  }
}
