import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { propertyDeletionBlocked } from "./property-delete";

export type FinancialSection = "acquisition" | "financing" | "expenses" | "propertyEvidence";
export type WriteOutcome =
  | "pending"
  | "not-sent"
  | "rejected"
  | "conflict"
  | "uncertain"
  | "acknowledged"
  | "saved-refresh-failed"
  | "saved";
type SectionState = Readonly<{ generation: number; outcome: WriteOutcome }>;
export type FinancialConfirmation = Partial<Record<FinancialSection, SectionState>>;
export const confirmationKey = (identityId: string | null, propertyId: string) =>
  ["financial-confirmation", identityId, propertyId] as const;
export const financialReadKey = (section: FinancialSection, propertyId: string) =>
  [
    section === "propertyEvidence" ? "properties" : section === "acquisition"
      ? "acquisition-costs"
      : section === "financing"
        ? "financing"
        : "operating-expenses",
    propertyId,
  ] as const;

export function writeBlocksCurrent(outcome?: WriteOutcome) {
  return (
    outcome === "pending" ||
    outcome === "uncertain" ||
    outcome === "acknowledged" ||
    outcome === "saved-refresh-failed"
  );
}

/** Status only, owned by this QueryClient. Never infer commit from a matching read. */
export async function trackFinancialWrite<T>(
  client: QueryClient,
  identityId: string,
  propertyId: string,
  section: FinancialSection,
  operation: () => Promise<T>,
): Promise<T> {
  if (propertyDeletionBlocked(client, identityId, propertyId))
    throw Object.assign(new Error("Property deletion requires review. This save was not sent."), {
      outcome: "not-sent",
    });
  const queryKey = confirmationKey(identityId, propertyId);
  const query = client.getQueryCache().build<FinancialConfirmation>(client, {
    queryKey,
    gcTime: Infinity,
    initialData: {},
  });
  const previous = query.state.data?.[section];
  if (["pending", "uncertain", "acknowledged"].includes(previous?.outcome ?? ""))
    throw new Error("This section is awaiting save confirmation.");
  const generation = (previous?.generation ?? 0) + 1;
  const current = () =>
    client.getQueryCache().find({ queryKey, exact: true }) === query &&
    query.state.data?.[section]?.generation === generation;
  const update = (outcome: WriteOutcome) => {
    if (current()) query.setData({ ...query.state.data, [section]: { generation, outcome } });
  };
  query.setData({ ...query.state.data, [section]: { generation, outcome: "pending" } });
  const readKey = financialReadKey(section, propertyId);
  let readingAfterAcknowledgment = false;
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (!current()) {
      unsubscribe();
      return;
    }
    if (
      event.type !== "updated" ||
      JSON.stringify(event.query.queryKey) !== JSON.stringify(readKey)
    )
      return;
    const outcome = query.state.data?.[section]?.outcome;
    if (outcome !== "acknowledged" && outcome !== "saved-refresh-failed") return;
    if (event.action.type === "fetch") readingAfterAcknowledgment = true;
    if (readingAfterAcknowledgment && event.action.type === "success" && !event.action.manual) {
      update("saved");
      unsubscribe();
    }
    if (readingAfterAcknowledgment && event.action.type === "error") {
      readingAfterAcknowledgment = false;
      update("saved-refresh-failed");
    }
  });
  let row: T;
  try {
    row = await operation();
  } catch (error) {
    const outcome =
      error && typeof error === "object" && "outcome" in error ? error.outcome : "uncertain";
    update(outcome === "not-sent" || outcome === "rejected" || outcome === "conflict" ? outcome : "uncertain");
    unsubscribe();
    throw error;
  }
  if (current()) {
    // Only a network read begun after acknowledgment can qualify this write.
    // Cache maintenance failures cannot turn an acknowledged write into failure.
    update("acknowledged");
    try {
      await client.cancelQueries({ queryKey: ["properties"] });
      if (current()) await client.invalidateQueries({ queryKey: ["properties"] });
      await client.cancelQueries({ queryKey: readKey, exact: true });
      if (current())
        await client.invalidateQueries({ queryKey: readKey, exact: true, refetchType: "none" });
    } catch {
      update("saved-refresh-failed");
    }
  }
  return row;
}

export type RequiredRead = {
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  isPending?: boolean;
  fetchStatus?: string;
};
export function financialAvailability(
  identityReady: boolean,
  writes: FinancialConfirmation,
  reads: RequiredRead[],
  invalidated: boolean,
) {
  if (!identityReady) return { current: false, reason: "Account information is unavailable." };
  if (Object.values(writes).some((state) => writeBlocksCurrent(state.outcome)))
    return {
      current: false,
      reason: "Financial save confirmation is pending, uncertain or awaiting a successful refresh.",
    };
  if (reads.some((read) => read.isError))
    return { current: false, reason: "Required saved information could not be loaded." };
  if (
    invalidated ||
    reads.some(
      (read) =>
        read.isLoading ||
        read.isPending ||
        read.isFetching ||
        (read.fetchStatus && read.fetchStatus !== "idle"),
    )
  )
    return { current: false, reason: "Required saved information is loading or refreshing." };
  return { current: true, reason: null };
}

export function hasInvalidatedRead(client: QueryClient, keys: readonly QueryKey[]) {
  return keys.some((key) => client.getQueryState(key)?.isInvalidated);
}
