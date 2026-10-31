import { createContext, createElement, useContext, type ReactNode } from "react";
import type { EvidenceSection } from "@/lib/property/investment-evidence";

export type SourceRequest = { section: EvidenceSection; field: string; sequence: number };
const SourceNavigation = createContext<SourceRequest | null>(null);
export function SourceNavigationProvider({
  request,
  children,
}: {
  request: SourceRequest | null;
  children: ReactNode;
}) {
  return createElement(SourceNavigation.Provider, { value: request }, children);
}
export const useSourceNavigation = () => useContext(SourceNavigation);

/** Reveal closed disclosures before focusing; never reset an existing editor draft. */
export function revealAndFocus(element: HTMLElement | null) {
  if (!element) return;
  let parent = element.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  element.scrollIntoView({ block: "center" });
  element.focus({ preventScroll: true });
}
