import { parseEvidence, type SectionEvidence } from "./investment-evidence";
import {
  ACQUISITION_COST_FIELDS,
  calculateTotalAcquisitionCost,
  type AcquisitionCostField,
} from "@/lib/finance/acquisition";
import {
  acquisitionCostsSchema,
  acquisitionRecordToForm,
  emptyAcquisitionForm,
  type AcquisitionCostsFormValues,
  type AcquisitionCostsInput,
  type AcquisitionCostsRecord,
} from "./acquisition-fields";

export type AcquisitionFailure = "not-sent" | "rejected" | "conflict" | "uncertain";
export const ACQUISITION_FAILURE_MESSAGES = {
  "not-sent": "Acquisition costs were not sent. Review the draft and try again when available.",
  conflict: "This property changed in another session or is unavailable. Your draft is retained. Review saved values, then reload to start a new draft.",
  rejected:
    "The acquisition save was rejected. Review the draft and saved values before trying again.",
  uncertain:
    "The acquisition save outcome is unknown. Review saved values before deciding what to do. Do not assume the write succeeded or failed.",
} as const;
export const ACQUISITION_INVALID_MESSAGE =
  "Acquisition costs contain invalid amounts or exceed the supported numeric range.";

/** Only fixed messages reach mutation state/loggers; never retain the raw cause. */
export class AcquisitionSaveError extends Error {
  constructor(
    public readonly outcome: AcquisitionFailure,
    message:
      | typeof ACQUISITION_INVALID_MESSAGE
      | (typeof ACQUISITION_FAILURE_MESSAGES)[AcquisitionFailure] = ACQUISITION_FAILURE_MESSAGES[
      outcome
    ],
  ) {
    super(message);
    this.name = "AcquisitionSaveError";
  }
}

export function isAcquisitionRecord(
  value: unknown,
  propertyId: string,
): value is AcquisitionCostsRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as AcquisitionCostsRecord;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    row.property_id === propertyId &&
    ACQUISITION_COST_FIELDS.every(
      (field) => row[field] === null || typeof row[field] === "number",
    ) &&
    calculateTotalAcquisitionCost(row).status !== "invalid"
  );
}

export type AcquisitionAttempt = Readonly<{
  evidence?: SectionEvidence | null;
  revision: number | null;
  values: Readonly<AcquisitionCostsInput>;
  isCurrent: () => boolean;
}>;
type FieldErrors = Partial<Record<AcquisitionCostField, string>>;
type Outcome =
  "idle" | "invalid" | "pending" | "saved" | "saved-refresh-failed" | AcquisitionFailure;
export interface AcquisitionEditorState {
  evidence: unknown;
  evidenceDirty: boolean;
  revision: number | null;
  active: boolean;
  editing: boolean;
  baseline: Readonly<AcquisitionCostsRecord> | null;
  values: Readonly<AcquisitionCostsFormValues>;
  errors: FieldErrors;
  outcome: Outcome;
  reviewing: boolean;
  review: "none" | "available" | "failed";
  reviewed: Readonly<AcquisitionCostsRecord> | null;
}
interface Ports {
  save: (attempt: AcquisitionAttempt) => Promise<AcquisitionCostsRecord>;
  acknowledge: (row: AcquisitionCostsRecord, isCurrent: () => boolean) => Promise<void>;
  refresh: (isCurrent: () => boolean) => Promise<AcquisitionCostsRecord | null>;
}
const copyRow = (row: AcquisitionCostsRecord | null) => (row ? Object.freeze({ ...row }) : null);
const initial = (active = true): AcquisitionEditorState => ({
  active,
  editing: false,
  baseline: null,
  evidence: null,
  evidenceDirty: false,
  revision: null,
  values: Object.freeze({ ...emptyAcquisitionForm }),
  errors: {},
  outcome: "idle",
  reviewing: false,
  review: "none",
  reviewed: null,
});

/** In-memory state for one mounted identity/property editor. Revision stays attached to the original baseline. */
export function createAcquisitionEditor(propertyId: string, ports: Ports) {
  let state = initial();
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: AcquisitionEditorState) => {
    state = next;
    listeners.forEach((notify) => notify());
  };
  const busy = () => state.outcome === "pending" || state.reviewing;
  const current = (attempt: number) => () => state.active && generation === attempt;

  async function reviewSaved(isCurrent: () => boolean, afterSave: boolean) {
    try {
      const row = await ports.refresh(isCurrent);
      if (!isCurrent()) return;
      if (row !== null && !isAcquisitionRecord(row, propertyId))
        throw new Error("Invalid acquisition read");
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
    open(row: AcquisitionCostsRecord | null, revision: number | null = null) {
      if (!state.active || busy()) return;
      generation++;
      publish({
        ...initial(),
        editing: true,
        baseline: copyRow(row),
        evidence: structuredClone(row?.evidence_metadata ?? null),
        evidenceDirty: false,
        revision,
        values: Object.freeze(acquisitionRecordToForm(row)),
      });
    },
    change(field: AcquisitionCostField, value: string) {
      if (!state.active || !state.editing || busy()) return;
      publish({
        ...state,
        values: Object.freeze({ ...state.values, [field]: value }),
        errors: {},
        outcome: state.outcome === "uncertain" || state.outcome === "conflict" ? state.outcome : "idle",
      });
    },
    changeEvidence(evidence: SectionEvidence) {
      if (!state.active || !state.editing || busy() || state.outcome === "uncertain" || state.outcome === "conflict") return;
      const parsedEvidence = parseEvidence("acquisition_costs", evidence);
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
      const parsed = acquisitionCostsSchema.safeParse(state.values);
      if (!parsed.success) {
        const errors: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as AcquisitionCostField;
          if (ACQUISITION_COST_FIELDS.includes(field) && !errors[field])
            errors[field] = issue.message;
        }
        publish({ ...state, errors, outcome: "invalid" });
        return;
      }
      if (calculateTotalAcquisitionCost(parsed.data).status === "invalid") {
        publish({ ...state, errors: {}, outcome: "invalid" });
        return;
      }
      const isCurrent = current(++generation);
      const evidence = state.evidenceDirty ? parseEvidence("acquisition_costs", state.evidence) : undefined;
      const attempt = Object.freeze({ ...(evidence !== undefined ? { evidence } : {}), revision: state.revision, values: Object.freeze({ ...parsed.data }), isCurrent });
      // Synchronous lock, before the first promise, also blocks same-tick double clicks.
      publish({ ...state, errors: {}, outcome: "pending", review: "none", reviewed: null });
      let row: AcquisitionCostsRecord;
      try {
        row = await ports.save(attempt);
        if (!isCurrent()) return;
        if (!isAcquisitionRecord(row, propertyId)) throw new AcquisitionSaveError("uncertain");
      } catch (error) {
        if (!isCurrent()) return;
        const outcome = error instanceof AcquisitionSaveError ? error.outcome : "uncertain";
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
        values: Object.freeze(acquisitionRecordToForm(row)),
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
