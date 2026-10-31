import { withoutEvidenceMetadata } from "@/lib/property/investment-evidence";
// Query loading/error gating stays on the authenticated path.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useFinancialAvailability } from "@/hooks/use-financial-confirmation";
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
  const availability = useFinancialAvailability(
    propertyId,
    [property, acq, opex, fin],
    property.data?.user_id,
  );

  const unavailable = !availability.current;
  const analysis = useMemo(() => {
    return analyzeProperty({
      property: unavailable ? null : legacyProperty(property.data),
      acquisition: unavailable ? null : withoutEvidenceMetadata(acq.data),
      operating: unavailable ? null : withoutEvidenceMetadata(opex.data),
      financing: unavailable ? null : withoutEvidenceMetadata(fin.data),
    });
  }, [property.data, acq.data, opex.data, fin.data, unavailable]);

  return {
    ...analysis,
    isLoading,
    isError,
    error,
    availability,
    savedReads: { property, acquisition: acq, expenses: opex, financing: fin },
    loadState: isError
      ? ("error" as const)
      : isLoading
        ? ("loading" as const)
        : !availability.current
          ? ("unavailable" as const)
          : ("ready" as const),
  };
}

// Strategy plans never enter the frozen financial/scoring engines.
function legacyProperty(
  row: import("@/lib/property/property-fields").PropertyRecord | null | undefined,
) {
  const clean = withoutEvidenceMetadata(row);
  if (!clean) return null;
  const { investment_strategy_assumptions: _strategy, ...values } = clean;
  return values;
}
