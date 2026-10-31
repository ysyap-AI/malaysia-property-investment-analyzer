import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";
import {
  parentConfirmationKey,
  parentBlocksAnalysis,
  type ParentConfirmation,
} from "@/lib/property/property-edit";
import {
  confirmationKey,
  financialReadKey,
  financialAvailability,
  hasInvalidatedRead,
  type RequiredRead,
  type FinancialConfirmation,
} from "@/lib/property/financial-confirmation";

export function useFinancialConfirmation(identityId: string | null, propertyId: string) {
  return (
    useQuery<FinancialConfirmation>({
      queryKey: confirmationKey(identityId, propertyId),
      queryFn: () => ({}),
      initialData: {},
      enabled: false,
      gcTime: Infinity,
      staleTime: Infinity,
    }).data ?? {}
  );
}

export function useFinancialAvailability(
  propertyId: string,
  reads: RequiredRead[],
  ownerId: string | undefined,
) {
  const { user, loading } = useAuth();
  const deletion = usePropertyDeletion(user?.id ?? null, propertyId);
  const client = useQueryClient();
  const confirmation = useFinancialConfirmation(user?.id ?? null, propertyId);
  const invalidated = useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () =>
      parentBlocksAnalysis(
        client.getQueryState<ParentConfirmation>(
          parentConfirmationKey(user?.id ?? null, propertyId),
        )?.data?.outcome,
      ) ||
      hasInvalidatedRead(client, [
        ["properties", propertyId],
        financialReadKey("acquisition", propertyId),
        financialReadKey("expenses", propertyId),
        financialReadKey("financing", propertyId),
      ]),
    () =>
      parentBlocksAnalysis(
        client.getQueryState<ParentConfirmation>(
          parentConfirmationKey(user?.id ?? null, propertyId),
        )?.data?.outcome,
      ) ||
      hasInvalidatedRead(client, [
        ["properties", propertyId],
        financialReadKey("acquisition", propertyId),
        financialReadKey("expenses", propertyId),
        financialReadKey("financing", propertyId),
      ]),
  );
  if (deletionBlocksProperty(deletion.outcome))
    return {
      current: false,
      reason: "Property deletion requires review. Current assessments are unavailable.",
    };
  return financialAvailability(
    !loading && !!user && ownerId === user.id,
    confirmation,
    reads,
    invalidated,
  );
}
