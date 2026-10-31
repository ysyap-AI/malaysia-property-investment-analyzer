import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { getDeleteSession } from "@/lib/property/property-delete";

export function usePropertyDeletion(owner: string | null, id: string) {
  const client = useQueryClient();
  const session = getDeleteSession(client, owner ?? "", id);
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}
