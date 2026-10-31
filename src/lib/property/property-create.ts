import type { QueryClient } from "@tanstack/react-query";
import type { PropertyFormValues, PropertyInput, PropertyRecord } from "./property-fields";

export type CreateOutcome =
  | "idle"
  | "pending"
  | "not-sent"
  | "rejected"
  | "uncertain"
  | "acknowledged"
  | "created-refresh-failed"
  | "created";
export type CreateAttempt = Readonly<{
  owner: string;
  values: Readonly<PropertyInput>;
  draft: Readonly<PropertyFormValues>;
}>;
export class PropertyCreateError extends Error {
  constructor(readonly outcome: "not-sent" | "rejected" | "uncertain") {
    super(
      {
        "not-sent":
          "Creation was not sent. Your exact draft is kept. Check your account before trying deliberately again.",
        rejected:
          "Creation was explicitly rejected. Your exact draft is kept. Review it before trying again.",
        uncertain:
          "Creation outcome is uncertain. Your submitted draft is kept for review. Do not create it again: the request may have committed. A matching list entry cannot confirm this operation.",
      }[outcome],
    );
    this.name = "PropertyCreateError";
  }
}
export type CreateState = Readonly<{
  outcome: CreateOutcome;
  draft?: Readonly<PropertyFormValues>;
  attempt?: CreateAttempt;
  row?: PropertyRecord;
}>;
/** In-memory, owner-scoped recovery only. Survives route remount and cache clear,
 * but not a browser/process restart. Never serialized to browser storage. */
const sessions = new WeakMap<QueryClient, Map<string, CreateSession>>();
export class CreateSession {
  private state: CreateState = { outcome: "idle" };
  private listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private update(state: CreateState) {
    this.state = Object.freeze(state);
    this.listeners.forEach((fn) => fn());
  }
  draft(values: PropertyFormValues) {
    if (["idle", "not-sent", "rejected"].includes(this.state.outcome))
      this.update({ ...this.state, draft: Object.freeze({ ...values }) });
  }
  async run(
    owner: string,
    values: PropertyInput,
    draft: PropertyFormValues,
    operation: (attempt: CreateAttempt) => Promise<PropertyRecord>,
    followup: (row: PropertyRecord) => Promise<unknown>,
    isCurrent: () => boolean,
  ) {
    if (!["idle", "not-sent", "rejected"].includes(this.state.outcome)) return;
    const attempt = Object.freeze({
      owner,
      values: Object.freeze({ ...values }),
      draft: Object.freeze({ ...draft }),
    });
    // Synchronous lock before the first async identity/transport operation.
    this.update({ outcome: "pending", draft: attempt.draft, attempt });
    let row: PropertyRecord;
    try {
      row = await operation(attempt);
    } catch (error) {
      this.update({
        outcome: error instanceof PropertyCreateError ? error.outcome : "uncertain",
        draft: attempt.draft,
        attempt,
      });
      return;
    }
    this.update({ outcome: "acknowledged", draft: attempt.draft, attempt, row });
    try {
      if (!isCurrent()) throw Error("Expired create view");
      await followup(row);
      if (!isCurrent()) throw Error("Expired create view");
      this.update({ outcome: "created", draft: attempt.draft, attempt, row });
    } catch {
      this.update({ outcome: "created-refresh-failed", draft: attempt.draft, attempt, row });
    }
  }
  fresh() {
    if (this.state.outcome === "created") this.update({ outcome: "idle" });
  }
  navigationFailed() {
    if (this.state.row) this.update({ ...this.state, outcome: "created-refresh-failed" });
  }
  reviewed() {
    if (this.state.row) this.update({ ...this.state, outcome: "created" });
  }
}
export function getCreateSession(client: QueryClient, owner: string) {
  let owners = sessions.get(client);
  if (!owners) {
    owners = new Map();
    sessions.set(client, owners);
  }
  let session = owners.get(owner);
  if (!session) {
    session = new CreateSession();
    owners.set(owner, session);
  }
  return session;
}
