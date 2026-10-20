import {
  coordinates,
  instant,
  nullableText,
  oneOf,
  positiveInt,
  positiveMetres,
  record,
  requireRule,
  safeInt,
  text,
  uuid,
} from "./primitives";
import type {
  Coordinates,
  Instant,
  Metres,
  NonEmpty,
  PositiveInt,
  PositiveMetres,
  SafeInt,
  Seconds,
  UUID,
} from "./primitives";
import { providerError } from "./errors";
import type { ProviderError } from "./errors";
import { confidences, precisions } from "./contracts";
import type { CoordinatePrecision, PinnedOrigin } from "./contracts";

export type ProviderCapability = "GEOCODING" | "PLACES" | "ROUTING" | "MAP_RENDERING";
export type RetentionClass =
  "UNREVIEWED" | "PERMANENT" | "TEMPORARY_30_DAY" | "ID_ONLY_PERMANENT" | "NO_PERSISTENCE";
export type ProviderRights = Readonly<{
  providerVersionId: UUID;
  termsReference: string | null;
  reviewReference: string | null;
  reviewedAt: Instant | null;
  retentionClass: RetentionClass;
  retentionLimitSeconds: PositiveInt | null;
  attribution: Readonly<{ required: boolean; text: string | null }>;
  fieldPolicyVersion: string | null;
  persistableFields: readonly string[];
  eligibleForHistoricalReplay: boolean;
}>;
export type ProviderProvenance = Readonly<{
  providerVersionId: UUID;
  adapterVersion: string;
  retrievedAt: Instant;
  observedAt: Instant | null;
  sourceReference: string | null;
  rights: ProviderRights;
}>;
export type MatchConfidence =
  | Readonly<{ level: "UNKNOWN"; mappingVersion: null }>
  | Readonly<{ level: "LOW" | "MEDIUM" | "HIGH"; mappingVersion: string }>;
export type SourceQuality = Readonly<{
  precision: Exclude<CoordinatePrecision, "USER_PIN">;
  accuracyM: PositiveMetres | null;
  matchConfidence: MatchConfidence;
}>;
export type ProviderOutcome<T, EmptyMetadata> =
  | Readonly<{ kind: "SUCCESS"; data: T; provenance: ProviderProvenance }>
  | Readonly<{ kind: "NO_RESULTS"; details: EmptyMetadata; provenance: ProviderProvenance }>
  | Readonly<{ kind: "FAILURE"; error: ProviderError }>;
function boolean(value: unknown, field: string): boolean {
  requireRule(typeof value === "boolean", field, "boolean");
  return value;
}
function strings(value: unknown, field: string): readonly string[] {
  requireRule(Array.isArray(value), field, "string array");
  return Object.freeze(value.map((item) => text(item, field, 160, true)));
}
/** Parses policy shape only; policy must be resolved by trusted application code. */
export function providerRights(value: unknown): ProviderRights {
  const v = record(
    value,
    [
      "providerVersionId",
      "termsReference",
      "reviewReference",
      "reviewedAt",
      "retentionClass",
      "retentionLimitSeconds",
      "attribution",
      "fieldPolicyVersion",
      "persistableFields",
      "eligibleForHistoricalReplay",
    ],
    "rights",
  );
  const a = record(v["attribution"], ["required", "text"], "attribution");
  const attribution = Object.freeze({
    required: boolean(a["required"], "required"),
    text: nullableText(a["text"], "attribution.text", 4000, true),
  });
  requireRule(!attribution.required || attribution.text !== null, "attribution", "required text");
  return Object.freeze({
    providerVersionId: uuid(v["providerVersionId"]),
    termsReference: nullableText(v["termsReference"], "termsReference", 4000, true),
    reviewReference: nullableText(v["reviewReference"], "reviewReference", 4000, true),
    reviewedAt: v["reviewedAt"] === null ? null : instant(v["reviewedAt"]),
    retentionClass: oneOf(
      v["retentionClass"],
      ["UNREVIEWED", "PERMANENT", "TEMPORARY_30_DAY", "ID_ONLY_PERMANENT", "NO_PERSISTENCE"],
      "retentionClass",
    ),
    retentionLimitSeconds:
      v["retentionLimitSeconds"] === null ? null : positiveInt(v["retentionLimitSeconds"]),
    attribution,
    fieldPolicyVersion: nullableText(v["fieldPolicyVersion"], "fieldPolicyVersion", 160, true),
    persistableFields: strings(v["persistableFields"], "persistableFields"),
    eligibleForHistoricalReplay: boolean(
      v["eligibleForHistoricalReplay"],
      "eligibleForHistoricalReplay",
    ),
  });
}
/** Policy predicate, not registry/authentication verification or a license promise. */
export function permitsHistoricalFields(
  policy: ProviderRights,
  providerId: UUID,
  fields: readonly string[],
): boolean {
  const r = providerRights(policy);
  return (
    r.providerVersionId === uuid(providerId) &&
    r.retentionClass === "PERMANENT" &&
    r.retentionLimitSeconds === null &&
    r.reviewedAt !== null &&
    r.termsReference !== null &&
    r.reviewReference !== null &&
    r.fieldPolicyVersion !== null &&
    r.eligibleForHistoricalReplay &&
    fields.every((field) => r.persistableFields.includes(field))
  );
}
export function providerProvenance(value: unknown): ProviderProvenance {
  const v = record(
    value,
    [
      "providerVersionId",
      "adapterVersion",
      "retrievedAt",
      "observedAt",
      "sourceReference",
      "rights",
    ],
    "provenance",
  );
  const rights = providerRights(v["rights"]);
  const id = uuid(v["providerVersionId"]);
  requireRule(id === rights.providerVersionId, "rights", "same provider version");
  const sourceReference = nullableText(v["sourceReference"], "sourceReference", 1000, true);
  // Only safe opaque references, never a vendor URL/query/token.
  requireRule(
    sourceReference === null || /^[A-Za-z0-9._-]+$/.test(sourceReference),
    "sourceReference",
    "opaque reference",
  );
  return Object.freeze({
    providerVersionId: id,
    adapterVersion: text(v["adapterVersion"], "adapterVersion", 160, true),
    retrievedAt: instant(v["retrievedAt"]),
    observedAt: v["observedAt"] === null ? null : instant(v["observedAt"]),
    sourceReference,
    rights,
  });
}
export type GeocodeRequest = Readonly<{
  query: string;
  countryBias: string | null;
  language: string | null;
  candidateLimit: PositiveInt;
}>;
/** Limit is explicit caller policy; no unreviewed default cap is introduced. */
export function geocodeRequest(value: unknown, maxCandidates: PositiveInt): GeocodeRequest {
  positiveInt(maxCandidates);
  const v = record(value, ["query", "countryBias", "language", "candidateLimit"], "geocodeRequest");
  const limit = positiveInt(v["candidateLimit"]);
  requireRule(limit <= maxCandidates, "candidateLimit", "request policy cap");
  return Object.freeze({
    query: text(v["query"], "query", 4000, true),
    countryBias: nullableText(v["countryBias"], "countryBias", 160, true),
    language: nullableText(v["language"], "language", 160, true),
    candidateLimit: limit,
  });
}
export type GeocodeCandidate = Readonly<{
  candidateRef: string;
  coordinates: Coordinates;
  formattedAddress: string | null;
  normalizationVersion: string | null;
  sourceQuality: SourceQuality;
}>;
export type GeocodeResult = ProviderOutcome<
  NonEmpty<GeocodeCandidate>,
  Readonly<{ reason: "NO_MATCH"; queryScope: "REQUEST_ONLY" }>
>;
export interface GeocodingProvider {
  readonly providerVersionId: UUID;
  geocode(
    request: GeocodeRequest,
    options: Readonly<{ signal: AbortSignal; timeoutMs: PositiveInt }>,
  ): Promise<GeocodeResult>;
}
export function geocodeResult(
  value: unknown,
  request: GeocodeRequest,
  providerId: UUID,
): GeocodeResult {
  requireRule(typeof value === "object" && value !== null, "result", "object");
  const kind = (value as Record<string, unknown>)["kind"];
  if (kind === "FAILURE") {
    const v = record(value, ["kind", "error"], "result");
    return Object.freeze({ kind, error: providerError(v["error"]) });
  }
  const v = record(
    value,
    kind === "SUCCESS" ? ["kind", "data", "provenance"] : ["kind", "details", "provenance"],
    "result",
  );
  oneOf(kind, ["SUCCESS", "NO_RESULTS"], "kind");
  const provenance = providerProvenance(v["provenance"]);
  requireRule(provenance.providerVersionId === uuid(providerId), "provenance", "expected provider");
  if (kind === "NO_RESULTS") {
    const d = record(v["details"], ["reason", "queryScope"], "details");
    oneOf(d["reason"], ["NO_MATCH"], "reason");
    oneOf(d["queryScope"], ["REQUEST_ONLY"], "queryScope");
    return Object.freeze({
      kind,
      details: Object.freeze({ reason: "NO_MATCH", queryScope: "REQUEST_ONLY" }),
      provenance,
    });
  }
  const data = v["data"];
  requireRule(
    Array.isArray(data) && data.length > 0 && data.length <= positiveInt(request.candidateLimit),
    "data",
    "nonempty bounded candidates",
  );
  const candidates = data.map((item) => {
    const c = record(
      item,
      ["candidateRef", "coordinates", "formattedAddress", "normalizationVersion", "sourceQuality"],
      "candidate",
    );
    const q = record(c["sourceQuality"], ["precision", "accuracyM", "matchConfidence"], "quality");
    const confidence = record(q["matchConfidence"], ["level", "mappingVersion"], "matchConfidence");
    const level = oneOf(confidence["level"], confidences, "level");
    const mapping = nullableText(confidence["mappingVersion"], "mappingVersion", 160, true);
    requireRule(
      (level === "UNKNOWN") === (mapping === null),
      "mappingVersion",
      "mapping iff known",
    );
    const precision = oneOf(q["precision"], precisions, "precision");
    requireRule(precision !== "USER_PIN", "precision", "provider cannot author user pin");
    const formattedAddress = nullableText(c["formattedAddress"], "formattedAddress", 4000, true);
    const normalizationVersion = nullableText(
      c["normalizationVersion"],
      "normalizationVersion",
      160,
      true,
    );
    requireRule(
      (formattedAddress === null) === (normalizationVersion === null),
      "normalizationVersion",
      "paired address/version",
    );
    return Object.freeze({
      candidateRef: text(c["candidateRef"], "candidateRef", 1000, true),
      coordinates: coordinates(c["coordinates"]),
      formattedAddress,
      normalizationVersion,
      sourceQuality: Object.freeze({
        precision,
        accuracyM: q["accuracyM"] === null ? null : positiveMetres(q["accuracyM"]),
        matchConfidence: Object.freeze(
          level === "UNKNOWN"
            ? ({ level, mappingVersion: null } as const)
            : { level, mappingVersion: mapping! },
        ),
      }),
    });
  });
  requireRule(
    new Set(candidates.map((c) => c.candidateRef)).size === candidates.length,
    "candidateRef",
    "unique in response",
  );
  return Object.freeze({
    kind: "SUCCESS",
    data: Object.freeze(candidates) as unknown as NonEmpty<GeocodeCandidate>,
    provenance,
  });
}

// The following are ports/stubs only. No adapters, persistence or fact conversion.
export type SearchCoverage = Readonly<{
  radiusM: PositiveMetres;
  returnedCount: SafeInt;
  resultCap: PositiveInt;
  completeness: "COMPLETE_REQUEST_SCOPE" | "PARTIAL" | "UNKNOWN";
  truncated: boolean;
  morePages: "YES" | "NO" | "UNKNOWN";
}>;
export function searchCoverage(value: unknown): SearchCoverage {
  const v = record(
    value,
    ["radiusM", "returnedCount", "resultCap", "completeness", "truncated", "morePages"],
    "coverage",
  );
  const c = {
    radiusM: positiveMetres(v["radiusM"]),
    returnedCount: safeInt(v["returnedCount"]),
    resultCap: positiveInt(v["resultCap"]),
    completeness: oneOf(
      v["completeness"],
      ["COMPLETE_REQUEST_SCOPE", "PARTIAL", "UNKNOWN"],
      "completeness",
    ),
    truncated: boolean(v["truncated"], "truncated"),
    morePages: oneOf(v["morePages"], ["YES", "NO", "UNKNOWN"], "morePages"),
  };
  requireRule(
    c.returnedCount <= c.resultCap &&
      (c.completeness !== "COMPLETE_REQUEST_SCOPE" || (!c.truncated && c.morePages === "NO")),
    "coverage",
    "bounded complete scope",
  );
  return Object.freeze(c);
}
export type PlacesRequest = Readonly<{
  origin: Coordinates;
  taxonomyKey: string;
  radiusM: PositiveMetres;
  limit: PositiveInt;
  language: string | null;
}>;
export type PlaceCandidate = Readonly<{
  providerPlaceRef: string;
  name: string | null;
  coordinates: Coordinates;
  sourceCategories: readonly string[];
}> &
  (
    | Readonly<{ mapping: "MAPPED"; taxonomyKey: string }>
    | Readonly<{ mapping: "UNMAPPED"; taxonomyKey: null }>
  );
export type PlacesResult = ProviderOutcome<
  Readonly<{ places: NonEmpty<PlaceCandidate>; coverage: SearchCoverage }>,
  Readonly<{ coverage: SearchCoverage }>
>;
export interface PlacesProvider {
  search(request: PlacesRequest, signal: AbortSignal): Promise<PlacesResult>;
}
export type RoutingRequest = Readonly<{
  origin: Coordinates;
  destinations: NonEmpty<Readonly<{ requestItemId: string; coordinates: Coordinates }>>;
  mode: "WALKING" | "DRIVING";
}>;
export type RouteItem =
  | Readonly<{
      kind: "ROUTE";
      requestItemId: string;
      method: "WALKING_ROUTE" | "DRIVING_ROUTE";
      distanceM: Metres;
      durationS: Seconds;
      snappedOrigin: Coordinates | null;
      snappedDestination: Coordinates | null;
    }>
  | Readonly<{ kind: "NO_ROUTE"; requestItemId: string }>
  | Readonly<{ kind: "FAILURE"; requestItemId: string; error: ProviderError }>;
export type RoutingResult = ProviderOutcome<
  NonEmpty<RouteItem>,
  Readonly<{ reason: "NO_ROUTES_FOR_REQUESTED_PAIRS" }>
>;
export interface RoutingProvider {
  route(request: RoutingRequest, signal: AbortSignal): Promise<RoutingResult>;
}
/** Cross-item rules for a future adapter; per-item parsing remains that adapter's job. */
export function validateRouteCoverage(request: RoutingRequest, items: NonEmpty<RouteItem>): void {
  const ids = request.destinations.map((d) => d.requestItemId);
  requireRule(
    new Set(ids).size === ids.length &&
      items.length === ids.length &&
      new Set(items.map((i) => i.requestItemId)).size === ids.length &&
      items.every((i) => ids.includes(i.requestItemId)),
    "routes",
    "each requested pair exactly once",
  );
  requireRule(
    items.every(
      (i) =>
        i.kind !== "ROUTE" ||
        i.method === (request.mode === "WALKING" ? "WALKING_ROUTE" : "DRIVING_ROUTE"),
    ),
    "method",
    "requested mode",
  );
}
export type EvidenceMapView = Readonly<{
  origin: PinnedOrigin;
  snapshotId: UUID | null;
  points: readonly Readonly<{ displayId: string; coordinates: Coordinates }>[];
  attributionText: readonly string[];
  historical: boolean;
}>;
export interface MapProvider {
  render(view: EvidenceMapView): void;
  dispose(): void;
}
export type PinIntent = Readonly<{ kind: "EXPLICIT_PIN_CONFIRMATION"; coordinates: Coordinates }>;
