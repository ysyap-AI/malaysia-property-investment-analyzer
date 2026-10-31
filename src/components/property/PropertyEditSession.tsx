import { evidenceEqual } from "@/lib/property/investment-evidence";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { PropertyForm } from "./PropertyForm";
import { Button } from "@/components/ui/button";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { deletionBlocksProperty } from "@/lib/property/property-delete";
import { getProperty, propertyKeys, updateProperty } from "@/lib/property/property-api";
import type { PropertyPatch, PropertyRecord } from "@/lib/property/property-fields";
import {
  makePropertyAttempt,
  parentConfirmationKey,
  PropertyEditError,
  runParentSave,
  type ParentConfirmation,
} from "@/lib/property/property-edit";

export function PropertyEditSession(props: { id: string; owner: string; onCancel: () => void }) {
  const deletion = usePropertyDeletion(props.owner, props.id);
  if (deletionBlocksProperty(deletion.outcome))
    return <p role="status">Property deletion requires review. Editing is unavailable.</p>;
  return <ActivePropertyEditSession {...props} />;
}

function ActivePropertyEditSession({
  id,
  owner,
  onCancel,
}: {
  id: string;
  owner: string;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const live = useRef(false);
  useEffect(() => {
    live.current = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== owner) live.current = false;
    });
    return () => {
      live.current = false;
      data.subscription.unsubscribe();
    };
  }, [owner]);
  const property = useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getProperty(id),
    retry: false,
  });
  const [original, setOriginal] = useState<PropertyRecord | null>(null);
  const [review, setReview] = useState<string>();
  const [reviewing, setReviewing] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (
      !original &&
      property.data?.id === id &&
      property.data.user_id === owner &&
      !property.isError
    )
      setOriginal(Object.freeze({ ...property.data }));
  }, [original, property.data, property.isError, id, owner]);
  const state = useQuery<ParentConfirmation>({
    queryKey: parentConfirmationKey(owner, id),
    queryFn: () => ({ outcome: "idle" }),
    enabled: false,
    initialData: { outcome: "idle" },
    staleTime: Infinity,
    gcTime: Infinity,
  }).data!;
  const locked = [
    "pending",
    "uncertain",
    "conflict",
    "acknowledged",
    "saved",
    "saved-refresh-failed",
  ].includes(state.outcome);
  async function refresh(isCurrent: () => boolean = () => live.current) {
    if (!isCurrent()) throw new Error("Expired context");
    await client.invalidateQueries({ queryKey: propertyKeys.all, exact: true });
    if (!isCurrent()) throw new Error("Expired context");
    await client.invalidateQueries({
      queryKey: propertyKeys.detail(id),
      exact: true,
      refetchType: "none",
    });
    if (!isCurrent()) throw new Error("Expired context");
    const row = await client.fetchQuery({
      queryKey: propertyKeys.detail(id),
      queryFn: () => getProperty(id),
      staleTime: 0,
      retry: false,
    });
    if (!row || row.id !== id || row.user_id !== owner) throw new Error("Unavailable");
    return row;
  }
  function save(patch: PropertyPatch, baseline: PropertyRecord) {
    if (
      !live.current ||
      locked ||
      property.isFetching ||
      property.isError ||
      !property.data ||
      property.data.user_id !== owner
    )
      return;
    const attempt = makePropertyAttempt(owner, baseline, patch);
    void runParentSave(client, attempt, () => updateProperty(attempt, () => live.current), refresh);
  }
  async function readSaved(reopen = false) {
    if (reviewing || !live.current) return;
    setReviewing(true);
    try {
      const row = await refresh(() => live.current);
      if (!live.current) return;
      setReview("Saved values loaded for review. This read does not confirm an uncertain write.");
      if (
        state.outcome === "saved-refresh-failed" &&
        client.getQueryData<ParentConfirmation>(parentConfirmationKey(owner, id))?.attempt
          ?.sequence === state.attempt?.sequence
      )
        client.setQueryData(parentConfirmationKey(owner, id), { ...state, outcome: "saved" });
      if (reopen && !["pending", "uncertain", "acknowledged"].includes(state.outcome)) {
        setOriginal(Object.freeze({ ...row }));
        setGeneration((n) => n + 1);
        client.setQueryData(parentConfirmationKey(owner, id), { outcome: "idle" });
        setReview(undefined);
      }
    } catch {
      if (live.current) setReview("Saved values could not be refreshed. Your draft is kept.");
    } finally {
      if (live.current) setReviewing(false);
    }
  }
  const changed =
    original &&
    property.data &&
    Object.keys(original).some(
      (key) =>
        !evidenceEqual(
          original[key as keyof PropertyRecord],
          property.data![key as keyof PropertyRecord],
        ),
    );
  return (
    <div className="space-y-4 min-w-0">
      <div role="status" aria-live="polite" className="space-y-2 break-words">
        {state.outcome === "pending" ? (
          <p>Saving property changes. The submitted attempt is fixed.</p>
        ) : null}
        {["not-sent", "rejected", "conflict", "uncertain"].includes(state.outcome) ? (
          <p>
            {
              new PropertyEditError(
                state.outcome as "not-sent" | "rejected" | "conflict" | "uncertain",
              ).message
            }
          </p>
        ) : null}
        {state.outcome === "saved" ? <p>Changes saved and confirmed.</p> : null}
        {state.outcome === "acknowledged" ? (
          <p>Changes saved and confirmed. Refreshing saved values.</p>
        ) : null}
        {state.outcome === "saved-refresh-failed" ? (
          <p>
            Changes saved and confirmed, but refreshing saved values failed. Review saved values
            before starting another edit.
          </p>
        ) : null}
        {property.isFetching ? (
          <p>Refreshing saved property. Your exact draft is kept; Save waits for this read.</p>
        ) : null}
        {property.isError ? (
          <p>Saved property could not be loaded. Your draft is kept; Save is paused.</p>
        ) : null}
        {!property.isPending && !property.data ? (
          <p>This property is unavailable. Your draft is kept; Save is paused.</p>
        ) : null}
        {changed && !["saved", "saved-refresh-failed"].includes(state.outcome) ? (
          <p>
            Saved property differs from the original edit context. Your draft and original baseline
            are kept. Saving may report a conflict.
          </p>
        ) : null}
        {review ? <p>{review}</p> : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={reviewing || ["pending", "acknowledged"].includes(state.outcome)}
          onClick={() => void readSaved()}
        >
          Review saved values
        </Button>
        {["saved", "saved-refresh-failed"].includes(state.outcome) ? (
          <Button disabled={reviewing} onClick={() => void readSaved(true)}>
            Start another edit
          </Button>
        ) : null}
      </div>
      {review && property.data?.user_id === owner ? (
        <dl aria-label="Saved property review" className="break-words space-y-1">
          {Object.entries(property.data)
            .filter(
              ([key]) =>
                key in
                (state.attempt?.patch ?? {
                  project_name: true,
                  target_purchase_price: true,
                  expected_monthly_rent: true,
                }),
            )
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd>{value === null ? "Missing / Not Verified" : String(value)}</dd>
              </div>
            ))}
        </dl>
      ) : null}
      {state.attempt && locked ? (
        <dl aria-label="Submitted property changes" className="break-words">
          {Object.entries(state.attempt.patch).map(([key, value]) => (
            <div key={key}>
              <dt>{key.replaceAll("_", " ")}</dt>
              <dd>{value === null ? "Missing / Not Verified" : String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {original ? (
        <PropertyForm
          key={generation}
          originalProperty={original}
          submitLabel="Save changes"
          busy={state.outcome === "pending"}
          readOnly={
            locked ||
            property.isFetching ||
            property.isError ||
            !property.data ||
            property.data.user_id !== owner
          }
          onSubmit={save}
          onCancel={onCancel}
        />
      ) : (
        <p>
          {property.isPending
            ? "Loading property…"
            : "No editable property is available for this account."}
        </p>
      )}
    </div>
  );
}
