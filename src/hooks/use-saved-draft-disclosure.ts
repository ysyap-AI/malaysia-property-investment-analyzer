import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Section =
  | "acquisition"
  | "financing"
  | "expenses"
  | "propertyEvidence"
  | "acquisitionEvidence"
  | "financingEvidence"
  | "expensesEvidence"
  | "strategies";
type Observation = "open" | "closed";
const DraftDisclosure = createContext<{
  observations: Partial<Record<Section, Observation>>;
  report: (section: Section, observation: Observation | undefined) => void;
} | null>(null);

/** Ephemeral editor visibility only. Never stores values or qualifies persistence. */
export function SavedDraftDisclosure({ children }: { children: ReactNode }) {
  const [observations, setObservations] = useState<Partial<Record<Section, Observation>>>({});
  const report = useCallback((section: Section, observation: Observation | undefined) => {
    setObservations((previous) => {
      if (previous[section] === observation) return previous;
      const next = { ...previous };
      if (observation === undefined) delete next[section];
      else next[section] = observation;
      return next;
    });
  }, []);
  const value = useMemo(() => ({ observations, report }), [observations, report]);
  return createElement(DraftDisclosure.Provider, { value }, children);
}

export function useSavedDraftObservations() {
  return useContext(DraftDisclosure)?.observations ?? {};
}

export function useDiscloseSavedDraft(section: Section, editing: boolean, confirmed: boolean) {
  const report = useContext(DraftDisclosure)?.report;
  useEffect(() => {
    report?.(section, editing && !confirmed ? "open" : "closed");
    return () => report?.(section, undefined);
  }, [report, section, editing, confirmed]);
}
