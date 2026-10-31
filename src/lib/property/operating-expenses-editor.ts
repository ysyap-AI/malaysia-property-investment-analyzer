import { parseEvidence, type SectionEvidence } from "./investment-evidence";
import {
  OPERATING_EXPENSE_FIELDS,
  calculateTotalAnnualOperatingExpenses,
  type OperatingExpenseField,
} from "@/lib/finance/operating-expenses";
import {
  operatingExpensesSchema,
  annualiseInput,
  defaultOperatingExpenseBases,
  type OperatingExpenseBases,
  type EntryBasis,
  operatingExpenseRecordToForm,
  emptyOperatingExpenseForm,
  type OperatingExpensesFormValues,
  type OperatingExpensesInput,
  type OperatingExpensesRecord,
} from "./operating-expense-fields";

export type OperatingExpensesFailure = "not-sent" | "rejected" | "conflict" | "uncertain";
export const OPERATING_EXPENSES_FAILURE_MESSAGES = {
  "not-sent": "Operating expenses were not sent. Review the draft and try again when available.",
  conflict: "This property changed in another session or is unavailable. Your draft is retained. Review saved values, then reload to start a new draft.",
  rejected:
    "The operating-expenses save was rejected. Review the draft and saved values before trying again.",
  uncertain:
    "The operating-expenses save outcome is unknown. Review saved values before deciding what to do. Do not assume the write succeeded or failed.",
} as const;
export const OPERATING_EXPENSES_INVALID_MESSAGE =
  "Operating expenses contain invalid amounts or exceed the supported numeric range.";

/** Only fixed messages reach mutation state/loggers; never retain the raw cause. */
export class OperatingExpensesSaveError extends Error {
  constructor(
    public readonly outcome: OperatingExpensesFailure,
    message:
      | typeof OPERATING_EXPENSES_INVALID_MESSAGE
      | (typeof OPERATING_EXPENSES_FAILURE_MESSAGES)[OperatingExpensesFailure] = OPERATING_EXPENSES_FAILURE_MESSAGES[
      outcome
    ],
  ) {
    super(message);
    this.name = "OperatingExpensesSaveError";
  }
}

export function isOperatingExpensesRecord(
  value: unknown,
  propertyId: string,
): value is OperatingExpensesRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as OperatingExpensesRecord;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    row.property_id === propertyId &&
    OPERATING_EXPENSE_FIELDS.every(
      (field) => row[field] === null || typeof row[field] === "number",
    ) &&
    calculateTotalAnnualOperatingExpenses(row).status !== "invalid"
  );
}

/** Complete annual payloads only: missing fields must be explicit nulls. */
export function isOperatingExpensesInput(value: unknown): value is OperatingExpensesInput {
  if (!value || typeof value !== "object") return false;
  const input = value as OperatingExpensesInput;
  return (
    OPERATING_EXPENSE_FIELDS.every(
      (field) => input[field] === null || typeof input[field] === "number",
    ) && calculateTotalAnnualOperatingExpenses(input).status !== "invalid"
  );
}

export function matchesOperatingExpensesRow(
  value: unknown,
  propertyId: string,
  submitted: Readonly<OperatingExpensesInput>,
): value is OperatingExpensesRecord {
  return (
    isOperatingExpensesRecord(value, propertyId) &&
    OPERATING_EXPENSE_FIELDS.every((field) => value[field] === submitted[field])
  );
}

export type OperatingExpensesAttempt = Readonly<{
  evidence?: SectionEvidence | null;
  revision: number | null;
  values: Readonly<OperatingExpensesInput>;
  isCurrent: () => boolean;
}>;
type FieldErrors = Partial<Record<OperatingExpenseField, string>>;
type Outcome =
  "idle" | "invalid" | "pending" | "saved" | "saved-refresh-failed" | OperatingExpensesFailure;
export interface OperatingExpensesEditorState {
  evidence: unknown;
  evidenceDirty: boolean;
  revision: number | null;
  active: boolean;
  editing: boolean;
  baseline: Readonly<OperatingExpensesRecord> | null;
  values: Readonly<OperatingExpensesFormValues>;
  bases: Readonly<OperatingExpenseBases>;
  errors: FieldErrors;
  outcome: Outcome;
  reviewing: boolean;
  review: "none" | "available" | "failed";
  reviewed: Readonly<OperatingExpensesRecord> | null;
}
interface Ports {
  save: (attempt: OperatingExpensesAttempt) => Promise<OperatingExpensesRecord>;
  acknowledge: (row: OperatingExpensesRecord, isCurrent: () => boolean) => Promise<void>;
  refresh: (isCurrent: () => boolean) => Promise<OperatingExpensesRecord | null>;
}
const copyRow = (row: OperatingExpensesRecord | null) => (row ? Object.freeze({ ...row }) : null);
const initial = (active = true): OperatingExpensesEditorState => ({
  active,
  editing: false,
  baseline: null,
  evidence: null,
  evidenceDirty: false,
  revision: null,
  values: Object.freeze({ ...emptyOperatingExpenseForm }),
  bases: Object.freeze({ ...defaultOperatingExpenseBases }),
  errors: {},
  outcome: "idle",
  reviewing: false,
  review: "none",
  reviewed: null,
});

/** In-memory state for one mounted identity/property editor. Revision stays attached to the original baseline. */
export function createOperatingExpensesEditor(propertyId: string, ports: Ports) {
  let state = initial();
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: OperatingExpensesEditorState) => {
    state = next;
    listeners.forEach((notify) => notify());
  };
  const busy = () => state.outcome === "pending" || state.reviewing;
  const current = (attempt: number) => () => state.active && generation === attempt;

  async function reviewSaved(isCurrent: () => boolean, afterSave: boolean) {
    try {
      const row = await ports.refresh(isCurrent);
      if (!isCurrent()) return;
      if (row !== null && !isOperatingExpensesRecord(row, propertyId))
        throw new Error("Invalid operating-expenses read");
      publish({
        ...state,
        reviewing: false,
        review: "available",
        reviewed: copyRow(row),
        outcome: afterSave ? "saved" : state.outcome,
      });
    } catch {
      if (!isCurrent()) return;
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
      // React Strict Mode may set up the same effect again after cleanup.
      if (!state.active) publish(initial());
    },
    dispose() {
      generation++;
      publish(initial(false));
    },
    open(row: OperatingExpensesRecord | null, revision: number | null = null) {
      if (!state.active || state.editing || busy()) return;
      if (row !== null && !isOperatingExpensesRecord(row, propertyId)) return;
      generation++;
      publish({
        ...initial(),
        editing: true,
        baseline: copyRow(row),
        evidence: structuredClone(row?.evidence_metadata ?? null),
        evidenceDirty: false,
        revision,
        values: Object.freeze(operatingExpenseRecordToForm(row)),
      });
    },
    change(field: OperatingExpenseField, value: string) {
      if (!state.active || !state.editing || busy()) return;
      publish({
        ...state,
        values: Object.freeze({ ...state.values, [field]: value }),
        errors: {},
        outcome: state.outcome === "uncertain" || state.outcome === "conflict" ? state.outcome : "idle",
      });
    },
    changeBasis(field: OperatingExpenseField, basis: EntryBasis) {
      if (!state.active || !state.editing || busy()) return;
      if (basis !== "annual" && basis !== "monthly") return;
      publish({
        ...state,
        bases: Object.freeze({ ...state.bases, [field]: basis }),
        errors: {},
        outcome: state.outcome === "uncertain" || state.outcome === "conflict" ? state.outcome : "idle",
      });
    },
    changeEvidence(evidence: SectionEvidence) {
      if (!state.active || !state.editing || busy() || state.outcome === "uncertain" || state.outcome === "conflict") return;
      const parsedEvidence = parseEvidence("operating_expenses", evidence);
      publish({ ...state, evidence: parsedEvidence, evidenceDirty: true, outcome: "idle" });
    },
    cancel() {
      if (!state.active || busy()) return;
      generation++;
      publish(initial());
    },
    async review() {
      if (!state.active || !state.editing || busy()) return;
      const isCurrent = current(++generation);
      publish({ ...state, reviewing: true, review: "none", reviewed: null });
      await reviewSaved(
        isCurrent,
        state.outcome === "saved" || state.outcome === "saved-refresh-failed",
      );
    },
    async submit() {
      if (!state.active || !state.editing || busy() || state.outcome === "uncertain" || state.outcome === "conflict") return;
      const parsed = operatingExpensesSchema.safeParse(state.values);
      if (!parsed.success) {
        const errors: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as OperatingExpenseField;
          if (OPERATING_EXPENSE_FIELDS.includes(field) && !errors[field])
            errors[field] = issue.message;
        }
        publish({ ...state, errors, outcome: "invalid" });
        return;
      }
      // Convert once, through the existing shared engine, before freezing the annual payload.
      const annual = annualiseInput(parsed.data, state.bases);
      if (calculateTotalAnnualOperatingExpenses(annual).status === "invalid") {
        publish({ ...state, errors: {}, outcome: "invalid" });
        return;
      }
      const isCurrent = current(++generation);
      const evidence = state.evidenceDirty ? parseEvidence("operating_expenses", state.evidence) : undefined;
      const attempt = Object.freeze({ ...(evidence !== undefined ? { evidence } : {}), revision: state.revision, values: Object.freeze({ ...annual }), isCurrent });
      // Synchronous lock, before the first promise, also blocks same-tick double clicks.
      publish({ ...state, errors: {}, outcome: "pending", review: "none", reviewed: null });
      let row: OperatingExpensesRecord;
      try {
        row = await ports.save(attempt);
        if (!isCurrent()) return;
        if (!matchesOperatingExpensesRow(row, propertyId, attempt.values))
          throw new OperatingExpensesSaveError("uncertain");
      } catch (error) {
        if (!isCurrent()) return;
        const outcome = error instanceof OperatingExpensesSaveError ? error.outcome : "uncertain";
        publish({ ...state, outcome });
        return;
      }
      // A returned row confirms this section's write. Later cache/read failures cannot undo that fact.
      publish({
        ...state,
        baseline: copyRow(row),
        evidence: structuredClone(row?.evidence_metadata ?? null),
        evidenceDirty: false,
        revision: state.revision === null ? null : state.revision + 1,
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
