import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { getProperty, propertyKeys } from "@/lib/property/property-api";
import { acquisitionKeys, getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { getOperatingExpenses, operatingExpenseKeys } from "@/lib/property/operating-expenses-api";
/** Saved sources reuse existing read keys, without invoking any analysis or scoring. */
export function useInvestmentEvidence(propertyId: string) {
  const { user, loading } = useAuth();
  const property = useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => getProperty(propertyId),
    enabled: !!user,
  });
  const acquisition = useQuery({
    queryKey: acquisitionKeys.detail(propertyId),
    queryFn: () => getAcquisitionCosts(propertyId),
    enabled: !!user,
  });
  const financing = useQuery({
    queryKey: financingKeys.detail(propertyId),
    queryFn: () => getFinancing(propertyId),
    enabled: !!user,
  });
  const expenses = useQuery({
    queryKey: operatingExpenseKeys.detail(propertyId),
    queryFn: () => getOperatingExpenses(propertyId),
    enabled: !!user,
  });
  return {
    ownerMatches: !loading && !!user && property.data?.user_id === user.id,
    savedReads: { property, acquisition, financing, expenses },
  };
}
