import { cn } from "@/lib/utils";
import {
  ANALYSIS_STATUSES,
  PROPERTY_STATUSES,
  labelFor,
  type AnalysisStatus,
  type PropertyStatus,
} from "@/lib/property/property-fields";

const PROPERTY_STYLES: Record<PropertyStatus, string> = {
  prospect: "bg-muted text-muted-foreground border-border",
  analysing: "bg-info/10 text-info border-info/30",
  watchlist: "bg-warning/10 text-warning border-warning/30",
  shortlisted: "bg-primary/10 text-primary border-primary/25",
  purchased: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function PropertyStatusBadge({ status }: { status: string | null }) {
  const key = (status ?? "prospect") as PropertyStatus;
  return (
    <span className={cn(base, PROPERTY_STYLES[key] ?? PROPERTY_STYLES.prospect)}>
      {labelFor(PROPERTY_STATUSES, key)}
    </span>
  );
}

export function AnalysisStatusBadge({ status }: { status: string | null }) {
  const key = (status ?? "not_started") as AnalysisStatus;
  return (
    <span className={cn(base, "bg-secondary text-secondary-foreground border-transparent")}>
      {labelFor(ANALYSIS_STATUSES, key)}
    </span>
  );
}
