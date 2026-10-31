// Financing extension of the accepted acquisition memory transport. No real client.
import {
  createSyntheticAdapter,
  accounts,
  properties,
  type Identity,
  type PropertyName,
  type Plan,
} from "../acquisition/adapter";
import {
  buildFinancingRow,
  financingSchema,
  type FinancingRecord,
  type FinancingRow,
} from "../../../src/lib/property/financing-fields";
export { properties, accounts, type Identity, type PropertyName, type Plan };
export const variants = ["baseline", "absent", "nulls", "zeros", "changed"] as const;
export type Variant = (typeof variants)[number];
const clone = <T>(v: T): T => structuredClone(v);
const raw = "B05_FINANCING_RAW_SENTINEL synthetic-account loan=00123.40";
const failure = (code: string) => ({
  data: null,
  error: { code, message: raw, details: raw, hint: raw },
});
export function fixtureRow(property: PropertyName, variant: Variant): FinancingRecord | null {
  if (variant === "absent") return null;
  const values = buildFinancingRow(
    financingSchema.parse({
      loan_to_value_percent: variant === "baseline" ? 80 : null,
      loan_amount: variant === "changed" ? 220000 : variant === "zeros" ? 0 : null,
      annual_interest_rate_percent: variant === "baseline" ? 4 : variant === "zeros" ? 0 : null,
      loan_tenure_years: variant === "baseline" ? 30 : null,
      user_provided_monthly_instalment: variant === "zeros" ? 0 : null,
      use_user_provided_instalment: false,
      bank_quote_verified: false,
      loan_type: variant === "baseline" ? "Conventional" : null,
      financing_notes: variant === "changed" ? "Changed synthetic row" : null,
    }),
    600000,
  );
  return {
    ...values,
    id: properties[property].id.replace("b051", "b053"),
    property_id: properties[property].id,
    created_at: "2026-10-25T00:00:00Z",
    updated_at: "2026-10-25T00:00:00Z",
    deposit_amount: null,
    deposit_percent: null,
    interest_rate_percent: null,
    purchase_price: null,
  };
}
export function createFinancingAdapter() {
  const acquisition = createSyntheticAdapter();
  const rows = new Map<string, FinancingRecord | null>();
  const reads: Plan[] = [],
    writes: Plan[] = [];
  const held = new Map<number, () => void>();
  const observers = new Set<() => void>();
  const notify = () => observers.forEach((fn) => fn());
  acquisition.observe(notify);
  let sequence = 10000;
  const operations: {
    id: number;
    method: "GET" | "INSERT" | "UPDATE";
    table: string;
    account: Identity;
    property: PropertyName;
    phase: string;
    state: string;
    submitted?: FinancingRow;
    acquisitionPriceAtDispatch?: number | null;
  }[] = [];
  const seed = (p: PropertyName, v: Variant) => {
    rows.set(properties[p].id, fixtureRow(p, v));
    notify();
  };
  (Object.keys(properties) as PropertyName[]).forEach((p) => seed(p, "baseline"));
  async function execute(
    method: "GET" | "INSERT" | "UPDATE",
    filter: string,
    values?: FinancingRow,
  ) {
    const property = (Object.keys(properties) as PropertyName[]).find(
      (p) => properties[p].id === filter || rows.get(properties[p].id)?.id === filter,
    );
    if (!property) throw new Error("Invented financing identifiers only.");
    const account = acquisition.getIdentity();
    const plan = (method === "GET" ? reads : writes).shift() ?? {
      mode: method === "GET" ? "record" : "confirm",
    };
    const op = {
      id: ++sequence,
      method,
      table: "financing",
      account,
      property,
      phase: method === "GET" ? (plan.phase ?? "initial") : "write",
      state: plan.hold ? "held" : "finished",
      ...(values
        ? {
            submitted: clone(values),
            acquisitionPriceAtDispatch: acquisition.inspect(property)?.purchase_price ?? null,
          }
        : {}),
    };
    operations.push(op);
    if (plan.hold)
      await new Promise<void>((resolve) => {
        held.set(op.id, resolve);
        notify();
      });
    op.state = "finished";
    notify();
    if ((account !== "A" && account !== "B") || accounts[account].id !== properties[property].owner)
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
      return { data: { ...row, loan_amount: "malformed" }, error: null };
    if (plan.mode === "server-value") return { data: { ...row, loan_amount: 1 }, error: null };
    return { data: clone(row), error: null };
  }
  function financingFrom(table: string) {
    if (table !== "financing") throw new Error("Synthetic financial tables only.");
    let method: "GET" | "INSERT" | "UPDATE" = "GET",
      filter = "";
    let values: FinancingRow | undefined;
    const query = {
      select(columns: string) {
        if (columns !== "*") throw new Error("Unexpected select.");
        return query;
      },
      eq(column: string, value: string) {
        if (column !== (method === "GET" ? "property_id" : "id"))
          throw new Error("Unexpected filter.");
        filter = value;
        return query;
      },
      update(input: FinancingRow) {
        method = "UPDATE";
        values = clone(input);
        return query;
      },
      insert(input: FinancingRow & { property_id: string }) {
        method = "INSERT";
        filter = input.property_id;
        const { property_id: _, ...rest } = input;
        values = clone(rest);
        return query;
      },
      maybeSingle() {
        return execute(method, filter, values);
      },
      single() {
        return execute(method, filter, values);
      },
    };
    return query;
  }
  function from(table: "financing"): ReturnType<typeof financingFrom>;
  function from(table: "acquisition_costs"): ReturnType<typeof acquisition.client.from>;
  function from(
    table: string,
  ): ReturnType<typeof financingFrom> | ReturnType<typeof acquisition.client.from>;
  function from(table: string) {
    return table === "acquisition_costs" ? acquisition.client.from(table) : financingFrom(table);
  }
  const client = { auth: acquisition.client.auth, from };
  return {
    client,
    acquisition,
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
    switchIdentity: acquisition.switchIdentity,
    getIdentity: acquisition.getIdentity,
    inspect: (p: PropertyName) => clone(rows.get(properties[p].id) ?? null),
  };
}
export const synthetic = createFinancingAdapter();
export const supabase = synthetic.client;
