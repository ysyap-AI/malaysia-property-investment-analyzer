import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expectedLocationState,
  locationCommand,
  locationPayload,
  semanticFields,
} from "../../src/lib/location/contracts";
import {
  geocodeRequest,
  geocodeResult,
  permitsHistoricalFields,
  providerProvenance,
  providerRights,
  searchCoverage,
  validateRouteCoverage,
} from "../../src/lib/location/providers";
import type {
  GeocodingProvider,
  GeocodeResult,
  RoutingRequest,
} from "../../src/lib/location/providers";
import {
  coordinates,
  metres,
  positiveInt,
  positiveMetres,
  seconds,
} from "../../src/lib/location/primitives";
import {
  actorId,
  cleared,
  command,
  confirmed,
  geocoded,
  none,
  pin,
  providerId,
  time,
  versionId,
} from "./fixtures";

export const rights = Object.freeze({
  providerVersionId: providerId,
  termsReference: "terms-v1",
  reviewReference: "review-v1",
  reviewedAt: time,
  retentionClass: "PERMANENT",
  retentionLimitSeconds: null,
  attribution: { required: true, text: "Synthetic provider" },
  fieldPolicyVersion: "fields-v1",
  persistableFields: ["longitude", "latitude"],
  eligibleForHistoricalReplay: true,
});
export const provenance = Object.freeze({
  providerVersionId: providerId,
  adapterVersion: "fake-v1",
  retrievedAt: time,
  observedAt: null,
  sourceReference: "opaque-1",
  rights,
});
const candidate = {
  candidateRef: "candidate-1",
  coordinates: coordinates({ crs: "EPSG:4326", longitude: 0, latitude: 0 }),
  formattedAddress: null,
  normalizationVersion: null,
  sourceQuality: {
    precision: "UNKNOWN",
    accuracyM: null,
    matchConfidence: { level: "UNKNOWN", mappingVersion: null },
  },
};
const request = geocodeRequest(
  { query: " Explicit query ", countryBias: null, language: null, candidateLimit: 2 },
  positiveInt(2),
);
afterEach(() => vi.unstubAllGlobals());
describe("explicit expected state and SQL metadata", () => {
  it("ABSENT differs from exact inert revision zero", () => {
    expect(expectedLocationState({ kind: "ABSENT" })).toEqual({ kind: "ABSENT" });
    expect(
      expectedLocationState({ kind: "EXACT", revision: 0, currentLocationVersionId: null }),
    ).toEqual({ kind: "EXACT", revision: 0, currentLocationVersionId: null });
    for (const value of [
      {},
      { kind: "ABSENT", revision: 0 },
      { kind: "EXACT", revision: 0 },
      { kind: "EXACT", revision: "1", currentLocationVersionId: null },
      { kind: "EXACT", revision: Number.MAX_SAFE_INTEGER + 1, currentLocationVersionId: null },
      { kind: "MISSING" },
    ])
      expect(() => expectedLocationState(value)).toThrow();
  });
  it.each([
    none,
    pin,
    geocoded,
    confirmed,
    cleared,
    { ...none, confirmation_status: "REVIEW_REQUIRED" },
  ])("valid confirmation/source combination %#", (value) =>
    expect(locationPayload(value, actorId).confirmation_status).toBe(value.confirmation_status),
  );
  const invalid = [
    { ...none, longitude: 0, latitude: 0, source_crs: "EPSG:4326" },
    { ...none, coordinate_precision: "STREET" },
    { ...none, accuracy_m: 1 },
    { ...none, input_address: null },
    { ...pin, coordinate_precision: "ROOFTOP" },
    { ...pin, geocode_confidence: "HIGH", confidence_mapping_version: "m1" },
    { ...geocoded, provider_version_id: null },
    { ...geocoded, retrieved_at: null },
    { ...geocoded, coordinate_precision: "USER_PIN" },
    { ...geocoded, geocode_confidence: "HIGH" },
    { ...geocoded, confidence_mapping_version: "m1" },
    { ...pin, provider_candidate_id: "orphan" },
    { ...pin, normalized_address: "N" },
    { ...pin, normalization_version: "v1" },
    { ...pin, normalized_address: "N", normalization_version: "v1" },
    { ...confirmed, confirmed_by: versionId },
    { ...confirmed, confirmed_by: null },
    { ...pin, confirmed_by: actorId },
    { ...cleared, input_address: "kept" },
    { ...cleared, change_reason: "INITIAL_INPUT" },
    { ...none, change_reason: "LOCATION_CLEARED" },
    { ...pin, change_reason: "PIN_CONFIRMED" },
    { ...pin, change_reason: "GEOCODE_SELECTED" },
    { ...pin, confirmation_status: "AUTOMATIC" },
    { ...pin, input_address: "" },
    { ...pin, accuracy_m: 0 },
    { ...pin, longitude: "101.6" },
    { ...pin, latitude: undefined },
  ];
  it.each(invalid)("reject inconsistent SQL combination %#", (value) =>
    expect(() => locationPayload(value, actorId)).toThrow(),
  );
  it.each(semanticFields)("missing %s rejected", (field) => {
    const value: Record<string, unknown> = { ...pin };
    delete value[field];
    expect(() => locationPayload(value, actorId)).toThrow();
  });
  it("SQL character limits, stricter blank/Unicode boundary and generated-key denial", () => {
    expect(
      locationPayload({ ...none, input_address: "🏠".repeat(4000) }, actorId).input_address,
    ).toHaveLength(8000);
    for (const patch of [
      { input_address: "a".repeat(4001) },
      { input_address: "\t" },
      { input_address: "\ud800" },
      { position: "generated" },
      { created_by: actorId },
      { unknown: 1 },
    ])
      expect(() => locationPayload({ ...none, ...patch }, actorId)).toThrow();
    for (const patch of [
      { provider_candidate_id: "x".repeat(1001) },
      { confidence_mapping_version: "x".repeat(161), geocode_confidence: "HIGH" },
      { normalized_address: "N", normalization_version: "x".repeat(161), input_address: "A" },
    ])
      expect(() => locationPayload({ ...geocoded, ...patch }, actorId)).toThrow();
  });
  it("trusted-command shape does not accept database Insert or arbitrary authority", () => {
    for (const patch of [
      { created_by: actorId },
      { actorId },
      { operationHash: "a".repeat(64) },
      { expected: undefined },
      { serializer: "v2" },
      { operationKind: "UPDATE_LOCATION" },
      { propertyInput: { serializer: "v2", digest: "a".repeat(64) } },
    ])
      expect(() => locationCommand({ ...command(), ...patch }, actorId)).toThrow();
  });
});
describe("provider-neutral geocoding fake", () => {
  it.each([
    { kind: "SUCCESS", data: [candidate], provenance },
    { kind: "NO_RESULTS", details: { reason: "NO_MATCH", queryScope: "REQUEST_ONLY" }, provenance },
    ...(
      [
        "TIMEOUT",
        "CANCELLED",
        "RATE_LIMITED",
        "QUOTA_EXCEEDED",
        "AUTH_FAILED",
        "PROVIDER_UNAVAILABLE",
        "INVALID_RESPONSE",
        "INVALID_REQUEST",
        "OUT_OF_COVERAGE",
        "UNSUPPORTED_CAPABILITY",
      ] as const
    ).map((code) => ({
      kind: "FAILURE",
      error: {
        code,
        retry: ["TIMEOUT", "RATE_LIMITED", "PROVIDER_UNAVAILABLE"].includes(code)
          ? "BOUNDED_BACKOFF"
          : code === "QUOTA_EXCEEDED"
            ? "AFTER_QUOTA_RESET"
            : code === "AUTH_FAILED"
              ? "CONFIGURATION_REQUIRED"
              : "NEVER",
        retryAfterSeconds: code === "RATE_LIMITED" ? 30 : null,
        diagnosticId: actorId,
      },
    })),
  ])("fake explicit outcome %# without network or persistence", async (outcome) => {
    const network = vi.fn(() => {
      throw Error("Network forbidden");
    });
    vi.stubGlobal("fetch", network);
    const fake: GeocodingProvider = {
      providerVersionId: providerId,
      async geocode(input, options) {
        expect(options.signal.aborted).toBe(false);
        return geocodeResult(outcome, input, providerId);
      },
    };
    const result = await fake.geocode(request, {
      signal: new AbortController().signal,
      timeoutMs: positiveInt(100),
    });
    expect(result.kind).toBe(outcome.kind);
    expect(network).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("write");
  });
  it.each([
    { kind: "SUCCESS", data: [], provenance },
    { kind: "SUCCESS", data: [candidate, candidate], provenance },
    { kind: "SUCCESS", data: [{ ...candidate, coordinates: null }], provenance },
    {
      kind: "SUCCESS",
      data: [{ ...candidate, coordinates: { crs: "EPSG:4326", longitude: 1 } }],
      provenance,
    },
    {
      kind: "SUCCESS",
      data: [{ ...candidate, sourceQuality: { ...candidate.sourceQuality, accuracyM: 0 } }],
      provenance,
    },
    {
      kind: "SUCCESS",
      data: [
        { ...candidate, sourceQuality: { ...candidate.sourceQuality, precision: "USER_PIN" } },
      ],
      provenance,
    },
    {
      kind: "SUCCESS",
      data: [
        {
          ...candidate,
          sourceQuality: {
            ...candidate.sourceQuality,
            matchConfidence: { level: "HIGH", mappingVersion: null },
          },
        },
      ],
      provenance,
    },
    { kind: "SUCCESS", data: [{ ...candidate, formattedAddress: "unversioned" }], provenance },
    { kind: "NO_RESULTS", details: { reason: "TIMEOUT", queryScope: "REQUEST_ONLY" }, provenance },
    {
      kind: "FAILURE",
      error: {
        code: "AUTH_FAILED",
        retry: "NEVER",
        retryAfterSeconds: null,
        diagnosticId: actorId,
        rawBody: "private",
      },
    },
  ])("malformed output is rejected, never converted to no-results %#", (value) =>
    expect(() => geocodeResult(value, request, providerId)).toThrow(),
  );
  it("request caps, nonblank query and no inferred country", () => {
    expect(request.query).toBe(" Explicit query ");
    expect(request.countryBias).toBeNull();
    for (const patch of [
      { query: "" },
      { candidateLimit: 3 },
      { candidateLimit: "1" },
      { language: undefined },
      { country: "Malaysia" },
    ])
      expect(() => geocodeRequest({ ...request, ...patch }, positiveInt(2))).toThrow();
  });
  it("known quality requires versioned mapping and source-supported accuracy", () => {
    const result = geocodeResult(
      {
        kind: "SUCCESS",
        data: [
          {
            ...candidate,
            sourceQuality: {
              precision: "BUILDING",
              accuracyM: 12.5,
              matchConfidence: { level: "HIGH", mappingVersion: "synthetic-v1" },
            },
          },
        ],
        provenance,
      },
      request,
      providerId,
    );
    expect(result.kind === "SUCCESS" && result.data[0].sourceQuality.accuracyM).toBe(12.5);
    expect(() =>
      geocodeResult(
        {
          kind: "SUCCESS",
          data: [
            candidate,
            { ...candidate, candidateRef: "2" },
            { ...candidate, candidateRef: "3" },
          ],
          provenance,
        },
        request,
        providerId,
      ),
    ).toThrow();
  });
});
describe("rights and future stub boundaries", () => {
  it("permanent registry label alone is insufficient; exact field allowlist required", () => {
    const r = providerRights(rights);
    expect(permitsHistoricalFields(r, providerId, ["longitude", "latitude"])).toBe(true);
    expect(permitsHistoricalFields(r, providerId, ["rawBody"])).toBe(false);
    for (const patch of [
      { retentionClass: "TEMPORARY_30_DAY" },
      { retentionClass: "ID_ONLY_PERMANENT" },
      { retentionClass: "NO_PERSISTENCE" },
      { reviewedAt: null },
      { fieldPolicyVersion: null },
      { reviewReference: null },
      { eligibleForHistoricalReplay: false },
      { retentionLimitSeconds: positiveInt(30) },
    ])
      expect(
        permitsHistoricalFields(providerRights({ ...rights, ...patch }), providerId, ["longitude"]),
      ).toBe(false);
    expect(permitsHistoricalFields(r, versionId, ["longitude"])).toBe(false);
    expect(() => providerProvenance({ ...provenance, providerVersionId: versionId })).toThrow();
    expect(() =>
      providerProvenance({ ...provenance, sourceReference: "https://vendor/private?token=secret" }),
    ).toThrow();
    expect(() =>
      providerRights({ ...rights, attribution: { required: true, text: null } }),
    ).toThrow();
  });
  it("bounded coverage never implies absence outside scope", () => {
    const c = {
      radiusM: positiveMetres(3000),
      returnedCount: 0,
      resultCap: 20,
      completeness: "COMPLETE_REQUEST_SCOPE",
      truncated: false,
      morePages: "NO",
    };
    expect(searchCoverage(c).radiusM).toBe(3000);
    for (const patch of [
      { truncated: true },
      { morePages: "YES" },
      { returnedCount: 21 },
      { radiusM: 0 },
    ])
      expect(() => searchCoverage({ ...c, ...patch })).toThrow();
    expect(
      searchCoverage({ ...c, completeness: "PARTIAL", truncated: true, morePages: "UNKNOWN" })
        .completeness,
    ).toBe("PARTIAL");
  });
  it("partial routing errors explicit; every pair once and matching mode, seconds retained", () => {
    const request: RoutingRequest = {
      origin: candidate.coordinates,
      destinations: [
        { requestItemId: "1", coordinates: candidate.coordinates },
        { requestItemId: "2", coordinates: candidate.coordinates },
      ],
      mode: "WALKING",
    };
    const route = {
      kind: "ROUTE",
      requestItemId: "1",
      method: "WALKING_ROUTE",
      distanceM: metres(0),
      durationS: seconds(0),
      snappedOrigin: null,
      snappedDestination: null,
    } as const;
    const failure = {
      kind: "FAILURE",
      requestItemId: "2",
      error: {
        code: "TIMEOUT",
        retry: "BOUNDED_BACKOFF",
        retryAfterSeconds: null,
        diagnosticId: actorId,
      },
    } as const;
    expect(() => validateRouteCoverage(request, [route, failure])).not.toThrow();
    expect(() => validateRouteCoverage(request, [route, route])).toThrow();
    expect(() => validateRouteCoverage(request, [route])).toThrow();
    expect(() =>
      validateRouteCoverage(request, [{ ...route, method: "DRIVING_ROUTE" }, failure]),
    ).toThrow();
    expect(() =>
      validateRouteCoverage(request, [route, { kind: "NO_ROUTE", requestItemId: "unrequested" }]),
    ).toThrow();
  });
});
