import type { QueryClient } from "@tanstack/react-query";
import type { PropertyPatch, PropertyRecord } from "./property-fields";
import { propertyDeletionBlocked } from "./property-delete";

export type ParentOutcome =
  | "idle"
  | "pending"
  | "not-sent"
  | "rejected"
  | "conflict"
  | "uncertain"
  | "acknowledged"
  | "saved"
  | "saved-refresh-failed";
export type PropertyEditAttempt = Readonly<{
  sequence: number;
  id: string;
  owner: string;
  original: Readonly<PropertyRecord>;
  patch: Readonly<PropertyPatch>;
}>;
export type ParentConfirmation = Readonly<{
  outcome: ParentOutcome;
  attempt?: PropertyEditAttempt;
}>;
export const parentConfirmationKey = (owner: string | null, id: string) =>
  ["parent-confirmation", owner, id] as const;
export const parentBlocksAnalysis = (outcome?: ParentOutcome) =>
  ["pending", "uncertain", "acknowledged", "saved-refresh-failed"].includes(outcome ?? "");
export class PropertyEditError extends Error {
  constructor(readonly outcome: "not-sent" | "rejected" | "conflict" | "uncertain") {
    super(
      {
        "not-sent":
          "Save was not sent. Your draft is kept. Check your account and try deliberately again.",
        rejected: "Save was rejected. Your draft is kept. Review your changes before trying again.",
        conflict:
          "This property changed or is unavailable. Your draft is kept for review. Cancel and reopen to start a fresh edit.",
        uncertain:
          "Save outcome is uncertain. Your draft is kept for read-only review. Do not retry this write. A matching saved value cannot confirm this attempt.",
      }[outcome],
    );
    this.name = "PropertyEditError";
  }
}
let sequence = 0;
export function makePropertyAttempt(
  owner: string,
  original: PropertyRecord,
  patch: PropertyPatch,
): PropertyEditAttempt {
  return Object.freeze({
    sequence: ++sequence,
    id: original.id,
    owner,
    original: Object.freeze({ ...original }),
    patch: Object.freeze({ ...patch }),
  });
}
/** Query identity fences callbacks after logout/cache clear, including key recreation. */
export async function runParentSave(
  client: QueryClient,
  attempt: PropertyEditAttempt,
  operation: () => Promise<PropertyRecord>,
  refresh: (isCurrent: () => boolean) => Promise<unknown>,
) {
  if (propertyDeletionBlocked(client, attempt.owner, attempt.id)) return;
  const queryKey = parentConfirmationKey(attempt.owner, attempt.id);
  const query = client.getQueryCache().build<ParentConfirmation>(client, {
    queryKey,
    gcTime: Infinity,
    initialData: { outcome: "idle" },
  });
  if (["pending", "uncertain", "acknowledged"].includes(query.state.data?.outcome ?? "")) return;
  const current = () =>
    client.getQueryCache().find({ queryKey, exact: true }) === query &&
    query.state.data?.attempt?.sequence === attempt.sequence;
  const update = (outcome: ParentOutcome) => {
    if (current()) query.setData({ outcome, attempt });
  };
  query.setData({ outcome: "pending", attempt });
  let row: PropertyRecord;
  try {
    row = await operation();
  } catch (error) {
    update(error instanceof PropertyEditError ? error.outcome : "uncertain");
    return;
  }
  if (!current()) return;
  // Acknowledgment and refresh are separate; refresh failure never becomes write failure.
  update("acknowledged");
  try {
    await client.cancelQueries({ queryKey: ["properties", attempt.id], exact: true });
    if (!current()) return;
    client.setQueryData(["properties", attempt.id], row);
    await refresh(current);
    update("saved");
  } catch {
    update("saved-refresh-failed");
  }
}
