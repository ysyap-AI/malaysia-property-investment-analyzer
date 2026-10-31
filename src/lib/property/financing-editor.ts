import { parseEvidence, type SectionEvidence } from "./investment-evidence";
import { isSafeFinancialNumber } from "@/lib/finance/rounding";
import {
  buildFinancingRow,
  emptyFinancingForm,
  financingRecordToForm,
  financingSchema,
  type FinancingFormValues,
  type FinancingRecord,
  type FinancingRow,
} from "./financing-fields";

export type FinancingFailure = "not-sent" | "rejected" | "conflict" | "uncertain";
export const FINANCING_FAILURE_MESSAGES = {
  "not-sent":
    "Financing was not sent. Review the draft and current purchase price before trying again.",
  conflict: "This property changed in another session or is unavailable. Your draft is retained. Review saved values, then reload to start a new draft.",
  rejected:
    "The financing save was rejected. Review the draft and saved values before trying again.",
  uncertain:
    "The financing save outcome is unknown. Review saved values before deciding what to do. Do not assume the write succeeded or failed.",
} as const;
/** Retain only fixed classifications, never backend causes, payloads or messages. */
export class FinancingSaveError extends Error {
  constructor(public readonly outcome: FinancingFailure) {
    super(FINANCING_FAILURE_MESSAGES[outcome]);
    this.name = "FinancingSaveError";
  }
}

export function isFinancingRow(value: unknown): value is FinancingRow {
  if (!value || typeof value !== "object") return false;
  const row = value as FinancingRow;
  const parsed = financingSchema.safeParse(row);
  return (
    parsed.success &&
    Object.entries(parsed.data).every(([key, v]) => {
      const raw = row[key as keyof FinancingRow];
      // Existing text may contain spacing; retain it when opening a saved draft.
      if (key === "loan_type" || key === "financing_notes")
        return raw === null || typeof raw === "string";
      return raw === v;
    }) &&
    [row.down_payment, row.calculated_monthly_instalment].every(
      (v) => v === null || (isSafeFinancialNumber(v) && v >= 0),
    )
  );
}
/** Full current financing representation; legacy nullable columns are preserved, not interpreted. */
export function isFinancingRecord(value: unknown, propertyId: string): value is FinancingRecord {
  if (!isFinancingRow(value)) return false;
  const row = value as FinancingRecord;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    row.property_id === propertyId &&
    [row.created_at, row.updated_at].every(
      (v) => typeof v === "string" && Number.isFinite(Date.parse(v)),
    ) &&
    [row.deposit_amount, row.deposit_percent, row.interest_rate_percent, row.purchase_price].every(
      (v) => v === null || (typeof v === "number" && Number.isFinite(v)),
    )
  );
}
export function matchesFinancingRow(
  value: unknown,
  propertyId: string,
  submitted: FinancingRow,
): value is FinancingRecord {
  return (
    isFinancingRecord(value, propertyId) &&
    Object.entries(submitted).every(([key, v]) => value[key as keyof FinancingRow] === v)
  );
}

export type PriceContext = Readonly<{
  status: "available" | "missing" | "unavailable";
  price: number | null;
}>;
export function financingPriceContext(price: unknown, readAvailable: boolean): PriceContext {
  if (!readAvailable) return { status: "unavailable", price: null };
  if (price === null || price === undefined) return { status: "missing", price: null };
  return isSafeFinancialNumber(price) && price >= 0
    ? { status: "available", price }
    : { status: "unavailable", price: null };
}
const sameContext = (a: PriceContext, b: PriceContext) =>
  a.status === b.status && a.price === b.price;
export type FinancingAttempt = Readonly<{
  evidence?: SectionEvidence | null;
  revision: number | null;
  values: Readonly<FinancingRow>;
  context: PriceContext;
  isCurrent: () => boolean;
  canDispatch: () => boolean;
}>;
type Outcome = "idle" | "invalid" | "pending" | "saved" | "saved-refresh-failed" | FinancingFailure;
interface FinancingEditorState {
  evidence: unknown;
  evidenceDirty: boolean;
  revision: number | null;
  active: boolean;
  editing: boolean;
  baseline: Readonly<FinancingRecord> | null;
  values: Readonly<FinancingFormValues>;
  errors: Partial<Record<keyof FinancingFormValues, string>>;
  context: PriceContext;
  contextChanged: boolean;
  outcome: Outcome;
  reviewing: boolean;
  review: "none" | "available" | "failed";
  reviewed: Readonly<FinancingRecord> | null;
}
interface Ports {
  context: () => PriceContext;
  save: (attempt: FinancingAttempt) => Promise<FinancingRecord>;
  acknowledge: (row: FinancingRecord, isCurrent: () => boolean) => Promise<void>;
  refresh: (isCurrent: () => boolean) => Promise<FinancingRecord | null>;
}
const copyRow = (row: FinancingRecord | null) => (row ? Object.freeze({ ...row }) : null);
const initial = (active = true): FinancingEditorState => ({
  active,
  editing: false,
  baseline: null,
  evidence: null,
  evidenceDirty: false,
  revision: null,
  values: Object.freeze({ ...emptyFinancingForm }),
  errors: {},
  context: Object.freeze({ status: "unavailable", price: null }),
  contextChanged: false,
  outcome: "idle",
  reviewing: false,
  review: "none",
  reviewed: null,
});

/** One open financing editor only. No durable storage, retry or automatic merge. */
export function createFinancingEditor(propertyId: string, ports: Ports) {
  let state = initial();
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: FinancingEditorState) => {
    state = next;
    listeners.forEach((notify) => notify());
  };
  const busy = () => state.outcome === "pending" || state.reviewing;
  const current = (attempt: number) => () => state.active && generation === attempt;
  const observeContext = () => {
    if (
      state.active &&
      state.editing &&
      !sameContext(state.context, ports.context()) &&
      !state.contextChanged
    )
      publish({ ...state, contextChanged: true });
  };
  async function reviewSaved(isCurrent: () => boolean, afterSave: boolean) {
    try {
      const row = await ports.refresh(isCurrent);
      if (!isCurrent()) return;
      if (row !== null && !isFinancingRecord(row, propertyId))
        throw new Error("Invalid financing read");
      publish({
        ...state,
        reviewing: false,
        review: "available",
        reviewed: copyRow(row),
        outcome: afterSave ? "saved" : state.outcome,
      });
    } catch {
      if (isCurrent())
        publish({
          ...state,
          reviewing: false,
          review: "failed",
          outcome: afterSave ? "saved-refresh-failed" : state.outcome,
        });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(notify: () => void) {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    activate() {
      if (!state.active) publish(initial());
    },
    dispose() {
      generation++;
      publish(initial(false));
    },
    observeContext,
    open(row: FinancingRecord | null, revision: number | null = null) {
      if (!state.active || busy() || (row !== null && !isFinancingRecord(row, propertyId))) return;
      generation++;
      publish({
        ...initial(),
        editing: true,
        baseline: copyRow(row),
        evidence: structuredClone(row?.evidence_metadata ?? null),
        evidenceDirty: false,
        revision,
        values: Object.freeze(financingRecordToForm(row)),
        context: Object.freeze({ ...ports.context() }),
      });
    },
    change<K extends keyof FinancingFormValues>(field: K, value: FinancingFormValues[K]) {
      if (!state.active || !state.editing || busy()) return;
      publish({
        ...state,
        values: Object.freeze({ ...state.values, [field]: value }),
        errors: {},
        outcome: state.outcome === "uncertain" || state.outcome === "conflict" ? state.outcome : "idle",
      });
    },
    adoptPrice() {
      if (!state.active || !state.editing || busy() || ports.context().status !== "available")
        return;
      publish({ ...state, context: Object.freeze({ ...ports.context() }), contextChanged: false });
    },
    changeEvidence(evidence: SectionEvidence) {
      if (!state.active || !state.editing || busy() || state.outcome === "uncertain" || state.outcome === "conflict") return;
      const parsedEvidence = parseEvidence("financing", evidence);
      publish({ ...state, evidence: parsedEvidence, evidenceDirty: true, outcome: "idle" });
    },
    cancel() {
      if (state.active && !busy()) {
        generation++;
        publish(initial());
      }
    },
    async review() {
      if (!state.active || !state.editing || busy()) return;
      const isCurrent = current(++generation);
      const afterSave = state.outcome === "saved" || state.outcome === "saved-refresh-failed";
      publish({ ...state, reviewing: true, review: "none", reviewed: null });
      await reviewSaved(isCurrent, afterSave);
    },
    async submit() {
      observeContext();
      if (
        !state.active ||
        !state.editing ||
        busy() ||
        state.outcome === "uncertain" || state.outcome === "conflict" ||
        state.contextChanged ||
        state.context.status === "unavailable"
      )
        return;
      const parsed = financingSchema.safeParse(state.values);
      if (!parsed.success) {
        const errors: FinancingEditorState["errors"] = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as keyof FinancingFormValues;
          if (field in emptyFinancingForm && !errors[field]) errors[field] = issue.message;
        }
        publish({ ...state, errors, outcome: "invalid" });
        return;
      }
      const values = Object.freeze(buildFinancingRow(parsed.data, state.context.price));
      if (!isFinancingRow(values)) {
        publish({ ...state, errors: {}, outcome: "invalid" });
        return;
      }
      const isCurrent = current(++generation);
      const context = state.context;
      const canDispatch = () => {
        observeContext();
        return isCurrent() && !state.contextChanged && sameContext(context, ports.context());
      };
      const evidence = state.evidenceDirty ? parseEvidence("financing", state.evidence) : undefined;
      const attempt = Object.freeze({ ...(evidence !== undefined ? { evidence } : {}), values, context, isCurrent, canDispatch, revision: state.revision });
      // Lock synchronously before mutation scheduling or the first awaited promise.
      publish({ ...state, errors: {}, outcome: "pending", review: "none", reviewed: null });
      let row: FinancingRecord;
      try {
        row = await ports.save(attempt);
        if (!isCurrent()) return;
        observeContext();
        if (!matchesFinancingRow(row, propertyId, values))
          throw new FinancingSaveError("uncertain");
      } catch (error) {
        if (isCurrent())
          publish({
            ...state,
            outcome: error instanceof FinancingSaveError ? error.outcome : "uncertain",
          });
        return;
      }
      publish({
        ...state,
        baseline: copyRow(row),
        evidence: structuredClone(row?.evidence_metadata ?? null),
        evidenceDirty: false,
        revision: state.revision === null ? null : state.revision + 1,
        values: Object.freeze(financingRecordToForm(row)),
        outcome: "saved",
        reviewing: true,
      });
      try {
        await ports.acknowledge(row, isCurrent);
      } catch {
        if (isCurrent())
          publish({
            ...state,
            reviewing: false,
            outcome: "saved-refresh-failed",
            review: "failed",
          });
        return;
      }
      if (isCurrent()) await reviewSaved(isCurrent, true);
    },
  };
}
