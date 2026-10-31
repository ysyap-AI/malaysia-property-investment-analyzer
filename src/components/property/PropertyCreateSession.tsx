import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import {
  createProperty,
  getProperty,
  listProperties,
  matchesCreatedProperty,
  propertyKeys,
} from "@/lib/property/property-api";
import { getCreateSession, PropertyCreateError } from "@/lib/property/property-create";
import type {
  PropertyFormValues,
  PropertyInput,
  PropertyRecord,
} from "@/lib/property/property-fields";
import { PropertyForm } from "./PropertyForm";
import { Button } from "@/components/ui/button";

export function PropertyCreateSession({
  owner,
  onCancel,
  onOpen,
}: {
  owner: string;
  onCancel: () => void;
  onOpen: (id: string) => Promise<unknown>;
}) {
  const client = useQueryClient();
  const session = getCreateSession(client, owner);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const live = useRef(false);
  const [review, setReview] = useState<string>();
  const [reviewing, setReviewing] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    live.current = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== owner) live.current = false;
    });
    return () => {
      live.current = false;
      data.subscription.unsubscribe();
    };
  }, [owner]);
  // Each mount has a separate lifetime. Remounting cannot revive an old callback.
  const lifetime = useRef<object | null>(null);
  useEffect(() => {
    const token = {};
    lifetime.current = token;
    return () => {
      lifetime.current = null;
    };
  }, []);
  const currentView = () => {
    const token = lifetime.current;
    return () => live.current && token !== null && lifetime.current === token;
  };
  async function confirm(
    row: PropertyRecord,
    current: () => boolean,
    values: Readonly<PropertyInput>,
  ) {
    if (!current()) throw Error("Expired context");
    await client.cancelQueries({ queryKey: propertyKeys.detail(row.id), exact: true });
    if (!current()) throw Error("Expired context");
    client.setQueryData(propertyKeys.detail(row.id), row);
    await client.invalidateQueries(
      { queryKey: propertyKeys.all, exact: true },
      { throwOnError: true },
    );
    if (!current()) throw Error("Expired context");
    const fresh = await client.fetchQuery({
      queryKey: propertyKeys.detail(row.id),
      staleTime: 0,
      retry: false,
      queryFn: async () => {
        const saved = await getProperty(row.id);
        if (!current() || saved?.id !== row.id || !matchesCreatedProperty(saved, values, owner))
          throw Error("Unconfirmed refresh");
        return saved;
      },
    });
    return fresh;
  }
  function save(values: PropertyInput, draft: PropertyFormValues) {
    const current = currentView();
    if (!current()) return;
    // Follow-up uses the frozen attempt, not a render closure from before submission.
    void session.run(
      owner,
      values,
      draft,
      (attempt) => createProperty(attempt, current),
      (row) => confirm(row, current, session.getSnapshot().attempt!.values),
      current,
    );
  }
  async function readSaved() {
    if (reviewing) return;
    const current = currentView();
    setReviewing(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || data.user?.id !== owner || !current()) throw Error("Expired context");
      if (state.row) {
        await confirm(state.row, current, state.attempt!.values);
        if (!current()) return;
        session.reviewed();
        setReview(
          "Created parent confirmed by a fresh read. Financial sections still require separate entry and confirmation.",
        );
      } else {
        const rows = await listProperties();
        if (!current()) return;
        if (rows.some((row) => row.user_id !== owner)) throw Error("Unexpected owner");
        setReview(
          `${rows.length} saved properties visible to this account. This read cannot identify whether this operation committed. Compare your property list before seeking recovery help; do not repeat this creation.`,
        );
      }
    } catch {
      if (current())
        setReview(
          "Saved properties could not be reviewed. Your submitted draft is kept; no creation was retried.",
        );
    } finally {
      if (current()) setReviewing(false);
    }
  }
  const locked = !["idle", "not-sent", "rejected"].includes(state.outcome);
  return (
    <div className="space-y-4 min-w-0">
      <div role="status" aria-live="polite" className="space-y-2 break-words">
        {state.outcome === "pending" ? (
          <p>Validating account and submitting one fixed creation attempt.</p>
        ) : null}
        {["not-sent", "rejected", "uncertain"].includes(state.outcome) ? (
          <p>
            {
              new PropertyCreateError(state.outcome as "not-sent" | "rejected" | "uncertain")
                .message
            }
          </p>
        ) : null}
        {state.outcome === "acknowledged" ? (
          <p>Parent creation acknowledged. Confirming the saved record.</p>
        ) : null}
        {state.outcome === "created-refresh-failed" ? (
          <p>
            Parent creation acknowledged, but the follow-up read or navigation failed. Do not create
            it again. Review the created parent.
          </p>
        ) : null}
        {state.outcome === "created" ? (
          <p>
            Parent created and confirmed. Acquisition, financing and expenses have not been saved by
            this creation. Complete and confirm those sections separately; a parent record alone is
            not an investment recommendation.
          </p>
        ) : null}
        {review ? <p>{review}</p> : null}
      </div>
      {state.attempt && locked ? (
        <details>
          <summary>Review submitted draft</summary>
          <dl aria-label="Submitted creation draft" className="break-words">
            {Object.entries(state.attempt.draft).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd className="whitespace-pre-wrap">
                  {value === "" || value == null ? "Missing / Not Verified" : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      {["uncertain", "created-refresh-failed"].includes(state.outcome) ? (
        <Button variant="outline" disabled={reviewing} onClick={() => void readSaved()}>
          Review saved properties
        </Button>
      ) : null}
      {state.outcome === "created" && state.row ? (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const current = currentView();
              void onOpen(state.row!.id).catch(() => {
                if (current()) session.navigationFailed();
              });
            }}
          >
            Open created property
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              session.fresh();
              setReview(undefined);
              setGeneration((n) => n + 1);
            }}
          >
            Start a different property
          </Button>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Your exact draft stays visible. Entry rules trim surrounding text spaces, treat blank
        optional fields as missing and parse valid numeric separators. No financial section is saved
        here.
      </p>
      <PropertyForm
        key={generation}
        {...(state.draft ? { initialValues: state.draft } : {})}
        submitLabel="Save property"
        busy={state.outcome === "pending"}
        readOnly={locked}
        onDraftChange={(draft) => session.draft(draft)}
        onSubmit={(values) => save(values, session.getSnapshot().draft!)}
        onCancel={onCancel}
      />
    </div>
  );
}
