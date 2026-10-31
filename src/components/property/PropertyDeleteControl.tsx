import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePropertyDeletion } from "@/hooks/use-property-deletion";
import { supabase } from "@/integrations/supabase/external-client";
import {
  deleteProperty,
  getProperty,
  observeDeletedProperty,
  propertyKeys,
} from "@/lib/property/property-api";
import type { PropertyRecord } from "@/lib/property/property-fields";
import {
  confirmationKey,
  writeBlocksCurrent,
  type FinancialConfirmation,
} from "@/lib/property/financial-confirmation";
import {
  parentBlocksAnalysis,
  parentConfirmationKey,
  type ParentConfirmation,
} from "@/lib/property/property-edit";
import {
  cancelDeletionReads,
  clearDeletedProperty,
  deleteCacheFence,
  deleteMessages,
  getDeleteSession,
  makeDeleteAttempt,
  PropertyDeleteError,
  type DeleteAttempt,
} from "@/lib/property/property-delete";
import { Button } from "@/components/ui/button";
import { DeletePropertyDialog } from "./DeletePropertyDialog";

export function PropertyDeleteControl({
  id,
  property,
  initialOpen = false,
  onClose,
  onDeleted,
  restoreFocus,
}: {
  id: string;
  property: PropertyRecord | null | undefined;
  initialOpen?: boolean;
  onClose?: () => void;
  onDeleted?: () => void;
  restoreFocus?: () => void;
}) {
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const owner = user?.id ?? "";
  const state = usePropertyDeletion(owner, id);
  const session = getDeleteSession(client, owner, id);
  const [open, setOpen] = useState(initialOpen);
  const [original, setOriginal] = useState<Readonly<PropertyRecord> | null>(() =>
    initialOpen && property ? Object.freeze({ ...property }) : null,
  );
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const lifetime = useRef<object | null>(null);
  const confirmation = useRef<object | null>(initialOpen ? {} : null);
  useEffect(() => {
    const token = {};
    lifetime.current = token;
    // Strict Mode replays setup/cleanup for list-opened dialogs as well.
    if (initialOpen) confirmation.current = {};
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== owner) {
        lifetime.current = null;
        confirmation.current = null;
      }
    });
    return () => {
      lifetime.current = null;
      confirmation.current = null;
      data.subscription.unsubscribe();
    };
  }, [owner, id, initialOpen]);
  const view = () => {
    const token = lifetime.current;
    return () => token !== null && lifetime.current === token;
  };
  const conflict = state.outcome === "conflict";
  const canConfirm =
    ["idle", "not-sent", "rejected", "conflict"].includes(state.outcome) && !conflict;
  const pending = ["pending", "acknowledged"].includes(state.outcome);
  function changeOpen(next: boolean) {
    if (!next) {
      confirmation.current = null;
      setOpen(false);
      onClose?.();
    } else if (!loading && property?.id === id && property.user_id === owner) {
      setOriginal(Object.freeze({ ...property }));
      confirmation.current = {};
      setOpen(true);
    }
  }
  function writesClear() {
    const financial = client.getQueryData<FinancialConfirmation>(confirmationKey(owner, id));
    const parent = client.getQueryData<ParentConfirmation>(parentConfirmationKey(owner, id));
    return (
      !Object.values(financial ?? {}).some((entry) => writeBlocksCurrent(entry.outcome)) &&
      !parentBlocksAnalysis(parent?.outcome)
    );
  }
  async function followup(attempt: DeleteAttempt, current: () => boolean) {
    await clearDeletedProperty(client, attempt, current, false);
    if (!(await observeDeletedProperty(attempt, current))) throw Error("Still visible");
    await clearDeletedProperty(client, attempt, current, true);
  }
  function confirm() {
    if (
      !open ||
      !original ||
      !canConfirm ||
      loading ||
      original.user_id !== owner ||
      !confirmation.current
    )
      return;
    const attempt = makeDeleteAttempt(owner, original as PropertyRecord);
    const active = view();
    const fence = deleteCacheFence(client, attempt);
    const current = () => active() && fence();
    const token = confirmation.current;
    void session
      .run(
        attempt,
        async () => {
          if (!current() || !writesClear()) throw new PropertyDeleteError("not-sent");
          try {
            await cancelDeletionReads(client, id);
          } catch {
            throw new PropertyDeleteError("not-sent");
          }
          await deleteProperty(
            attempt,
            () => current() && confirmation.current === token && writesClear(),
          );
        },
        () => followup(attempt, current),
      )
      .then(() => {
        if (current() && session.getSnapshot().outcome === "deleted") {
          confirmation.current = null;
          setOpen(false);
          onDeleted?.();
        }
      });
  }
  async function check() {
    if (reviewing || pending || !state.attempt) return;
    const attempt = state.attempt;
    const active = view();
    const fence = deleteCacheFence(client, attempt);
    const current = () => active() && fence();
    setReviewing(true);
    try {
      if (state.outcome === "deleted-refresh-failed") {
        await session.check(() => followup(attempt, current));
        if (current() && session.getSnapshot().outcome === "deleted") {
          setOpen(false);
          onDeleted?.();
        }
      } else {
        const absent = await observeDeletedProperty(attempt, current);
        if (current())
          setReview(
            absent
              ? "The property is not visible to this account. This does not confirm the uncertain deletion. Do not retry."
              : "The property is currently visible to this account. This does not resolve the uncertain deletion. Do not retry.",
          );
      }
    } catch {
      if (current()) setReview("The read-only check failed. No further deletion was sent.");
    } finally {
      if (current()) setReviewing(false);
    }
  }
  async function reloadConflict() {
    if (reviewing) return;
    const active = view();
    const fence = deleteCacheFence(
      client,
      makeDeleteAttempt(owner, (original ?? state.attempt!.original) as PropertyRecord),
    );
    const current = () => active() && fence();
    setReviewing(true);
    try {
      const row = await getProperty(id);
      if (!current() || !row || row.id !== id || row.user_id !== owner) throw Error("Unavailable");
      client.setQueryData(propertyKeys.detail(id), row);
      setOriginal(Object.freeze({ ...row }));
      client.setQueryData<PropertyRecord[]>(propertyKeys.all, (rows) =>
        rows?.map((entry) => (entry.id === row.id ? row : entry)),
      );
      session.reloadConflict();
      setReview("Fresh property loaded. Close and open Delete again to review a new confirmation.");
      changeOpen(false);
    } catch {
      if (current()) setReview("The property could not be reloaded. No further deletion was sent.");
    } finally {
      if (current()) setReviewing(false);
    }
  }
  if (loading || !owner || (property && property.user_id !== owner)) return null;
  return (
    <div className="max-w-lg space-y-2 break-words" aria-label="Property deletion">
      {!initialOpen ? (
        <Button
          ref={trigger}
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={!property && !state.attempt}
          onClick={() => {
            if (state.attempt && !canConfirm) {
              confirmation.current = {};
              setOpen(true);
            } else changeOpen(true);
          }}
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      ) : null}
      {state.outcome !== "idle" ? (
        <p role="status" className="text-sm">
          {deleteMessages[state.outcome]}
        </p>
      ) : null}
      {review ? (
        <p role="status" className="text-sm">
          {review}
        </p>
      ) : null}
      <DeletePropertyDialog
        open={open}
        propertyName={
          (state.attempt && !canConfirm ? state.attempt.original : original)?.project_name ?? ""
        }
        busy={pending}
        canConfirm={canConfirm && !reviewing}
        message={deleteMessages[state.outcome]}
        onOpenChange={changeOpen}
        onConfirm={confirm}
        onCloseAutoFocus={(event) => {
          if (trigger.current) {
            event.preventDefault();
            trigger.current.focus();
          } else if (restoreFocus) {
            event.preventDefault();
            restoreFocus();
          }
        }}
      />
      {["uncertain", "deleted-refresh-failed"].includes(state.outcome) ? (
        <Button variant="outline" disabled={pending || reviewing} onClick={() => void check()}>
          Check deletion
        </Button>
      ) : null}
      {conflict ? (
        <Button variant="outline" disabled={reviewing} onClick={() => void reloadConflict()}>
          Reload property
        </Button>
      ) : null}
    </div>
  );
}
