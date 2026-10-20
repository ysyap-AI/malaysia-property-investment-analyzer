import { expect, it } from "vitest";
import {
  evaluateCurrentOrigin,
  evaluateHistoricalOrigin,
} from "../../src/lib/location/read-eligibility";
import type {
  AuthorizedLocationSnapshot,
  LocationVersion,
} from "../../src/lib/location/read-eligibility";
import { propertyInputHash } from "../../src/lib/location/canonical";
import { propertyInputFields } from "../../src/lib/location/contracts";
import { instant, positiveInt, sha256, uuid } from "../../src/lib/location/primitives";
import {
  actorId,
  cleared,
  confirmed,
  digest,
  geocoded,
  none,
  pin,
  property,
  propertyId,
  state,
  time,
  unsafePayload,
  version,
  versionId,
} from "./fixtures";

function snapshot(v: LocationVersion | null = version()): AuthorizedLocationSnapshot {
  return {
    propertyId,
    currentPropertyInput: { serializer: "mpia-property-location-input-v1", digest },
    state,
    pointedVersion: v,
  };
}
it("ABSENT and inert NULL pointer remain no-intent without fallback", () => {
  expect(evaluateCurrentOrigin({ ...snapshot(null), state: null }).currentOrigin).toEqual({
    kind: "UNAVAILABLE",
    reason: "NO_LOCATION_INTENT",
  });
  expect(evaluateCurrentOrigin({ ...snapshot(null), state: null }).stateObservation).toEqual({
    kind: "ABSENT",
  });
  expect(
    evaluateCurrentOrigin({
      ...snapshot(null),
      state: { ...state, revision: 0 as typeof state.revision, currentLocationVersionId: null },
    }).stateObservation,
  ).toEqual({ kind: "EXACT", revision: 0, currentLocationVersionId: null });
  expect(
    evaluateCurrentOrigin({
      ...snapshot(null),
      state: { ...state, currentLocationVersionId: null },
    }).currentOrigin,
  ).toEqual({ kind: "UNAVAILABLE", reason: "NO_LOCATION_INTENT" });
  for (const s of [null, { ...state, currentLocationVersionId: null }])
    expect(evaluateCurrentOrigin({ ...snapshot(), state: s }).currentOrigin).toEqual({
      kind: "UNAVAILABLE",
      reason: "INVALID_LINEAGE",
    });
});
it.each([none, pin, cleared])(
  "nonconfirmed latest intent wins, mismatch still visible %#",
  (payload) => {
    const decision = evaluateCurrentOrigin({
      ...snapshot(version(payload)),
      currentPropertyInput: {
        serializer: "mpia-property-location-input-v1",
        digest: sha256("b".repeat(64)),
      },
    });
    expect(decision.latestIntent).toEqual({ id: versionId, status: payload.confirmation_status });
    expect(decision.inputRelation).toBe("MISMATCH");
    expect(decision.currentOrigin).toEqual({
      kind: "UNAVAILABLE",
      reason: payload.confirmation_status,
    });
  },
);
it("matching confirmed pin at (0,0) is usable and keeps exact version", () => {
  const decision = evaluateCurrentOrigin(
    snapshot(version({ ...confirmed, longitude: 0, latitude: 0 })),
  );
  expect(decision.currentOrigin).toEqual({
    kind: "USABLE",
    origin: {
      propertyId,
      locationVersionId: versionId,
      versionNumber: 1,
      coordinates: { crs: "EPSG:4326", longitude: 0, latitude: 0 },
    },
  });
  expect(decision.inputRelation).toBe("MATCH");
});
it.each(propertyInputFields)("saved %s edit invalidates current origin", async (field) => {
  const previousHash = await propertyInputHash(property);
  const currentHash = await propertyInputHash({
    ...property,
    [field]: `${property[field] ?? ""}changed`,
  });
  const decision = evaluateCurrentOrigin({
    ...snapshot({ ...version(), propertyInputHash: previousHash }),
    currentPropertyInput: { serializer: "mpia-property-location-input-v1", digest: currentHash },
  });
  expect(decision.inputRelation).toBe("MISMATCH");
  expect(decision.currentOrigin).toEqual({ kind: "UNAVAILABLE", reason: "STALE_PROPERTY_INPUT" });
});
it("financial-only edits leave eligibility identical; edit-away-and-back is content equality", async () => {
  const hash = await propertyInputHash(property);
  const before = {
    ...snapshot({ ...version(), propertyInputHash: hash }),
    currentPropertyInput: { serializer: "mpia-property-location-input-v1" as const, digest: hash },
  };
  const after = {
    ...before,
    currentPropertyInput: {
      ...before.currentPropertyInput,
      digest: await propertyInputHash({
        ...property,
        purchase_price: 900000,
        monthly_rent: 2500,
        updated_at: "2099",
      }),
    },
  };
  expect(evaluateCurrentOrigin(after)).toEqual(evaluateCurrentOrigin(before));
  const edited = { ...property, city: "other" };
  edited.city = property.city;
  expect(await propertyInputHash(edited)).toBe(hash);
});
it.each([
  { ...snapshot(), pointedVersion: null },
  { ...snapshot(), state: { ...state, propertyId: actorId } },
  { ...snapshot(), state: { ...state, currentLocationVersionId: actorId } },
  snapshot({ ...version(), propertyId: actorId }),
  snapshot({ ...version(), id: actorId }),
  snapshot({ ...version(), versionNumber: 0 as LocationVersion["versionNumber"] }),
])("broken lineage fails closed %#", (input) =>
  expect(evaluateCurrentOrigin(input).currentOrigin).toEqual({
    kind: "UNAVAILABLE",
    reason: "INVALID_LINEAGE",
  }),
);
it.each([
  { longitude: null },
  { longitude: NaN },
  { latitude: Infinity },
  { source_crs: "EPSG:3857" },
  { latitude: 91 },
])("coordinate integrity precedes stale input %#", (patch) => {
  const s = snapshot({
    ...version(),
    propertyInputHash: sha256("b".repeat(64)),
    payload: unsafePayload({ ...confirmed, ...patch }),
  });
  expect(evaluateCurrentOrigin(s).currentOrigin).toEqual({
    kind: "UNAVAILABLE",
    reason: "INVALID_COORDINATES",
  });
});
it.each([
  { ...confirmed, coordinate_source: "NONE" },
  { ...confirmed, confirmed_by: versionId },
  { ...confirmed, confirmation_status: "AUTOMATIC" },
  { ...confirmed, coordinate_precision: "ROOFTOP" },
  {
    ...geocoded,
    confirmation_status: "CONFIRMED",
    confirmed_by: actorId,
    provider_version_id: null,
  },
])("invalid metadata/status is unavailable %#", (payload) =>
  expect(
    evaluateCurrentOrigin(snapshot({ ...version(), payload: unsafePayload(payload) }))
      .currentOrigin,
  ).toEqual({ kind: "UNAVAILABLE", reason: "INVALID_LOCATION_STATE" }),
);
it("database audit-time combinations checked without clock, microseconds retained", () => {
  for (const v of [
    { ...version(), confirmedAt: null },
    { ...version(), confirmedAt: instant("2026-10-20T01:02:04Z") },
    { ...version(pin), confirmedAt: time },
    version({ ...geocoded, retrieved_at: "2026-10-20T01:02:03.000001Z" }),
  ])
    expect(evaluateCurrentOrigin(snapshot(v)).currentOrigin.kind).toBe("UNAVAILABLE");
  const v = { ...version(), createdAt: instant("2026-10-20T01:02:03Z"), confirmedAt: time };
  expect(evaluateCurrentOrigin(snapshot(v)).currentOrigin.kind).toBe("USABLE");
});
it("historical exact pin is labeled, independent of current stale input or newer intent", () => {
  const old = version();
  const newer = {
    ...version(cleared),
    id: uuid("f4000000-0000-0000-0000-000000000002"),
    versionNumber: positiveInt(2),
  };
  expect(
    evaluateCurrentOrigin({
      ...snapshot(newer),
      state: { ...state, currentLocationVersionId: newer.id },
    }).currentOrigin,
  ).toEqual({ kind: "UNAVAILABLE", reason: "CLEARED" });
  const historical = evaluateHistoricalOrigin({
    propertyId,
    locationVersionId: old.id,
    version: old,
  });
  expect(historical.mode).toBe("HISTORICAL");
  expect(historical.propertyInputHash).toBe(digest);
  expect(
    historical.historicalOrigin.kind === "USABLE" &&
      historical.historicalOrigin.origin.locationVersionId,
  ).toBe(old.id);
  expect(
    evaluateHistoricalOrigin({ propertyId, locationVersionId: old.id, version: newer })
      .historicalOrigin,
  ).toEqual({ kind: "UNAVAILABLE", reason: "INVALID_LINEAGE" });
});
it.each([
  null,
  version(none),
  version(pin),
  version(cleared),
  { ...version(), propertyId: actorId },
  { ...version(), payload: unsafePayload({ ...confirmed, longitude: null }) },
])("historical missing/unusable pins never substitute %#", (v) =>
  expect(
    evaluateHistoricalOrigin({ propertyId, locationVersionId: versionId, version: v })
      .historicalOrigin.kind,
  ).toBe("UNAVAILABLE"),
);
it("deterministic side-effect-free decision preserves snapshot and independent dimensions", () => {
  const v = version(),
    input = Object.freeze({
      ...snapshot(v),
      processingStatus: "NOT_STARTED",
      freshnessStatus: "UNKNOWN",
      publicationStatus: "NOT_ASSESSED",
    });
  const before = JSON.stringify(input),
    result = evaluateCurrentOrigin(input);
  expect(evaluateCurrentOrigin(input)).toEqual(result);
  expect(JSON.stringify(input)).toBe(before);
  expect(Object.isFrozen(result)).toBe(true);
  expect(result).not.toHaveProperty("publicationStatus");
  expect(result.currentOrigin.kind).toBe("USABLE");
});
