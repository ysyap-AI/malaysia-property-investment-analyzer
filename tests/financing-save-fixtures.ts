import {
  buildFinancingRow,
  financingSchema,
  type FinancingRecord,
  type FinancingRow,
} from "@/lib/property/financing-fields";

export const propertyId = "synthetic-property";
export const financingValues = (loan = 200): FinancingRow =>
  buildFinancingRow(
    financingSchema.parse({
      loan_amount: loan,
      annual_interest_rate_percent: 0,
      loan_tenure_years: 10,
      use_user_provided_instalment: false,
      bank_quote_verified: false,
    }),
    1000,
  );
export const financingRecord = (loan = 200, id = propertyId): FinancingRecord => ({
  ...financingValues(loan),
  id: "synthetic-row",
  property_id: id,
  created_at: "2026-10-25T00:00:00Z",
  updated_at: "2026-10-25T00:00:00Z",
  deposit_amount: null,
  deposit_percent: null,
  interest_rate_percent: null,
  purchase_price: null,
});
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
