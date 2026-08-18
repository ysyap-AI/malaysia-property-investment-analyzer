import { cn } from "@/lib/utils";

export type DataStatus =
  | "verified"
  | "user-entered"
  | "estimated"
  | "listing-data"
  | "missing"
  | "ai-observation";

const LABELS: Record<DataStatus, string> = {
  verified: "Verified",
  "user-entered": "User Entered",
  estimated: "Estimated",
  "listing-data": "Listing Data",
  missing: "Missing / Not Verified",
  "ai-observation": "AI Generated Observation",
};

const STYLES: Record<DataStatus, string> = {
  verified: "bg-success/10 text-success border-success/30",
  "user-entered": "bg-primary/10 text-primary border-primary/25",
  estimated: "bg-warning/10 text-warning border-warning/30",
  "listing-data": "bg-accent text-accent-foreground border-border",
  missing: "bg-muted text-muted-foreground border-border",
  "ai-observation": "bg-info/10 text-info border-info/30",
};

export function StatusBadge({ status, className }: { status: DataStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
