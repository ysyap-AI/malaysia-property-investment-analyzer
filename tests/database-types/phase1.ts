// Compile-only regression checks; this file never sends database requests.
import { supabase } from "../../src/integrations/supabase/external-client";
import type { Tables, TablesInsert, TablesUpdate } from "../../src/integrations/supabase/types";
import type { getProperty, listProperties } from "../../src/lib/property/property-api";
import type { getAcquisitionCosts } from "../../src/lib/property/acquisition-api";
import type { getOperatingExpenses } from "../../src/lib/property/operating-expenses-api";
import type { getFinancing } from "../../src/lib/property/financing-api";
import type { PropertyInput, PropertyRecord, RentVerificationStatus } from "../../src/lib/property/property-fields";
import type { AcquisitionCostsInput } from "../../src/lib/property/acquisition-fields";
import type { OperatingExpensesInput } from "../../src/lib/property/operating-expense-fields";
import type { FinancingRow } from "../../src/lib/property/financing-fields";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

type PropertyRead = Assert<Equal<Awaited<ReturnType<typeof getProperty>>, PropertyRecord | null>>;
type PropertyList = Assert<Equal<Awaited<ReturnType<typeof listProperties>>, PropertyRecord[]>>;
type PropertyColumns = Assert<Equal<Omit<PropertyRecord, "rent_verification_status">, Omit<Tables<"properties">, "rent_verification_status">>>;
type RentEvidence = Assert<Equal<PropertyRecord["rent_verification_status"], RentVerificationStatus | null>>;
type AcquisitionRead = Assert<Equal<Awaited<ReturnType<typeof getAcquisitionCosts>>, Tables<"acquisition_costs"> | null>>;
type OperatingRead = Assert<Equal<Awaited<ReturnType<typeof getOperatingExpenses>>, Tables<"operating_expenses"> | null>>;
type FinancingRead = Assert<Equal<Awaited<ReturnType<typeof getFinancing>>, Tables<"financing"> | null>>;
type NullableStatus = Assert<Equal<Tables<"properties">["property_status"], string | null>>;

function checkWrites(
  property: PropertyInput,
  acquisition: AcquisitionCostsInput,
  operating: OperatingExpensesInput,
  financing: FinancingRow,
) {
  ({ ...property, user_id: "owner" } satisfies TablesInsert<"properties">);
  ({ ...acquisition, property_id: "parent" } satisfies TablesInsert<"acquisition_costs">);
  ({ ...operating, property_id: "parent" } satisfies TablesInsert<"operating_expenses">);
  ({ ...financing, property_id: "parent" } satisfies TablesInsert<"financing">);
  (property satisfies TablesUpdate<"properties">);
  (acquisition satisfies TablesUpdate<"acquisition_costs">);
  (operating satisfies TablesUpdate<"operating_expenses">);
  (financing satisfies TablesUpdate<"financing">);

  // Phase 1 payloads need neither legacy values nor server-generated timestamps.
  supabase.from("acquisition_costs").insert({ property_id: "parent", spa_legal_fee: null });
  supabase.from("operating_expenses").update({ annual_maintenance_fee: 0 });
  supabase.from("financing").update({ annual_interest_rate_percent: null, bank_quote_verified: false });

  // These must fail compilation if schema checking is working.
  // @ts-expect-error Unknown table.
  supabase.from("nonexistent_phase1_table");
  // @ts-expect-error Property inserts require ownership.
  supabase.from("properties").insert({ project_name: "Missing owner" });
  // @ts-expect-error Child inserts require the parent property.
  supabase.from("acquisition_costs").insert({ spa_legal_fee: 0 });
  // @ts-expect-error Removed property column name.
  supabase.from("properties").update({ address: "Old column" });
  // @ts-expect-error Financial amounts are numeric or null.
  supabase.from("operating_expenses").update({ annual_maintenance_fee: "100" });
  // @ts-expect-error Verification flags cannot be null in the deployed schema.
  supabase.from("financing").update({ bank_quote_verified: null });
}
