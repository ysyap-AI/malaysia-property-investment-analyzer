import {
  operatingExpensesSchema,
  type OperatingExpensesRecord,
} from "@/lib/property/operating-expense-fields";

export const propertyId = "synthetic-property";
export function expenseRow(
  amount: number | null = 100,
  property_id = propertyId,
): OperatingExpensesRecord {
  return {
    ...operatingExpensesSchema.parse({ annual_maintenance_fee: amount, annual_sinking_fund: 0 }),
    id: "synthetic-row",
    property_id,
  } as OperatingExpensesRecord;
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
