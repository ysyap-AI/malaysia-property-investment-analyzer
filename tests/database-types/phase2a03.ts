import type { Tables, TablesInsert } from "../../src/integrations/supabase/types";
import type {
  ExpectedLocationState,
  LocationFieldsV1,
  TrustedLocationCommand,
  TrustedLocationWriter,
  VerifiedActor,
} from "../../src/lib/location/contracts";
import type { Coordinates, PositiveInt, SafeInt, UUID } from "../../src/lib/location/primitives";
import type {
  GeocodeResult,
  GeocodingProvider,
  MapProvider,
  PlacesProvider,
  ProviderProvenance,
  RoutingProvider,
  RouteItem,
} from "../../src/lib/location/providers";

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Row = Tables<"property_location_versions">;
type Insert = TablesInsert<"property_location_versions">;
type FieldsMatchSql = Assert<Equal<Exclude<keyof LocationFieldsV1, keyof Row>, never>>;
type FieldValuesMatchSql = Assert<
  LocationFieldsV1 extends Pick<Row, keyof LocationFieldsV1> ? true : false
>;
type GeographyWriteDenied = Assert<Equal<Insert["position"], undefined>>;
type CommandNotInsert = Assert<Equal<TrustedLocationCommand extends Insert ? true : false, false>>;
type PrecisionSqlSubset = Assert<
  LocationFieldsV1["coordinate_precision"] extends Row["coordinate_precision"] ? true : false
>;
type NoWriterOnProviders = Assert<
  Equal<
    Extract<
      keyof GeocodingProvider | keyof PlacesProvider | keyof RoutingProvider | keyof MapProvider,
      "execute" | "write" | "insert" | "update"
    >,
    never
  >
>;

declare const id: UUID, revision: SafeInt, version: PositiveInt, point: Coordinates;
declare const provenance: ProviderProvenance,
  command: TrustedLocationCommand,
  writer: TrustedLocationWriter;
const absent: ExpectedLocationState = { kind: "ABSENT" };
const exact: ExpectedLocationState = { kind: "EXACT", revision, currentLocationVersionId: null };
// @ts-expect-error -- absent is not exact revision zero
const mixed: ExpectedLocationState = { kind: "ABSENT", revision };
// @ts-expect-error -- pointer token must be explicit
const omittedPointer: ExpectedLocationState = { kind: "EXACT", revision };
const stringRevision: ExpectedLocationState = {
  kind: "EXACT",
  // @ts-expect-error -- external string/bigint revisions require a distinct decoder
  revision: "1",
  currentLocationVersionId: null,
};
// @ts-expect-error -- raw numbers are not validated positive versions
const unvalidatedVersion: PositiveInt = 1;
// @ts-expect-error -- unsupported CRS
const webMercator: Coordinates = { ...point, crs: "EPSG:3857" };
// @ts-expect-error -- plain userId does not establish verified server identity
const actor: VerifiedActor = {
  userId: id,
  verifiedAt: provenance.retrievedAt,
  issuer: "synthetic",
};
// @ts-expect-error -- generated Insert cannot serve as a trusted command
const insertCommand: TrustedLocationCommand = {} as Insert;
// @ts-expect-error -- immutable version fields excluded from commands
const generatedCommand: TrustedLocationCommand = { ...command, version_number: version };
// @ts-expect-error -- success cannot contain empty candidates
const emptySuccess: GeocodeResult = { kind: "SUCCESS", data: [], provenance };
const failureAsEmpty: GeocodeResult = {
  kind: "NO_RESULTS",
  // @ts-expect-error -- no-results requires scoped successful acquisition metadata
  details: { reason: "TIMEOUT", queryScope: "REQUEST_ONLY" },
  provenance,
};
const rawRoute: RouteItem = {
  kind: "ROUTE",
  requestItemId: "1",
  method: "WALKING_ROUTE",
  // @ts-expect-error -- distance requires validated metres
  distanceM: 0,
  // @ts-expect-error -- duration requires validated seconds
  durationS: 0,
  snappedOrigin: null,
  snappedDestination: null,
};
// @ts-expect-error -- no public immutable-history update API
writer.update(id, {});
const geography: Insert = {
  property_id: id,
  version_number: version,
  operation_id: id,
  operation_hash: "",
  property_input_hash: "",
  created_by: id,
  change_reason: "INITIAL_INPUT",
  // @ts-expect-error -- generated geography cannot be written
  position: "POINT(0 0)",
};
void [
  absent,
  exact,
  mixed,
  omittedPointer,
  stringRevision,
  unvalidatedVersion,
  webMercator,
  actor,
  insertCommand,
  generatedCommand,
  emptySuccess,
  failureAsEmpty,
  rawRoute,
  geography,
];
