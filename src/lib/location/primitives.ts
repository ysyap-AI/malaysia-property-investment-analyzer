/** Brands prevent accidental mixing; they are not runtime security or authorization. */
export type Brand<T, K extends string> = T & { readonly __brand: K };
export type UUID = Brand<string, "CanonicalUuid">;
export type Sha256 = Brand<string, "LowercaseSha256">;
export type SafeInt = Brand<number, "NonnegativeSafeInteger">;
export type PositiveInt = Brand<number, "PositiveSafeInteger">;
export type Instant = Brand<string, "FiniteUtcInstant">;
export type Longitude = Brand<number, "Wgs84Longitude">;
export type Latitude = Brand<number, "Wgs84Latitude">;
export type Metres = Brand<number, "NonnegativeFiniteMetres">;
export type Seconds = Brand<number, "NonnegativeFiniteSeconds">;
export type PositiveMetres = Brand<number, "PositiveFiniteMetres">;
export type NonEmpty<T> = readonly [T, ...T[]];
export type Coordinates = Readonly<{ crs: "EPSG:4326"; longitude: Longitude; latitude: Latitude }>;

/** Carries rule/path only, never echoes rejected private values. */
export class LocationValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(
    readonly field: string,
    readonly rule: string,
  ) {
    super(`Invalid location field: ${field} (${rule})`);
    this.name = "LocationValidationError";
  }
}
export function requireRule(ok: boolean, field: string, rule: string): asserts ok {
  if (!ok) throw new LocationValidationError(field, rule);
}
export function record(
  value: unknown,
  keys: readonly string[],
  field = "value",
): Record<string, unknown> {
  requireRule(
    typeof value === "object" && value !== null && !Array.isArray(value),
    field,
    "object",
  );
  const object = value as Record<string, unknown>;
  requireRule(
    Object.getPrototypeOf(object) === Object.prototype || Object.getPrototypeOf(object) === null,
    field,
    "plain object",
  );
  requireRule(
    Reflect.ownKeys(object).length === keys.length &&
      keys.every((key) => Object.hasOwn(object, key)),
    field,
    "explicit exact fields",
  );
  requireRule(
    keys.every(
      (key) =>
        Object.getOwnPropertyDescriptor(object, key)?.get === undefined &&
        Object.getOwnPropertyDescriptor(object, key)?.set === undefined,
    ),
    field,
    "data fields",
  );
  return object;
}
export function oneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
): T[number] {
  requireRule(typeof value === "string" && values.includes(value), field, "closed vocabulary");
  return value as T[number];
}
export function uuid(value: unknown, field = "uuid"): UUID {
  requireRule(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value),
    field,
    "canonical lowercase UUID",
  );
  return value as UUID;
}
export function operationId(value: unknown): UUID {
  const id = uuid(value, "operationId");
  requireRule(id !== "00000000-0000-0000-0000-000000000000", "operationId", "nonzero UUID");
  return id;
}
export function sha256(value: unknown, field = "digest"): Sha256 {
  requireRule(
    typeof value === "string" && /^[0-9a-f]{64}$/.test(value),
    field,
    "lowercase SHA-256",
  );
  return value as Sha256;
}
export function finite(value: unknown, min: number, max: number, field: string): number {
  requireRule(
    typeof value === "number" && Number.isFinite(value) && value >= min && value <= max,
    field,
    "finite number in range",
  );
  return value;
}
export function safeInt(value: unknown, field = "revision"): SafeInt {
  const n = finite(value, 0, Number.MAX_SAFE_INTEGER, field);
  requireRule(Number.isSafeInteger(n), field, "safe integer");
  return n as SafeInt;
}
export function positiveInt(value: unknown, field = "version"): PositiveInt {
  const n = safeInt(value, field);
  requireRule(n > 0, field, "positive integer");
  return n as number as PositiveInt;
}
/** Driver decoding only; external commands still require number tokens. */
export function decodeSqlBigint(value: unknown): SafeInt {
  if (typeof value === "number") return safeInt(value);
  requireRule(
    typeof value === "bigint" || (typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)),
    "bigint",
    "exact unsigned integer",
  );
  const n = BigInt(value as string | bigint);
  requireRule(n >= 0n && n <= 9007199254740991n, "bigint", "safe integer range");
  return safeInt(Number(n));
}
export function metres(value: unknown): Metres {
  return finite(value, 0, Number.MAX_VALUE, "metres") as Metres;
}
export function seconds(value: unknown): Seconds {
  return finite(value, 0, Number.MAX_VALUE, "seconds") as Seconds;
}
export function positiveMetres(value: unknown): PositiveMetres {
  const n = metres(value);
  requireRule(n > 0, "metres", "positive");
  return n as number as PositiveMetres;
}
export function coordinates(value: unknown): Coordinates {
  const v = record(value, ["crs", "longitude", "latitude"], "coordinates");
  oneOf(v["crs"], ["EPSG:4326"], "crs");
  // Preserve binary64, including -0. v1 JSON.stringify encodes -0 as 0.
  return Object.freeze({
    crs: "EPSG:4326",
    longitude: finite(v["longitude"], -180, 180, "longitude") as Longitude,
    latitude: finite(v["latitude"], -90, 90, "latitude") as Latitude,
  });
}
export function text(value: unknown, field: string, max = 4000, nonblank = false): string {
  requireRule(typeof value === "string", field, "explicit string");
  requireRule(
    !/[\u0000\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value) &&
      !value.includes("\0"),
    field,
    "valid PostgreSQL Unicode text",
  );
  requireRule(
    [...value].length <= max && (!nonblank || /\S/u.test(value)),
    field,
    "character limit/nonblank",
  );
  return value;
}
export function nullableText(
  value: unknown,
  field: string,
  max = 4000,
  nonblank = false,
): string | null {
  return value === null ? null : text(value, field, max, nonblank);
}
/** UTC ISO lexical forms retained exactly; no Date.parse normalization of invalid days. */
export function instant(value: unknown, field = "instant"): Instant {
  requireRule(typeof value === "string", field, "UTC instant string");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z$/.exec(value);
  requireRule(match !== null, field, "UTC ISO instant");
  const y = Number(match[1]),
    m = Number(match[2]),
    d = Number(match[3]);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  requireRule(
    y >= 1 &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= (days[m - 1] ?? 0) &&
      Number(match[4]) < 24 &&
      Number(match[5]) < 60 &&
      Number(match[6]) < 60 &&
      Number.isFinite(Date.parse(value)),
    field,
    "finite calendar instant",
  );
  return value as Instant;
}
