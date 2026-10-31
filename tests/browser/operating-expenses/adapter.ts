// Expense-only extension of accepted B05 synthetic identity/transport controls.
import {
  createSyntheticAdapter,
  accounts,
  properties,
  type Identity,
  type PropertyName,
  type Plan as BasePlan,
} from "../acquisition/adapter";
import { OPERATING_EXPENSE_FIELDS } from "../../../src/lib/finance/operating-expenses";
import type {
  OperatingExpensesInput,
  OperatingExpensesRecord,
} from "../../../src/lib/property/operating-expense-fields";
export { accounts, properties, type Identity, type PropertyName };
export type Plan = Omit<BasePlan, "mode"> & {
  mode: BasePlan["mode"] | "wrong-property" | "omitted-field" | "empty-id";
};
export const variants = ["baseline", "absent", "nulls", "zeros", "changed"] as const;
export type Variant = (typeof variants)[number];
const clone = <T>(v: T): T => structuredClone(v);
const raw = "B05_EXPENSE_RAW_SENTINEL synthetic-account amount=00123.40";
const failure = (code: string) => ({
  data: null,
  error: { code, message: raw, details: raw, hint: raw },
});
export function fixtureRow(
  property: PropertyName,
  variant: Variant,
): OperatingExpensesRecord | null {
  if (variant === "absent") return null;
  const values = Object.fromEntries(
    OPERATING_EXPENSE_FIELDS.map((f) => [f, variant === "zeros" ? 0 : null]),
  ) as OperatingExpensesInput;
  if (variant === "baseline")
    values.annual_maintenance_fee = property === "A1" ? 2400 : property === "A2" ? 3600 : 4800;
  if (variant === "changed") values.annual_maintenance_fee = 9999;
  return {
    assessment_annual: null,
    insurance_annual: null,
    maintenance_monthly: null,
    management_fee_monthly: null,
    other_monthly: null,
    quit_rent_annual: null,
    sinking_fund_monthly: null,
    utilities_monthly: null,
    ...values,
    id: properties[property].id.replace("b051", "b054"),
    property_id: properties[property].id,
    created_at: "2026-10-25T00:00:00Z",
    updated_at: "2026-10-25T00:00:00Z",
  };
}
export function createOperatingExpensesAdapter() {
  const identity = createSyntheticAdapter();
  const rows = new Map<string, OperatingExpensesRecord | null>();
  const reads: Plan[] = [],
    writes: Plan[] = [];
  const held = new Map<number, () => void>();
  const observers = new Set<() => void>();
  const notify = () => observers.forEach((fn) => fn());
  identity.observe(notify);
  let sequence = 20000;
  const operations: {
    id: number;
    method: "GET" | "INSERT" | "UPDATE";
    table: "operating_expenses";
    account: Identity;
    property: PropertyName;
    phase: string;
    state: string;
    submitted?: OperatingExpensesInput;
  }[] = [];
  const seed = (p: PropertyName, v: Variant) => {
    rows.set(properties[p].id, fixtureRow(p, v));
    notify();
  };
  (Object.keys(properties) as PropertyName[]).forEach((p) => seed(p, "baseline"));
  async function execute(
    method: "GET" | "INSERT" | "UPDATE",
    filter: string,
    parent: string,
    values?: OperatingExpensesInput,
  ) {
    const property = (Object.keys(properties) as PropertyName[]).find(
      (p) => properties[p].id === filter || rows.get(properties[p].id)?.id === filter,
    );
    if (!property) throw new Error("Invented expense identifiers only.");
    const account = identity.getIdentity();
    const plan = (method === "GET" ? reads : writes).shift() ?? {
      mode: method === "GET" ? "record" : "confirm",
    };
    const op = {
      id: ++sequence,
      method,
      table: "operating_expenses" as const,
      account,
      property,
      phase: method === "GET" ? (plan.phase ?? "initial") : "write",
      state: plan.hold ? "held" : "finished",
      ...(values ? { submitted: clone(values) } : {}),
    };
    operations.push(op);
    if (plan.hold)
      await new Promise<void>((resolve) => {
        held.set(op.id, resolve);
        notify();
      });
    op.state = "finished";
    notify();
    // Ownership follows the dispatched synthetic identity, even if UI identity changes later.
    if (
      (account !== "A" && account !== "B") ||
      accounts[account].id !== properties[property].owner ||
      (parent && parent !== properties[property].id)
    )
      return failure("42501");
    if (method === "GET") {
      if (plan.mode === "error") return failure("B05_READ");
      if (plan.mode === "absent") return { data: null, error: null };
      if (plan.mode === "malformed") return { data: { property_id: filter }, error: null };
      return { data: clone(rows.get(properties[property].id) ?? null), error: null };
    }
    if (plan.mode === "reject") return failure("23514");
    if (plan.mode === "lost-uncommitted") throw new Error(raw, { cause: raw });
    const previous = rows.get(properties[property].id);
    if (method === "INSERT" && previous) return failure("23505");
    if (method === "UPDATE" && !previous) return failure("PGRST116");
    const row = { ...fixtureRow(property, "nulls")!, ...values };
    rows.set(properties[property].id, clone(row));
    if (plan.mode === "lost-committed") throw new Error(raw, { cause: raw });
    if (plan.mode === "missing") return { data: null, error: null };
    if (plan.mode === "malformed")
      return { data: { ...row, annual_maintenance_fee: "malformed" }, error: null };
    if (plan.mode === "server-value")
      return { data: { ...row, annual_maintenance_fee: 1 }, error: null };
    if (plan.mode === "wrong-property")
      return { data: { ...row, property_id: properties.A2.id }, error: null };
    if (plan.mode === "empty-id") return { data: { ...row, id: "" }, error: null };
    if (plan.mode === "omitted-field") {
      const { annual_other_operating_expenses: _, ...rest } = row;
      return { data: rest, error: null };
    }
    return { data: clone(row), error: null };
  }
  const client = {
    auth: identity.client.auth,
    from(table: string) {
      if (table !== "operating_expenses")
        throw new Error("Synthetic operating-expenses table only.");
      let method: "GET" | "INSERT" | "UPDATE" = "GET",
        filter = "",
        parent = "";
      let values: OperatingExpensesInput | undefined;
      const query = {
        select(columns: string) {
          if (columns !== "*") throw new Error("Unexpected select.");
          return query;
        },
        eq(column: string, value: string) {
          if (method === "UPDATE" && column === "property_id") parent = value;
          else if (column === (method === "GET" ? "property_id" : "id")) filter = value;
          else throw new Error("Unexpected filter.");
          return query;
        },
        update(input: OperatingExpensesInput) {
          method = "UPDATE";
          values = clone(input);
          return query;
        },
        insert(input: OperatingExpensesInput & { property_id: string }) {
          method = "INSERT";
          filter = input.property_id;
          const { property_id: _, ...rest } = input;
          values = clone(rest);
          return query;
        },
        maybeSingle() {
          return execute(method, filter, parent, values);
        },
        single() {
          return execute(method, filter, parent, values);
        },
      };
      return query;
    },
  };
  return {
    client,
    operations,
    seed,
    observe(fn: () => void) {
      observers.add(fn);
      return () => {
        observers.delete(fn);
      };
    },
    pending: () => [...held.keys()],
    queued: () => clone({ reads, writes }),
    release(id: number) {
      const fn = held.get(id);
      held.delete(id);
      fn?.();
      notify();
    },
    planRead(plan: Plan) {
      reads.push({ ...plan });
      notify();
    },
    planWrite(plan: Plan) {
      writes.push({ ...plan });
      notify();
    },
    switchIdentity: identity.switchIdentity,
    getIdentity: identity.getIdentity,
    inspect: (p: PropertyName) => clone(rows.get(properties[p].id) ?? null),
  };
}
export const synthetic = createOperatingExpensesAdapter();
export const supabase = synthetic.client;
