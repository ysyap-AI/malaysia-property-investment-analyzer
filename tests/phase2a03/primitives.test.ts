import { describe, expect, it } from "vitest";
import {
  coordinates,
  decodeSqlBigint,
  instant,
  LocationValidationError,
  metres,
  nullableText,
  operationId,
  positiveInt,
  positiveMetres,
  record,
  safeInt,
  seconds,
  sha256,
  text,
  uuid,
} from "../../src/lib/location/primitives";
import {
  locationErrorCodes,
  locationFailure,
  providerError,
  providerErrorCodes,
} from "../../src/lib/location/errors";
import { actorId } from "./fixtures";

describe("strict primitives", () => {
  it.each(["00000000-0000-0000-0000-000000000000", actorId])("canonical UUID %s", (value) =>
    expect(uuid(value)).toBe(value),
  );
  it.each([
    null,
    undefined,
    1,
    "",
    actorId.toUpperCase(),
    ` ${actorId}`,
    actorId.replaceAll("-", ""),
    "x".repeat(36),
  ])("reject UUID %#", (value) => expect(() => uuid(value)).toThrow(LocationValidationError));
  it("nonzero operation IDs and lowercase digests", () => {
    expect(sha256("0".repeat(64))).toHaveLength(64);
    for (const value of [
      undefined,
      null,
      "A".repeat(64),
      "a".repeat(63),
      "a".repeat(65),
      "g".repeat(64),
    ])
      expect(() => sha256(value)).toThrow();
    expect(() => operationId("00000000-0000-0000-0000-000000000000")).toThrow();
  });
  it.each([
    [180, 90],
    [-180, -90],
    [0, 0],
    [-0, -0],
    [101.6869123456789, 3.13900000000001],
  ])("WGS84 pair %j", (longitude, latitude) => {
    const p = coordinates({ crs: "EPSG:4326", longitude, latitude });
    expect(Object.is(p.longitude, longitude)).toBe(true);
    expect(Object.is(p.latitude, latitude)).toBe(true);
  });
  it.each([
    { longitude: "1", latitude: 2 },
    { longitude: null, latitude: 2 },
    { longitude: 1 },
    { longitude: NaN, latitude: 2 },
    { longitude: Infinity, latitude: 2 },
    { longitude: 0, latitude: -Infinity },
    { longitude: 180.000001, latitude: 0 },
    { longitude: 0, latitude: 90.000001 },
    { longitude: 1, latitude: 2, crs: "EPSG:3857" },
    { longitude: 1, latitude: 2, position: "POINT(1 2)" },
  ])("reject pair %#", (value) =>
    expect(() => coordinates({ crs: "EPSG:4326", ...value })).toThrow(),
  );
  it.each([0, -0, Number.MIN_VALUE, 1.5, Number.MAX_VALUE])(
    "finite nonnegative measurements %s",
    (n) => {
      expect(metres(n)).toBe(n);
      expect(seconds(n)).toBe(n);
    },
  );
  it.each([-1, NaN, Infinity, -Infinity, "0", null, undefined, 1n])("reject measurement %#", (n) =>
    expect(() => metres(n)).toThrow(),
  );
  it("positive and revision/version bounds", () => {
    expect(safeInt(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    expect(safeInt(0)).toBe(0);
    expect(positiveInt(1)).toBe(1);
    expect(positiveMetres(0.1)).toBe(0.1);
    for (const n of [0, -0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, "1", null])
      expect(() => positiveInt(n)).toThrow();
    for (const n of [0, -0, NaN, Infinity, -1]) expect(() => positiveMetres(n)).toThrow();
  });
  it.each([0, "0", 0n, 9007199254740991, "9007199254740991", 9007199254740991n])(
    "exact SQL bigint decode %#",
    (value) => expect(decodeSqlBigint(value)).toBe(Number(value)),
  );
  it.each([
    "01",
    "+1",
    " 1",
    "1.0",
    "1e2",
    "-1",
    "-0",
    "",
    "9007199254740992",
    9007199254740992n,
    9007199254740992,
    1.5,
    null,
    undefined,
  ])("reject bigint %#", (value) => expect(() => decodeSqlBigint(value)).toThrow());
  it("explicit null/empty/nonblank and Unicode characters", () => {
    expect(nullableText(null, "x")).toBeNull();
    expect(text("", "x")).toBe("");
    expect(text("  A  ", "x", 5, true)).toBe("  A  ");
    expect(text("🏠".repeat(160), "x", 160)).toHaveLength(320);
    expect(() => text("🏠".repeat(161), "x", 160)).toThrow();
    for (const value of [undefined, 0, {}, "\0", "\ud800", "\udfff", "x\ud800x"])
      expect(() => nullableText(value, "x")).toThrow();
    for (const value of ["", " ", "\t"]) expect(() => text(value, "x", 10, true)).toThrow();
  });
  it.each([
    "2024-02-29T00:00:00Z",
    "2026-10-20T01:02:03.1Z",
    "2026-10-20T01:02:03.000001Z",
    "0001-01-01T00:00:00Z",
  ])("UTC instant retains lexical bytes %s", (value) => expect(instant(value)).toBe(value));
  it.each([
    undefined,
    null,
    0,
    "infinity",
    "2025-02-29T00:00:00Z",
    "2024-02-30T00:00:00Z",
    "2026-01-01",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:60Z",
    "2026-01-01T00:00:00+00:00",
    "0000-01-01T00:00:00Z",
    "2026-13-01T00:00:00Z",
    "2026-01-00T00:00:00Z",
  ])("invalid instant %#", (value) => expect(() => instant(value)).toThrow());
  it("reject unknown/missing/accessor fields without echoing private input", () => {
    for (const value of [
      { x: 1, unknown: 2 },
      {},
      [],
      Object.create({ x: 1 }),
      {
        get x() {
          throw Error("must not run");
        },
      },
    ])
      expect(() => record(value, ["x"])).toThrow(LocationValidationError);
    try {
      uuid("private address");
    } catch (error) {
      expect(String(error)).not.toContain("private address");
    }
  });
});
describe("closed typed error classifications", () => {
  it.each(locationErrorCodes)("%s", (code) => {
    const error = locationFailure(code, actorId);
    expect(error.code).toBe(code);
    expect(error.diagnosticId).toBe(actorId);
    expect(error).not.toHaveProperty("cause");
  });
  it("ambiguous commits retain identity; stale intent requires explicit reconfirmation", () => {
    expect(locationFailure("COMMIT_OUTCOME_UNKNOWN", actorId).retry).toBe("RECONCILE_SAME_ID");
    expect(locationFailure("STALE_EXPECTED_STATE", actorId).retry).toBe(
      "RELOAD_AND_CONFIRM_NEW_ID",
    );
    expect(locationFailure("TRANSACTION_FAILED", actorId).retry).toBe("DO_NOT_RETRY");
    expect(locationFailure("TRANSACTION_FAILED", actorId, true).retry).toBe(
      "SAME_ID_AFTER_BACKOFF",
    );
    expect(locationFailure("AUTHENTICATION_FAILED", actorId).retry).toBe(
      "REAUTHENTICATE_THEN_SAME_ID",
    );
  });
  it.each(providerErrorCodes)("provider %s", (code) => {
    const retry = ["TIMEOUT", "RATE_LIMITED", "PROVIDER_UNAVAILABLE"].includes(code)
      ? "BOUNDED_BACKOFF"
      : code === "QUOTA_EXCEEDED"
        ? "AFTER_QUOTA_RESET"
        : code === "AUTH_FAILED"
          ? "CONFIGURATION_REQUIRED"
          : "NEVER";
    expect(
      providerError({ code, retry, retryAfterSeconds: null, diagnosticId: actorId }).code,
    ).toBe(code);
    expect(() =>
      providerError({ code, retry: "NEW_ID", retryAfterSeconds: null, diagnosticId: actorId }),
    ).toThrow();
  });
});
