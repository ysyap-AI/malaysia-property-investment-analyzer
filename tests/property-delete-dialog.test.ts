import { describe, expect, it, vi } from "vitest";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { DeletePropertyDialog } from "@/components/property/DeletePropertyDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";

type Props = {
  children?: ReactNode;
  disabled?: boolean;
  open?: boolean;
  onClick?: (event: { preventDefault: () => void }) => void;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
};
function elements(node: ReactNode): ReactElement<Props>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : [],
  );
}
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (isValidElement<Props>(child) ? text(child.props.children) : String(child)))
    .join("");
}
// Actual dialog prop/event boundary; Chrome separately qualifies Radix focus/Escape.
describe("Delete dialog deliberate confirmation", () => {
  const props = () => ({
    open: true,
    propertyName: "Invented <property>",
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    onCloseAutoFocus: vi.fn(),
  });
  it("opening and cancellation do not invoke the write callback", () => {
    const p = props();
    const nodes = elements(DeletePropertyDialog(p));
    const root = nodes.find((n) => n.type === AlertDialog)!;
    root.props.onOpenChange!(false);
    expect(p.onOpenChange).toHaveBeenCalledWith(false);
    expect(p.onConfirm).not.toHaveBeenCalled();
  });
  it("names the property, bounds the financial consequence and avoids a universal cascade claim", () => {
    const body = text(DeletePropertyDialog(props()));
    expect(body).toContain("Invented <property>");
    expect(body).toContain("expected to be deleted by the database");
    expect(body).not.toContain("everything saved");
  });
  it("a deliberate confirmation delegates once without closing the dialog before an outcome", () => {
    const p = props();
    const action = elements(DeletePropertyDialog(p)).find((n) => n.type === AlertDialogAction)!;
    const preventDefault = vi.fn();
    action.props.onClick!({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(p.onConfirm).toHaveBeenCalledOnce();
    expect(p.onOpenChange).not.toHaveBeenCalled();
  });
  it.each([
    { busy: true, canConfirm: true },
    { busy: false, canConfirm: false },
  ])("pending/unresolved confirmation is disabled, status can close %j", (state) => {
    const nodes = elements(DeletePropertyDialog({ ...props(), ...state }));
    expect(nodes.find((n) => n.type === AlertDialogAction)!.props.disabled).toBe(true);
    expect(nodes.find((n) => n.type === AlertDialogCancel)!.props.disabled).not.toBe(true);
  });
  it("preserves the caller's focus restoration handler", () => {
    const p = props();
    const content = elements(DeletePropertyDialog(p)).find((n) => n.type === AlertDialogContent)!;
    const event = new Event("close");
    content.props.onCloseAutoFocus!(event);
    expect(p.onCloseAutoFocus).toHaveBeenCalledExactlyOnceWith(event);
  });
});
