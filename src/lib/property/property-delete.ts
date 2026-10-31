import type { QueryClient } from "@tanstack/react-query";
import type { PropertyRecord } from "./property-fields";

export type DeleteOutcome =
  | "idle"
  | "pending"
  | "not-sent"
  | "rejected"
  | "conflict"
  | "uncertain"
  | "acknowledged"
  | "deleted-refresh-failed"
  | "deleted";
export type DeleteAttempt = Readonly<{
  sequence: number;
  id: string;
  owner: string;
  original: Readonly<PropertyRecord>;
}>;
export type DeleteState = Readonly<{ outcome: DeleteOutcome; attempt?: DeleteAttempt }>;
export const deleteMessages: Record<DeleteOutcome, string> = {
  idle: "",
  pending: "Deletion is pending verification. Do not submit it again.",
  "not-sent":
    "Deletion was not sent. Check your account and any pending saves before confirming again.",
  rejected: "Deletion was explicitly rejected. The property was not deleted by this statement.",
  conflict:
    "Deletion matched no property. It may have changed or become unavailable. Close and reload before a new confirmation.",
  uncertain:
    "Deletion outcome is uncertain. It may have completed. Do not delete again. A read cannot confirm which operation completed.",
  acknowledged:
    "Deletion was acknowledged. Checking that the property is no longer available to this account.",
  "deleted-refresh-failed":
    "Deletion was acknowledged, but the follow-up check failed. Do not delete again. Use Check deletion to retry only the read.",
  deleted:
    "Property deletion confirmed for this account. Related financial information is no longer shown.",
};
export class PropertyDeleteError extends Error {
  constructor(readonly outcome: "not-sent" | "rejected" | "conflict" | "uncertain") {
    super(deleteMessages[outcome]);
    this.name = "PropertyDeleteError";
  }
}
let sequence = 0;
export function makeDeleteAttempt(owner: string, original: PropertyRecord): DeleteAttempt {
  return Object.freeze({
    sequence: ++sequence,
    id: original.id,
    owner,
    original: Object.freeze({ ...original }),
  });
}
export const deletionBlocksProperty = (outcome: DeleteOutcome) =>
  !["idle", "not-sent", "rejected", "conflict"].includes(outcome);

// Per-client memory, never browser storage. Cache clears cannot silently permit an
// uncertain DELETE again. Account keys keep old attempts private on account return.
const sessions = new WeakMap<QueryClient, Map<string, DeleteSession>>();
export class DeleteSession {
  private state: DeleteState = { outcome: "idle" };
  private listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private update(state: DeleteState) {
    this.state = Object.freeze(state);
    this.listeners.forEach((fn) => fn());
  }
  async run(attempt: DeleteAttempt, operation: () => Promise<void>, followup: () => Promise<void>) {
    if (!["idle", "not-sent", "rejected"].includes(this.state.outcome)) return;
    this.update({ outcome: "pending", attempt }); // Lock before the first await.
    try {
      await operation();
    } catch (error) {
      this.update({
        outcome: error instanceof PropertyDeleteError ? error.outcome : "uncertain",
        attempt,
      });
      return;
    }
    this.update({ outcome: "acknowledged", attempt });
    try {
      await followup();
      this.update({ outcome: "deleted", attempt });
    } catch {
      this.update({ outcome: "deleted-refresh-failed", attempt });
    }
  }
  async check(followup: () => Promise<void>) {
    if (this.state.outcome !== "deleted-refresh-failed") return;
    const attempt = this.state.attempt!;
    this.update({ outcome: "acknowledged", attempt });
    try {
      await followup();
      this.update({ outcome: "deleted", attempt });
    } catch {
      this.update({ outcome: "deleted-refresh-failed", attempt });
    }
  }
  reloadConflict() {
    if (this.state.outcome === "conflict") this.update({ outcome: "idle" });
  }
}
export function getDeleteSession(client: QueryClient, owner: string, id: string) {
  let entries = sessions.get(client);
  if (!entries) {
    entries = new Map();
    sessions.set(client, entries);
  }
  const key = JSON.stringify([owner, id]);
  let session = entries.get(key);
  if (!session) {
    session = new DeleteSession();
    entries.set(key, session);
  }
  return session;
}
export function propertyDeletionBlocked(client: QueryClient, owner: string, id: string) {
  return deletionBlocksProperty(getDeleteSession(client, owner, id).getSnapshot().outcome);
}
export const deletionReadKeys = (id: string) => [
  ["properties", id],
  ["acquisition-costs", id],
  ["financing", id],
  ["operating-expenses", id],
];
/** Query object identity survives await checks but is revoked by Auth cache clear. */
export function deleteCacheFence(client: QueryClient, attempt: DeleteAttempt) {
  const queryKey = ["delete-fence", attempt.owner, attempt.id] as const;
  const query = client.getQueryCache().build<unknown>(client, { queryKey, gcTime: Infinity });
  return () => client.getQueryCache().find({ queryKey, exact: true }) === query;
}
export async function cancelDeletionReads(client: QueryClient, id: string) {
  await Promise.all(
    [...deletionReadKeys(id), ["properties"]].map((queryKey) =>
      client.cancelQueries({ queryKey, exact: true }),
    ),
  );
}
export async function clearDeletedProperty(
  client: QueryClient,
  attempt: DeleteAttempt,
  current: () => boolean,
  confirmed: boolean,
) {
  if (!current()) throw Error("Expired deletion view");
  await cancelDeletionReads(client, attempt.id);
  if (!current()) throw Error("Expired deletion view");
  for (const queryKey of deletionReadKeys(attempt.id))
    client.removeQueries({ queryKey, exact: true });
  await client.invalidateQueries({ queryKey: ["properties"], exact: true, refetchType: "none" });
  if (!current()) throw Error("Expired deletion view");
  if (confirmed) {
    client.setQueryData(["properties", attempt.id], null);
    client.setQueryData<PropertyRecord[]>(["properties"], (rows) =>
      rows?.filter((row) => row.id !== attempt.id),
    );
  }
}
