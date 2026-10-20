# MPIA — Phase 2A-03 interface proposal

20 October 2026, Asia/Kuala_Lumpur. **PROPOSED — P01–P03 and P07–P09 require owner approval.** All TypeScript below is illustrative document content, not implemented or compiled source. The [architecture review](PHASE2A_03_ARCHITECTURE_REVIEW.md) establishes evidence and scope; the [decision register](PHASE2A_03_DECISION_REGISTER.md) records rationale, risks and test obligations.

## 1. Contract layers and validated values

Separate browser intent, untrusted provider output, validated server commands, database rows and authoritative results. Do not export `TablesInsert<"property_location_versions">` as a request type. Type branding prevents accidental mixing in TypeScript; only runtime validation, server authentication and SQL checks establish trust. JavaScript callers can forge casts.

```ts
type Brand<T, K extends string> = T & { readonly __brand: K };
type UUID = Brand<string, "CanonicalUuid">;
type Sha256 = Brand<string, "LowercaseSha256">;
type SafeInt = Brand<number, "NonnegativeSafeInteger">;
type PositiveInt = Brand<number, "PositiveSafeInteger">;
type Instant = Brand<string, "FiniteUtcInstant">;
type Longitude = Brand<number, "Wgs84Longitude">;
type Latitude = Brand<number, "Wgs84Latitude">;
type Metres = Brand<number, "NonnegativeFiniteMetres">;
type Seconds = Brand<number, "NonnegativeFiniteSeconds">;
type PositiveMetres = Brand<number, "PositiveFiniteMetres">;
type NonEmpty<T> = readonly [T, ...T[]];

type Coordinates = Readonly<{
  crs: "EPSG:4326";
  longitude: Longitude;
  latitude: Latitude;
}>;
type ExpectedLocationState =
  | Readonly<{ kind: "ABSENT" }>
  | Readonly<{
      kind: "EXACT";
      revision: SafeInt;
      currentLocationVersionId: UUID | null;
    }>;
type PropertyLocationInputs = Readonly<{
  project_name: string | null;
  full_address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}>;
type LocationInputFingerprint = Readonly<{
  serializer: "mpia-property-location-input-v1";
  digest: Sha256;
}>;
```

`ABSENT` means no state row, not revision zero. EXACT revision zero with a NULL pointer is an existing inert state. Missing expected fields are invalid, never converted to either state. An ABSENT command maps to `expected_revision="ABSENT"`, `expected_current_id=null` in legacy bytes; EXACT maps to its numeric revision and UUID/NULL. This conversion is deterministic and does not introduce new serialized fields.

Coordinate validators accept only finite JS numbers with longitude in [-180,180] and latitude in [-90,90], both present together; reject numeric strings, NaN, infinities, partial pairs, unsupported CRS, raw geography/EWKT and silent latitude/longitude swaps. No wrapping, clamping, snapping, six-decimal rounding or Malaysia-only box. `(0,0)` is valid mathematics, never a missing marker; geographic plausibility is a later review rule. Validate bounds before construction. Normalize numeric negative zero to positive zero in the validated representation; storage precision does not imply accuracy.

Safe integers are between 0 and 9007199254740991 inclusive; positive versions between 1 and that ceiling. SQL bigint decoding may yield string or bigint: parse exactly using BigInt internally, bounds-check, then convert to number. Never use `parseInt`, round, or convert an unsafe number after precision is already lost. External commands require number tokens, not bigint/string coercions. BigInt is never passed to JSON serialization; arbitrary bigint payloads are invalid. Preserve exact decimal revision values.

## 2. Provider-neutral provenance, rights and errors

```ts
type ProviderCapability = "GEOCODING" | "PLACES" | "ROUTING" | "MAP_RENDERING";
type RetentionClass =
  | "UNREVIEWED" | "PERMANENT" | "TEMPORARY_30_DAY"
  | "ID_ONLY_PERMANENT" | "NO_PERSISTENCE";
type ProviderRights = Readonly<{
  providerVersionId: UUID;       // exact location_provider_registry.id
  termsReference: string | null;
  reviewReference: string | null;
  reviewedAt: Instant | null;
  retentionClass: RetentionClass;
  retentionLimitSeconds: PositiveInt | null;
  attribution: Readonly<{ required: boolean; text: string | null }>;
  fieldPolicyVersion: string | null; // reviewed application policy; no new DB column
  persistableFields: readonly string[]; // allowlist, not provider self-assertion
  eligibleForHistoricalReplay: boolean; // policy output, not a license promise
}>;
type ProviderProvenance = Readonly<{
  providerVersionId: UUID;
  adapterVersion: string;
  retrievedAt: Instant;         // trusted server receipt, not a browser time
  observedAt: Instant | null;   // only if actually supplied with that meaning
  sourceReference: string | null; // safe opaque reference, no secret URL
  rights: ProviderRights;
}>;
type CoordinatePrecision =
  | "UNKNOWN" | "ROOFTOP" | "BUILDING" | "PARCEL"
  | "STREET" | "LOCALITY" | "REGION" | "USER_PIN";
type MatchConfidence =
  | Readonly<{ level: "UNKNOWN"; mappingVersion: null }>
  | Readonly<{ level: "LOW" | "MEDIUM" | "HIGH"; mappingVersion: string }>;
type SourceQuality = Readonly<{
  precision: Exclude<CoordinatePrecision, "USER_PIN">;
  accuracyM: PositiveMetres | null;
  matchConfidence: MatchConfidence;
}>;
type RetryAdvice =
  | "SAME_ID_AFTER_BACKOFF" | "REAUTHENTICATE_THEN_SAME_ID"
  | "RELOAD_AND_CONFIRM_NEW_ID" | "RECONCILE_SAME_ID" | "DO_NOT_RETRY";
type ProviderErrorCode =
  | "TIMEOUT" | "RATE_LIMITED" | "QUOTA_EXCEEDED" | "AUTH_FAILED"
  | "INVALID_REQUEST" | "PROVIDER_UNAVAILABLE" | "INVALID_RESPONSE"
  | "OUT_OF_COVERAGE" | "CANCELLED" | "UNSUPPORTED_CAPABILITY";
type ProviderError = Readonly<{
  code: ProviderErrorCode;
  retry: "BOUNDED_BACKOFF" | "AFTER_QUOTA_RESET" | "CONFIGURATION_REQUIRED" | "NEVER";
  retryAfterSeconds: PositiveInt | null;
  diagnosticId: UUID;           // no vendor error body or request URL
}>;
type ProviderOutcome<T, EmptyMetadata> =
  | Readonly<{ kind: "SUCCESS"; data: T; provenance: ProviderProvenance }>
  | Readonly<{ kind: "NO_RESULTS"; details: EmptyMetadata; provenance: ProviderProvenance }>
  | Readonly<{ kind: "FAILURE"; error: ProviderError }>;
```

Rights are resolved by trusted application policy plus the exact registry version, not copied from a response or accepted from a browser. A registry PERMANENT label alone is insufficient for any specific field. The current immutable history table admits reviewed permanent provider data only; temporary/ID-only/nonpersistent candidate material must not be inserted by stripping its provider ID. Provider configuration, API keys, full request headers, account identifiers and raw responses are not part of public contracts.

Adapter maps vendor scores to UNKNOWN/LOW/MEDIUM/HIGH only with an approved mapping version. No universal numeric confidence, rooftop inference from decimals, or automatic confirmation. Accuracy is source-supported positive metres or NULL; unknown never becomes zero. Match confidence, coordinate precision, uncertainty, user confirmation and later evidence confidence remain different concepts.

Normalize provider HTTP/network errors inside the adapter. A timeout, 401/403, 429, exhausted account, invalid JSON or missing coordinate is FAILURE, never NO_RESULTS. Rate limiting is not automatically quota exhaustion. A successful empty response is NO_RESULTS only for the requested operation and known coverage; an unsupported search is FAILURE. No raw exception message is returned to a caller.

## 3. Geocoding port (2A-03 contract; adapter in 2A-04)

```ts
type GeocodeRequest = Readonly<{
  query: string;                // explicit nonblank address query, bounded length
  countryBias: string | null;   // search hint, not evidence of actual country
  language: string | null;
  candidateLimit: PositiveInt;  // bounded by approved request policy
}>;
type GeocodeCandidate = Readonly<{
  candidateRef: string;         // safe opaque ID scoped to response/adapter
  coordinates: Coordinates;
  formattedAddress: string | null;
  normalizationVersion: string | null;
  sourceQuality: SourceQuality;
}>;
type GeocodeResult = ProviderOutcome<
  NonEmpty<GeocodeCandidate>,
  Readonly<{ reason: "NO_MATCH"; queryScope: "REQUEST_ONLY" }>
>;
interface GeocodingProvider {
  readonly providerVersionId: UUID;
  geocode(request: GeocodeRequest, options: Readonly<{
    signal: AbortSignal;
    timeoutMs: PositiveInt;
  }>): Promise<GeocodeResult>;
}
```

The server orchestration layer separately captures owner/property/input fingerprint/expected state/request ID and request expiry before calling the adapter. That private binding is not sent to a third-party API. No provider receives a writer port. Empty or malformed candidate coordinates cannot yield an address-only confirmed point; reject malformed output, while an ambiguous valid set remains for explicit review.

Later candidate confirmation accepts an opaque server receipt and a selection, rather than trusting browser-authored provenance. The future receipt must bind authenticated actor, property, exact input hash, expected state, request ID, exact normalized candidate fields, provider/adapter/policy versions, fixed receipt time and expiry. Recommend authenticated encryption or server-side opaque storage, not an address-bearing signed-only token. Storage/key/expiry decisions belong to 2A-04. Replayed confirmation cannot generate a new operation ID automatically; retries retain the frozen command. No candidate array, receipt secret or token is persisted in history.

## 4. Places and routing ports (compile-time stubs until 2B)

```ts
type SearchCoverage = Readonly<{
  radiusM: PositiveMetres;
  returnedCount: SafeInt;
  resultCap: PositiveInt;
  completeness: "COMPLETE_REQUEST_SCOPE" | "PARTIAL" | "UNKNOWN";
  truncated: boolean;
  morePages: "YES" | "NO" | "UNKNOWN";
}>;
type PlacesRequest = Readonly<{
  origin: Coordinates;
  taxonomyKey: string;          // validated against accepted taxonomy, no new fact keys
  radiusM: PositiveMetres;
  limit: PositiveInt;
  language: string | null;
}>;
type PlaceCandidate = Readonly<{
  providerPlaceRef: string;
  name: string | null;
  coordinates: Coordinates;
  sourceCategories: readonly string[];
  mapping: "MAPPED" | "UNMAPPED";
  taxonomyKey: string | null;
}>;
type PlacesResult = ProviderOutcome<
  Readonly<{ places: NonEmpty<PlaceCandidate>; coverage: SearchCoverage }>,
  Readonly<{ coverage: SearchCoverage }>
>;
interface PlacesProvider {
  search(request: PlacesRequest, signal: AbortSignal): Promise<PlacesResult>;
}
type RoutingRequest = Readonly<{
  origin: Coordinates;          // exact pinned origin, not today's pointer
  destinations: NonEmpty<Readonly<{ requestItemId: string; coordinates: Coordinates }>>;
  mode: "WALKING" | "DRIVING";
}>;
type RouteItem =
  | Readonly<{
      kind: "ROUTE"; requestItemId: string;
      method: "WALKING_ROUTE" | "DRIVING_ROUTE";
      distanceM: Metres; durationS: Seconds;
      snappedOrigin: Coordinates | null; snappedDestination: Coordinates | null;
    }>
  | Readonly<{ kind: "NO_ROUTE"; requestItemId: string }>
  | Readonly<{ kind: "FAILURE"; requestItemId: string; error: ProviderError }>;
type RoutingResult = ProviderOutcome<
  NonEmpty<RouteItem>,
  Readonly<{ reason: "NO_ROUTES_FOR_REQUESTED_PAIRS" }>
>;
interface RoutingProvider {
  route(request: RoutingRequest, signal: AbortSignal): Promise<RoutingResult>;
}
```

These signatures reserve boundaries, not a provider API, routing optimizer, POI persistence or fact engine. Validate that every requested routing item appears exactly once and the method matches the requested mode; partial per-item failure remains explicit. Response-level FAILURE is used when the whole request failed. Response-level NO_RESULTS means a successful request proved no route for every requested pair, never provider unavailability. Route distance/duration are finite and nonnegative, with zero allowed only when supported by the result, not as a failure default.

Future routing work carries the exact property/location-version lineage in orchestration; providers see only coordinates. Snapped endpoints are disclosed measurement metadata and do not replace the canonical Subject Location or Analysis Origin. A straight-line fallback is a distinct method and cannot be returned as a walking/driving route. Accepted fact duration unit is seconds (`_s`), not minutes; conversion is presentation or explicit later derivation. Search radius, truncation and incomplete pages never prove a nearest object beyond that radius or exact global absence. No provider NO_RESULTS is directly converted to a KNOWN_ZERO fact in 2A-03.

## 5. Map responsibilities (interface stub; concrete renderer later)

```ts
type PinnedOrigin = Readonly<{
  propertyId: UUID; locationVersionId: UUID; versionNumber: PositiveInt;
  coordinates: Coordinates;
}>;
type EvidenceMapView = Readonly<{
  origin: PinnedOrigin;
  snapshotId: UUID | null;       // future historical manifest, no table introduced
  points: readonly Readonly<{ displayId: string; coordinates: Coordinates }>[];
  attributionText: readonly string[];
  historical: boolean;
}>;
interface MapProvider {
  render(view: EvidenceMapView): void;
  dispose(): void;
}
type PinIntent = Readonly<{ kind: "EXPLICIT_PIN_CONFIRMATION"; coordinates: Coordinates }>;
```

Rendering/tiles have separate permissions and budgets. The map cannot call the authoritative writer or analytical Places/routing APIs. An explicit pin event is untrusted intent for later server validation; ordinary map interactions produce no location command. No map library, token or rendering component is selected in 2A-03. Stored snapshot POIs and Subject Property markers remain semantically distinct.

## 6. Trusted location commands and authoritative results

```ts
type CoordinateSource = "NONE" | "USER_PIN" | "GEOCODER";
type ConfirmationStatus = "UNCONFIRMED" | "REVIEW_REQUIRED" | "CONFIRMED" | "CLEARED";
type ChangeReason = "INITIAL_INPUT" | "ADDRESS_CHANGED" | "GEOCODE_SELECTED"
  | "PIN_CONFIRMED" | "LOCATION_CORRECTED" | "METADATA_CORRECTED" | "LOCATION_CLEARED";
type LocationFieldsV1 = Readonly<{
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
  geocode_confidence: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";
  confidence_mapping_version: string | null;
  confirmation_status: ConfirmationStatus;
  confirmed_by: UUID | null;
  change_reason: ChangeReason;
}>;
type ValidatedLocationPayload = Brand<LocationFieldsV1, "ValidatedLocationCombination">;
type ConfirmationState =
  | Readonly<{ kind: "UNCONFIRMED"; inputAddress: string; coordinates: null }>
  | Readonly<{ kind: "REVIEW_REQUIRED"; inputAddress: string | null; coordinates: Coordinates | null }>
  | Readonly<{ kind: "CONFIRMED"; coordinates: Coordinates; confirmedBy: UUID; confirmedAt: Instant }>
  | Readonly<{ kind: "CLEARED"; coordinates: null }>;
type VerifiedActor = Brand<Readonly<{
  userId: UUID; verifiedAt: Instant; issuer: string;
}>, "ServerVerifiedActor">;
type TrustedLocationCommand = Readonly<{
  serializer: "mpia-location-command-v1";
  propertyId: UUID;
  operationId: UUID;
  expected: ExpectedLocationState;
  propertyInput: LocationInputFingerprint;
  operationKind: "APPEND_LOCATION";
  payload: ValidatedLocationPayload;
}>;
type StateObservation = Readonly<{
  revision: SafeInt; currentLocationVersionId: UUID | null;
}>;
type LocationWriteSuccess = Readonly<{
  kind: "COMMITTED";
  disposition: "CREATED" | "DUPLICATE";
  operationId: UUID;
  version: Readonly<{
    id: UUID; propertyId: UUID; versionNumber: PositiveInt;
    propertyInputHash: Sha256; confirmation: ConfirmationState;
    createdAt: Instant;
  }>;
  observedState: StateObservation;
  versionIsObservedCurrent: boolean;
}>;
interface TrustedLocationWriter {
  execute(actor: VerifiedActor, command: TrustedLocationCommand): Promise<LocationWriteResult>;
}
```

`VerifiedActor` is a server-internal capability, constructed only by the trusted verifier in an isolated server module, never from a browser JSON object. `execute` is a port signature, not a browser-callable function. The actor is a separate argument; the hash builder inserts it as the existing `actor_id` field. The server derives `created_by` and, for explicit confirmation, `confirmed_by` from that actor; requests cannot supply them as authority. Reject caller-authored hashes, generated spatial values, version numbers, audit timestamps and unknown command fields at the transport boundary. The core recomputes the operation hash, not trusting a supplied digest.

All 17 semantic fields must be explicit in the normalized payload. Omitted UI fields may become NULL only through a named intent-to-command builder before identity is frozen; direct commands are not PATCHes. No defaulting during retry or serialization. All generated outputs (`id`, `version_number`, `position`, `created_at`, `confirmed_at`) remain excluded from the command. A repeated command retains its original server receipt `retrieved_at`; it is not restamped.

Smart constructors must enforce every existing migration combination: NONE/no point/unknown precision-confidence; USER_PIN/USER_PIN precision/unknown confidence; GEOCODER/eligible provider/pair; paired normalized address/version with input address; reviewed provider reference plus fixed finite receipt time; confidence mapping iff non-UNKNOWN; confirmed_by equals verified actor only for CONFIRMED; UNCONFIRMED requires address/no point; REVIEW_REQUIRED requires address or point; CLEARED erases all coordinate/address/provider fields in the new row and requires LOCATION_CLEARED. The schema's inherited constraints also force unknown/null source metadata for CLEARED. Initial reason applies only if history is empty, checked under lock. No history overwrite on confirmation/correction.

String bounds match SQL characters: addresses 4000, normalizer/mapping versions 160, candidate ID 1000. Count Unicode code points, not JS UTF-16 length alone. Reject NUL and ill-formed surrogate input before database I/O; PostgreSQL text cannot preserve them as intended Unicode. Validate nonblank required strings without trimming the bytes actually hashed/stored. Blank versus NULL is not silently collapsed. Broader address validation is a later explicit policy. A confirmation is acceptance of a point, not certification of source accuracy.

Results contain database-returned IDs/times/confirmation and the state seen in that transaction. For CREATED, the new pointer and incremented revision are returned; first write creates state revision 0 then publishes revision 1. For DUPLICATE, return the existing immutable version, with current observed state which may point to a later version. The schema does not store the original successful command's resulting state revision: do not reconstruct it from version_number or claim it is stored. A response is an observation at commit, not a promise that another command cannot supersede it immediately afterward.

## 7. Canonical serialization (P02)

### 7.1 Verified existing bytes and mandatory rules

Source of truth: `tests/phase2a02-command-contract.mjs` and its five contract tests; corroborated by the schema proposal. SQL stores digests and validates shape only. Use fixed arrays and ECMAScript `JSON.stringify` primitive encoding, without a replacer, indentation, BOM or trailing newline. No arbitrary objects, object-key sorting, JSONB textual output, SQL `row_to_json` bytes, locale conversion or delimiter concatenation.

Hash UTF-8 bytes with **SHA-256**, encode digest as exactly 64 lowercase hexadecimal ASCII characters. Version string is inside the hashed JSON array. Store only that bare digest in the existing SQL hash fields; do not prefix database values with `sha256:` or serializer IDs. Version information is fixed by this v1 contract, not stored in a new column.

Unicode rule for both existing v1 serializers: **no normalization at all** (neither NFC nor NFKC). Preserve exact stored code points, whitespace, case, punctuation, diacritics, line breaks and address text. Canonically equivalent composed/decomposed spellings deliberately hash differently. Never call `.normalize()`, `.trim()`, collapse spaces or expand abbreviations inside these serializers. Phase 1's form already trims some text and turns blank into NULL before saving; fingerprint the saved row, not the form or a newly normalized address. Country remains the actual stored country, never an injected Malaysia default.

NULL differs from `""` and from whitespace. Missing/undefined is rejected before JSON, rather than being replaced by JSON's array-null behavior. Opaque provider candidate IDs are byte-sensitive; no UUID normalization is applied to them. Application UUID fields must already be canonical lowercase `8-4-4-4-12` hex strings; reject noncanonical input instead of letting spelling change identity. Use a nonzero, server-issued random UUID for new operation identities. Digests are lowercase hex strings, not binary values coerced to text.

Finite numbers serialize with ECMAScript's shortest round-trip binary64 JSON number representation, including its exponent rules; `-0` serializes as `0`. Preserve full validated binary64 coordinates, with no decimal quantization. No NaN/Infinity (which JSON would otherwise turn into NULL), numeric strings, bigint, unsafe integers or silent conversions. Postgres driver parameter binding must preserve those binary64 values; separately test exact round trips. No cross-language implementation is accepted without golden-byte parity, including exponent notation and escaping. This is a narrow MPIA array contract, not a claim of general RFC 8785 support.

### 7.2 Property input fingerprint: exact tuple

```text
JSON.stringify([
  "mpia-property-location-input-v1",
  project_name, full_address, city, district, state, postcode, country
])
```

Each of the seven values is an explicitly present string or NULL. The synthetic source permits project_name NULL even though normal Phase 1 saved properties require a name; keep serializer parity and enforce actual row validity separately. Financial fields, property UUID, owner, listing URL, notes and `updated_at` are excluded. `project_name` is included by the accepted contract even if an owner views its edit as cosmetic. Any difference in these seven saved inputs invalidates current applicability; other independent edits do not.

Existing golden example:

```json
["mpia-property-location-input-v1","Synthetic",null,"Kuala Lumpur",null,"WP Kuala Lumpur","50000","Malaysia"]
```

`full_address=null` versus `""`, trailing space in city, and NFC versus decomposed city produce different digests. A financial save which changes none of the seven values produces the same digest.

The displayed golden JSON hashes to `152c2a8b92faa9c3068e31fbb888ce29d29633eaa5fd5ffab5abc33924f9db8c`. This was calculated during DESIGN-01 using the unchanged legacy fixture, not a new serializer implementation.

### 7.3 Operation hash: exact tuple and order

```text
JSON.stringify([
  "mpia-location-command-v1",
  property_id, actor_id,
  expected_revision, expected_current_id, property_input_hash, operation_kind,
  input_address, normalized_address, normalization_version,
  longitude, latitude, coordinate_source, source_crs,
  provider_version_id, provider_candidate_id, retrieved_at,
  coordinate_precision, accuracy_m, geocode_confidence,
  confidence_mapping_version, confirmation_status, confirmed_by, change_reason
])
```

`operation_kind` is exactly APPEND_LOCATION. Revision is numeric or literal ABSENT, never NULL; pointer is explicit UUID/NULL; ABSENT requires NULL pointer. `actor_id` is derived from verified identity. `operation_id` is deliberately **excluded**, as in the actual implementation: it selects the idempotency record, while this digest identifies that record's semantic payload. All 17 semantic fields listed above are included; generated row IDs/times/geography/version numbers and tracing/deadline/retry counters are excluded. Changing expected tokens is a different command, not an equivalent retry.

`retrieved_at` is a semantic string in v1 and therefore lexical: two spellings of the same instant hash differently. New server receipts should choose one UTC ISO format (`YYYY-MM-DDTHH:mm:ss.sssZ`) at initial construction; preserve that exact string on retries. Existing fixture/preimage bytes must not be reformatted. Do not rebuild an old operation preimage from PostgreSQL's re-rendered timestamptz or stamped confirmation time. The immutable original command envelope/receipt must survive the retry window in later orchestration; durability is not provided by the current schema. Validation rejects nonfinite/invalid instants without changing accepted v1 bytes.

Additional boundary restrictions (closed unions, UUID checks, string limits, confirmation authority, unknown-key rejection) strengthen validation without changing valid byte encoding. The historical fixture ignores unrelated generated keys; a runtime transport rejects such supplied keys rather than treating them as input authority. Leave that fixture and accepted evidence unchanged.

The existing `command` fixture in `tests/phase2a02-contract.test.mjs` (ABSENT, property UUID `f1000000-0000-0000-0000-000000000001`, actor UUID `f2000000-0000-0000-0000-000000000001`, input digest of 64 `a` characters, USER_PIN at longitude 101.6869 / latitude 3.139, REVIEW_REQUIRED, INITIAL_INPUT, other nullable fields NULL) hashes to `9351efbe0ee938e2189e8750b2fa6d84d84537695906ecff3a13daf2c540c4a4`. This is a byte-parity vector, not a trusted runtime command or evidence of authentication.

### 7.4 Idempotency identity: exact scope

Existing database identity is `(property_id, operation_id)`. Proposed portable key bytes:

```text
JSON.stringify(["mpia-location-operation-identity-v1", property_id, operation_id])
```

Hash with the same SHA-256/UTF-8/lowercase rules only if a compact internal lookup key is needed; SQL continues using the existing two-column unique key. This is a proposed interface identity, not a new stored hash/column or global deduplication table. Actor is bound inside operation_hash and reauthorization, not added to database uniqueness. An identical payload with a different operation ID is a different operation and must satisfy current expected tokens.

For property `f1000000-0000-0000-0000-000000000001` and operation `f3000000-0000-0000-0000-000000000001`, the exact three-element array above hashes to `fc0e997c519f23716f1d16c84eaf55373ff2b967a3245439d7a22ae60d4af8a1`. The proposed identity vector was calculated offline with Node SHA-256; it confers no authority and is not persisted.

Equivalent retry: same identity, same verified actor, same v1 preimage/digest, still-owned property, matching current property-input fingerprint. It returns the original version without changing the pointer or any revision/time. Same identity with a different payload/hash is OPERATION_CONFLICT; never overwrite or allocate another version. Expected-token staleness is checked for new operations after duplicate lookup, so an exact duplicate can succeed after a later location command. A changed Phase 1 input blocks the execution retry before replay, preserving the synthetic writer contract. Reconciliation of an earlier ambiguous result after that change must be a separate authorized historical status read (P03), with no publication side effect.

### 7.5 Version evolution and optional provider fingerprint

No v2 serializer in 2A-03. SQL has no dedicated hash-version column; immutable rows cannot be rewritten to add one. A future v2 requires an approved storage/compatibility strategy and explicit selector, retaining v1 evaluators and fixtures; never try multiple hashes until one happens to match. Hashes are stale/conflict detectors, not signatures, anonymization or ownership proof.

Do **not** implement a provider-result fingerprint now. There is no live adapter/cache/request persistence to justify freezing its field set. In 2A-04/2B a versioned fingerprint may support transient deduplication, using exact provider-version/adapter/policy, normalized request scope and rights-permitted result fields; sorting, result order and excluded receipt/transport metadata must then be specified in that phase. It cannot replace the command hash, a candidate receipt MAC or legal retention review. Do not hash raw vendor JSON or persist a fingerprint of prohibited data as a retention workaround.

## 8. Typed write errors and retry behavior (P07)

```ts
type LocationErrorCode =
  | "AUTHENTICATION_FAILED" | "AUTHENTICATION_UNAVAILABLE"
  | "OWNERSHIP_DENIED" | "PROPERTY_DELETED_OR_OWNERSHIP_CHANGED"
  | "VALIDATION_FAILED" | "INPUT_CHANGED" | "STALE_EXPECTED_STATE"
  | "OPERATION_CONFLICT" | "VERSION_LIMIT_REACHED" | "PROVIDER_INELIGIBLE"
  | "DATABASE_BUSY" | "TRANSACTION_FAILED" | "COMMIT_FAILED"
  | "COMMIT_OUTCOME_UNKNOWN" | "INTEGRITY_FAILURE";
type LocationWriteError = Readonly<{
  kind: "FAILURE";
  code: LocationErrorCode;
  retry: RetryAdvice;
  diagnosticId: UUID;
  fieldIssues: readonly Readonly<{ field: string; rule: string }>[];
}>;
type LocationWriteResult = LocationWriteSuccess | LocationWriteError;
```

| Outcome | Semantics and allowed next action |
| --- | --- |
| AUTHENTICATION_FAILED | Missing/invalid/expired/wrong-project/userless or service API credential; reauthenticate, then retry the same frozen command if still eligible |
| AUTHENTICATION_UNAVAILABLE | Verifier cannot reach approved Auth service; fail closed, bounded retry without opening a write transaction |
| OWNERSHIP_DENIED | Actual parent belongs to another actor; do not retry or reveal owner/address/history |
| PROPERTY_DELETED_OR_OWNERSHIP_CHANGED | Previously authorized work lost access or parent disappeared; no recreation. External API should use a common unavailable/access-denied response to conceal existence |
| VALIDATION_FAILED | Invalid schema/coordinate/metadata; fix intent and issue a new command identity only after review, not an automatic retry with changed payload |
| INPUT_CHANGED | Seven-field fingerprint changed; reload and explicitly confirm new intent with new identity. Do not retry old geocoder result against new input |
| STALE_EXPECTED_STATE | ABSENT/exact revision/pointer mismatch; reload and explicitly confirm with new operation ID. Never silently rebase |
| OPERATION_CONFLICT | Same identity, different payload; stop. Investigate/fix caller; a new identity is allowed only for a newly confirmed operation, not to bypass the conflict |
| COMMITTED / DUPLICATE | Successful prior operation, not an error; return original version, report observed current state, never republish |
| DATABASE_BUSY | Pool/lock timeout or proven aborted deadlock/serialization failure; bounded retry of exactly the same command/ID, reauthenticate/recheck every time |
| TRANSACTION_FAILED | Known rollback before COMMIT; same ID only if error is transient, otherwise DO_NOT_RETRY. No provider call while holding locks |
| COMMIT_FAILED | Server explicitly rejects COMMIT and abort is known (e.g. deferred 23503); no success. Integrity/constraint cause needs correction, not blind retry |
| COMMIT_OUTCOME_UNKNOWN | Connection/process lost around COMMIT, outcome cannot be proved; reconcile using same identity. Never assume rollback or generate new ID |
| VERSION_LIMIT_REACHED / INTEGRITY_FAILURE | Stop and investigate; no wraparound, history repair or hidden schema change |
| PROVIDER_INELIGIBLE | New ingestion blocked; rights/configuration review needed. Successful historical duplicate lookup does not ingest provider data again |

Provider errors remain distinct from location-write errors: TIMEOUT and PROVIDER_UNAVAILABLE permit bounded backoff outside locks; RATE_LIMITED respects Retry-After and budget; QUOTA_EXCEEDED waits for authorized reset, not repeated billing attempts; AUTH_FAILED requires server configuration repair, not user-login retry; NO_RESULTS is successful empty acquisition with no fabricated point. User confirmation is needed to choose/change a point. Failed geocoding never rolls back a Phase 1 save.

## 9. Pure read eligibility (P09)

```ts
type OriginEligibility =
  | Readonly<{ kind: "USABLE"; origin: PinnedOrigin }>
  | Readonly<{ kind: "UNAVAILABLE"; reason:
      "NO_LOCATION_INTENT" | "UNCONFIRMED" | "REVIEW_REQUIRED" | "CLEARED"
      | "STALE_PROPERTY_INPUT" | "INVALID_LINEAGE" | "INVALID_COORDINATES" }>;
type LocationReadDecision = Readonly<{
  latestIntent: Readonly<{ id: UUID; status: ConfirmationStatus }> | null;
  inputRelation: "MATCH" | "MISMATCH" | "NOT_APPLICABLE";
  currentOrigin: OriginEligibility;
}>;
// AuthorizedLocationSnapshot contains one coherent property/state/pointed-row view.
// It is constructed by validated data access, never directly from arbitrary UI data.
// evaluateCurrentOrigin(snapshot): LocationReadDecision
// evaluateHistoricalOrigin(authorizedPinnedVersion): historical result with exact pin
```

The evaluator has no database, provider, clock, logging or state mutation. Its authorized input contains actual current seven-field fingerprint, optional state, exact pointed version and validated scalar coordinates; callers must obtain a coherent single-statement joined snapshot (or equivalent transactional read), not combine independently cached REST responses from different revisions. Authentication/authorization remain outside this pure function and mandatory. The result is an observation; every later authoritative write/acquisition rechecks its captured tokens and lineage.

| Snapshot | Deterministic decision |
| --- | --- |
| No state, or state with NULL pointer | No latest intent; NO_LOCATION_INTENT; no fallback to newest history row |
| Pointer cannot resolve to same property/exact UUID | INVALID_LINEAGE, fail closed; never silently repair pointer or select a different row |
| UNCONFIRMED | Latest intent visible; no origin, even if older history was confirmed |
| REVIEW_REQUIRED | Latest intent visible; no origin, even with a valid point or HIGH confidence |
| CLEARED | Latest intent visible; no origin; older confirmed version remains historical only |
| CONFIRMED + changed current input hash | STALE_PROPERTY_INPUT; no usable current origin, even if pointer/status never changed |
| CONFIRMED + matching hash + valid lineage/pair | USABLE, pinned to that exact row ID/version/coordinates |
| Financial-only edits | Same seven-field hash; decision unchanged |
| Historical pinned origin | Resolve and authorize its own exact property/version pair; require its historical confirmation/valid coordinates. Current-input mismatch or newer pointer does not replace it. Return historical labeling and original hash, not current eligibility |

Report `inputRelation` independently for every nonnull intent, even for REVIEW_REQUIRED/CLEARED. Status reasons take precedence for those nonconfirmed states; mismatch is still visible. For a confirmed invalid coordinate/lineage, integrity failure precedes stale-input evaluation. Historical missing/purged/invalid origins are unavailable, never substituted. A later acquisition for current analysis must not consume an explicitly historical origin without its own approved mode/lineage contract.

This derives applicability only. Processing (`NOT_STARTED`), freshness (`UNKNOWN`) and publication (`NOT_ASSESSED`) remain separate existing columns. Provider acquisition status, data age and future assessment eligibility are neither inferred from confirmation nor written by this read. No existing analysis hook, Investment Score, confidence or recommendation behavior changes.
