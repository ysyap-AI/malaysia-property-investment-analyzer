import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** A failed/refetching read must never be presented as an empty portfolio. */
export function PropertyListState({
  loading,
  error,
  data,
  noMatches,
  onRetry,
  onClear,
  children,
}: {
  loading: boolean;
  error: boolean;
  data: unknown[] | undefined;
  noMatches?: boolean;
  onRetry: () => void;
  onClear?: () => void;
  children: ReactNode;
}) {
  if (error)
    return (
      <div role="alert" className="space-y-3 rounded-lg border p-5">
        <p>Your properties could not be loaded. Your saved property count is unavailable.</p>
        <Button variant="outline" onClick={onRetry}>
          Retry loading properties
        </Button>
      </div>
    );
  if (loading || !data)
    return (
      <p role="status" aria-live="polite">
        Loading your properties…
      </p>
    );
  if (!data.length)
    return (
      <div className="space-y-3 rounded-lg border p-5">
        <p>
          No properties saved yet. Start with the property details, then add your costs and
          financing.
        </p>
        <Button asChild>
          <Link to="/properties/new">New Property</Link>
        </Button>
      </div>
    );
  if (noMatches)
    return (
      <div role="status" className="space-y-3 rounded-lg border p-5">
        <p>No matching properties.</p>
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  return children;
}
