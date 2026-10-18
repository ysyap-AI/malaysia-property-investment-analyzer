import type { Database, Tables, TablesInsert, TablesUpdate } from "../../src/integrations/supabase/types";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type State = Database["public"]["Tables"]["property_location_intelligence_state"];
type Pointer = Assert<Equal<State["Row"]["current_location_version_id"], string | null>>;
type Composite = Extract<State["Relationships"][number], { referencedRelation: "property_location_versions" }>;
type Pair = Assert<Equal<Composite["columns"], ["property_id", "current_location_version_id"]>>;
type TargetPair = Assert<Equal<Composite["referencedColumns"], ["property_id", "id"]>>;
type One = Assert<Equal<Composite["isOneToOne"], true>>;
type Generated = Assert<Equal<Tables<"property_location_versions">["position"], unknown>>;
type SafeVersion = Assert<Equal<Tables<"property_location_versions">["version_number"], number>>;
// SQL enforces the safe-integer ceiling, vocabulary, immutability and permissions.
const history: TablesInsert<"property_location_versions"> = {
  property_id: "synthetic-property", created_by: "synthetic-actor",
  version_number: 1, operation_id: "synthetic-operation", operation_hash: "a".repeat(64),
  property_input_hash: "b".repeat(64), change_reason: "INITIAL_INPUT",
};
const pointer: TablesInsert<"property_location_intelligence_state"> = {
  property_id: "synthetic-property", current_location_version_id: null,
};
const suppliedPosition: TablesInsert<"property_location_versions"> = {
  ...history,
  // @ts-expect-error Geography is generated from scalar inputs.
  position: "POINT(101 3)",
};
const changedPosition: TablesUpdate<"property_location_versions"> = {
  // @ts-expect-error Generated geography cannot be updated independently.
  position: null,
};
// @ts-expect-error A history append requires operation identity and version metadata.
const incomplete: TablesInsert<"property_location_versions"> = { property_id: "x" };
const wrongVersion: TablesInsert<"property_location_versions"> = {
  ...history,
  // @ts-expect-error SQL bigint is represented as a bounded JS number in this schema.
  version_number: "1",
};
void [history, pointer, suppliedPosition, changedPosition, incomplete, wrongVersion];
export type Contracts = [Pointer, Pair, TargetPair, One, Generated, SafeVersion];
