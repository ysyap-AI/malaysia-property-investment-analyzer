// Query loading/error gating stays on the authenticated path.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { analyzeProperty } from "@/lib/analysis/analyze-property";
import { acquisitionKeys, getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { getOperatingExpenses, operatingExpenseKeys } from "@/lib/property/operating-expenses-api";
import { getProperty, propertyKeys } from "@/lib/property/property-api";

export function usePropertyAnalysis(propertyId: string) {
  const property = useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => getProperty(propertyId),
  });
  const acq = useQuery({
    queryKey: acquisitionKeys.detail(propertyId),
    queryFn: () => getAcquisitionCosts(propertyId),
  });
  const opex = useQuery({
    queryKey: operatingExpenseKeys.detail(propertyId),
    queryFn: () => getOperatingExpenses(propertyId),
  });
  const fin = useQuery({
    queryKey: financingKeys.detail(propertyId),
    queryFn: () => getFinancing(propertyId),
  });
  const isLoading = property.isLoading || acq.isLoading || opex.isLoading || fin.isLoading;
  const isError = property.isError || acq.isError || opex.isError || fin.isError;
  const error = property.error ?? acq.error ?? opex.error ?? fin.error ?? null;

  const analysis = useMemo(() => {
    const unavailable = isError || isLoading;
    return analyzeProperty({
      property: unavailable ? null : (property.data ?? null),
      acquisition: unavailable ? null : (acq.data ?? null),
      operating: unavailable ? null : (opex.data ?? null),
      financing: unavailable ? null : (fin.data ?? null),
    });
  }, [property.data, acq.data, opex.data, fin.data, isError, isLoading]);

  return {
    ...analysis,
    isLoading,
    isError,
    error,
    loadState: isError ? ("error" as const) : isLoading ? ("loading" as const) : ("ready" as const),
  };
}
