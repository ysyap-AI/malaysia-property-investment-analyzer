import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeletePropertyDialog({
  open,
  propertyName,
  busy,
  canConfirm = true,
  message,
  onOpenChange,
  onConfirm,
  onCloseAutoFocus,
}: {
  open: boolean;
  propertyName: string;
  busy?: boolean;
  canConfirm?: boolean;
  message?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[90dvh] overflow-y-auto break-words"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{propertyName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes this property. Its acquisition costs, financing and operating
            expenses are also expected to be deleted by the database. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{busy ? "Close status" : "Keep property"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={busy || !canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? "Deleting…" : "Delete property"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
