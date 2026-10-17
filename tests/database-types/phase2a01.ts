import type { Database, TablesInsert } from "../../src/integrations/supabase/types";

const state: TablesInsert<"property_location_intelligence_state"> = {
  property_id: "synthetic-property-id",
};
const provider: TablesInsert<"location_provider_registry"> = {
  provider_key: "synthetic",
  provider_version: 1,
  display_name: "Synthetic",
  capabilities: ["GEOCODING"],
};
// Generated TEXT columns intentionally remain strings. SQL constraints and grants
// enforce vocabulary and runtime writes; types do not confer permission.
const revision: Database["public"]["Tables"]["property_location_intelligence_state"]["Row"]["state_revision"] = 0;
// @ts-expect-error State always belongs to an existing property.
const missingParent: TablesInsert<"property_location_intelligence_state"> = {};
const futureScore: TablesInsert<"property_location_intelligence_state"> = {
  property_id: "x",
  // @ts-expect-error No synthetic score column was introduced.
  location_score: 100,
};
const wrongCapability: TablesInsert<"location_provider_registry"> = {
  ...provider,
  // @ts-expect-error Structured registry arrays cannot be scalar strings.
  capabilities: "GEOCODING",
};
// @ts-expect-error No duplicated owner field on state.
const spoofOwner: TablesInsert<"property_location_intelligence_state"> = { ...state, user_id: "x" };
void [state, provider, revision, missingParent, futureScore, wrongCapability, spoofOwner];
