// B05 synthetic transport only. Never import this module from src/.
import { ACQUISITION_COST_FIELDS } from "../../../src/lib/finance/acquisition";
import type {
  AcquisitionCostsInput,
  AcquisitionCostsRecord,
} from "../../../src/lib/property/acquisition-fields";

export const accounts = {
  A: { id: "b0500000-0000-4000-8000-000000000001", email: "b05-a@example.invalid" },
  B: { id: "b0500000-0000-4000-8000-000000000002", email: "b05-b@example.invalid" },
};
export const properties = {
  A1: {
    id: "b0510000-0000-4000-8000-000000000001",
    owner: accounts.A.id,
    name: "Synthetic B05 Amber",
  },
  A2: {
    id: "b0510000-0000-4000-8000-000000000002",
    owner: accounts.A.id,
    name: "Synthetic B05 Birch",
  },
  B1: {
    id: "b0510000-0000-4000-8000-000000000003",
    owner: accounts.B.id,
    name: "Synthetic B05 Cedar",
  },
};
export type PropertyName = keyof typeof properties;
export type Identity = keyof typeof accounts | "anonymous" | "expired";
export const variants = [
  "baseline",
  "absent",
  "nulls",
  "optional-only",
  "purchase-only",
  "zeros",
  "complete",
  "invalid",
  "changed",
] as const;
export type Variant = (typeof variants)[number];
export type ReadMode = "record" | "absent" | "error" | "malformed";
export type WriteMode =
  | "confirm"
  | "server-value"
  | "reject"
  | "lost-committed"
  | "lost-uncommitted"
  | "missing"
  | "malformed";
export type Phase = "initial" | "existence" | "background" | "review" | "follow-up";
export type Plan = { mode: ReadMode | WriteMode; hold?: boolean; phase?: Phase };
type Reply = {
  data: unknown;
  error: null | { code: string; message: string; details: string; hint: string };
};
type Session = { user: typeof accounts.A | typeof accounts.B } | null;
type Listener = (event: string, session: Session) => void;
const raw = "B05_RAW_ERROR_SENTINEL synthetic-account cost=00123.40";
const failure = (code: string): Reply => ({
  data: null,
  error: { code, message: raw, details: raw, hint: raw },
});
const clone = <T>(value: T): T => structuredClone(value);

export function fixtureRow(
  property: PropertyName,
  variant: Variant,
): AcquisitionCostsRecord | null {
  if (variant === "absent") return null;
  const allZero = variant === "zeros" || variant === "complete";
  const values = Object.fromEntries(
    ACQUISITION_COST_FIELDS.map((f) => [f, allZero ? 0 : null]),
  ) as AcquisitionCostsInput;
  if (["baseline", "purchase-only", "complete", "changed"].includes(variant))
    values.purchase_price =
      variant === "changed"
        ? 630000
        : property === "A2"
          ? 720000
          : property === "B1"
            ? 830000
            : 600000;
  if (variant === "baseline") values.spa_legal_fee = 0;
  if (variant === "optional-only") values.other_cost = 25;
  if (variant === "invalid") values.purchase_price = -1;
  return {
    ...values,
    id: properties[property].id.replace("b051", "b052"),
    property_id: properties[property].id,
    created_at: "2026-10-24T00:00:00Z",
    updated_at: "2026-10-24T00:00:00Z",
  } as AcquisitionCostsRecord;
}

export function createSyntheticAdapter() {
  let identity: Identity = "A";
  let sequence = 0;
  const rows = new Map<string, AcquisitionCostsRecord | null>();
  const reads: Plan[] = [];
  const writes: Plan[] = [];
  const listeners = new Set<Listener>();
  const observers = new Set<() => void>();
  const held = new Map<number, () => void>();
  const operations: {
    id: number;
    method: "GET" | "INSERT" | "UPDATE";
    table: "acquisition_costs";
    account: Identity;
    property: PropertyName;
    phase: Phase | "write";
    state: "held" | "finished";
  }[] = [];
  const notify = () => observers.forEach((fn) => fn());
  const session = (): Session =>
    identity === "A" || identity === "B" ? { user: accounts[identity] } : null;
  const authorized = (who: Identity, property: PropertyName) =>
    (who === "A" || who === "B") && accounts[who].id === properties[property].owner;
  const seed = (property: PropertyName, variant: Variant) => {
    rows.set(properties[property].id, fixtureRow(property, variant));
    notify();
  };
  Object.keys(properties).forEach((p) => seed(p as PropertyName, "baseline"));

  async function execute(
    method: "GET" | "INSERT" | "UPDATE",
    filter: string,
    values?: AcquisitionCostsInput,
  ): Promise<Reply> {
    const property = (Object.keys(properties) as PropertyName[]).find(
      (p) => properties[p].id === filter || rows.get(properties[p].id)?.id === filter,
    );
    if (!property) throw new Error("Synthetic fixture accepts invented property identifiers only.");
    const account = identity;
    const plan = (method === "GET" ? reads : writes).shift() ?? {
      mode: method === "GET" ? "record" : "confirm",
    };
    const op = {
      id: ++sequence,
      method,
      table: "acquisition_costs" as const,
      account,
      property,
      phase: method === "GET" ? (plan.phase ?? "initial") : ("write" as const),
      state: plan.hold ? ("held" as const) : ("finished" as const),
    };
    operations.push(op);
    const snapshot = values ? clone(values) : undefined;
    if (!plan.hold) notify();
    if (plan.hold)
      await new Promise<void>((resolve) => {
        held.set(op.id, resolve);
        notify();
      });
    op.state = "finished";
    notify();
    // Authorization is checked against the dispatched identity, including held requests.
    if (!authorized(account, property)) return failure("42501");
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
    const row = { ...fixtureRow(property, "nulls")!, ...snapshot };
    if (plan.mode === "server-value") row.purchase_price = 620001;
    rows.set(properties[property].id, clone(row));
    if (plan.mode === "lost-committed") throw new Error(raw, { cause: raw });
    if (plan.mode === "missing") return { data: null, error: null };
    if (plan.mode === "malformed")
      return { data: { ...row, purchase_price: "malformed" }, error: null };
    return { data: clone(row), error: null };
  }

  const auth = {
    onAuthStateChange(fn: Listener) {
      listeners.add(fn);
      queueMicrotask(() => {
        if (listeners.has(fn)) fn("INITIAL_SESSION", session());
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(fn);
            },
          },
        },
      };
    },
    async getSession() {
      return { data: { session: session() }, error: null };
    },
  };
  // Minimal fluent transport used by the unchanged production acquisition API.
  const client = {
    auth,
    from(table: string) {
      if (table !== "acquisition_costs") throw new Error("Synthetic acquisition table only.");
      let method: "GET" | "INSERT" | "UPDATE" = "GET";
      let filter = "";
      let values: AcquisitionCostsInput | undefined;
      const query = {
        select(columns: string) {
          if (columns !== "*") throw new Error("Unexpected synthetic select.");
          return query;
        },
        eq(column: string, value: string) {
          if (column !== (method === "GET" ? "property_id" : "id"))
            throw new Error("Unexpected synthetic filter.");
          filter = value;
          return query;
        },
        update(input: AcquisitionCostsInput) {
          method = "UPDATE";
          values = clone(input);
          return query;
        },
        insert(input: AcquisitionCostsInput & { property_id: string }) {
          method = "INSERT";
          filter = input.property_id;
          const { property_id: _, ...rest } = input;
          values = rest;
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
    switchIdentity(next: Identity) {
      identity = next;
      listeners.forEach((fn) =>
        fn(
          next === "expired"
            ? "TOKEN_REFRESH_FAILED"
            : next === "anonymous"
              ? "SIGNED_OUT"
              : "SIGNED_IN",
          session(),
        ),
      );
      notify();
    },
    getIdentity: () => identity,
    inspect(property: PropertyName) {
      return clone(rows.get(properties[property].id) ?? null);
    },
    // Reset only via full document reload; pending completions are never silently replayed.
  };
}
export const synthetic = createSyntheticAdapter();
export const supabase = synthetic.client;
