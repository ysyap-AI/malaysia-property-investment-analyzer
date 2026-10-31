import { beforeEach, describe, expect, it, vi } from "vitest";
import { Children, isValidElement, type FormEvent, type ReactNode } from "react";
import { PropertyForm } from "@/components/property/PropertyForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  emptyPropertyForm,
  propertySchema,
  type PropertyRecord,
} from "@/lib/property/property-fields";

const hooks = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0 }));
// Exercise actual form event handlers/props in Node; no simulated browser/DB claims.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.state))
      hooks.state[index] = typeof initial === "function" ? initial() : initial;
    return [
      hooks.state[index],
      (value: unknown) => {
        hooks.state[index] = typeof value === "function" ? value(hooks.state[index]) : value;
      },
    ];
  },
}));

type ElementProps = Record<string, unknown> & {
  children?: ReactNode;
  id?: string;
  onChange?: unknown;
  onValueChange?: unknown;
  onSubmit?: unknown;
  onClick?: unknown;
  type?: unknown;
  maxLength?: unknown;
  value?: unknown;
  role?: unknown;
  disabled?: unknown;
};
function elements(node: ReactNode): React.ReactElement<ElementProps>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<ElementProps>(child)
      ? [child, ...elements(child.props.children as ReactNode)]
      : [],
  );
}
function content(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? content(child.props.children)
        : String(child),
    )
    .join("");
}
function harness(props: Parameters<typeof PropertyForm>[0]) {
  function render(next = props) {
    hooks.cursor = 0;
    return elements(PropertyForm(next));
  }
  function input(id: string) {
    return render().find((node) => node.type === Input && node.props.id === id)!;
  }
  return {
    render,
    input,
    fill: (id: string, value: string) =>
      (input(id).props.onChange as (event: unknown) => void)({ target: { value } }),
    choose: (id: string, value: string) => {
      const select = render().find(
        (node) =>
          node.type === Select &&
          elements(node.props.children as ReactNode).some(
            (child) => child.type === SelectTrigger && child.props.id === id,
          ),
      )!;
      (select.props.onValueChange as (value: string) => void)(value);
    },
    submit: () =>
      (render().find((node) => node.type === "form")!.props.onSubmit as (event: FormEvent) => void)(
        { preventDefault: vi.fn() } as unknown as FormEvent,
      ),
    submitButton: () =>
      render().find((node) => node.type === Button && node.props.type === "submit")!,
    text: () =>
      render()
        .map((node) =>
          typeof node.type === "string" ? content(node.props.children as ReactNode) : "",
        )
        .join(" "),
  };
}
const legacy = () =>
  ({
    ...propertySchema.parse({ ...emptyPropertyForm, project_name: "Sample" }),
    full_address: "x".repeat(501),
    city: " city ",
    state: "Legacy state",
    postcode: "OLD",
    district: "",
    country: null,
    id: "p1",
    user_id: "u1",
    created_at: "2026-10-22T10:00:00+00:00",
    updated_at: "2026-10-22T10:00:00.000001+00:00",
  }) as PropertyRecord;
beforeEach(() => {
  hooks.state = [];
  hooks.cursor = 0;
});

describe("property form feedback and deliberate edits", () => {
  it("reverting a stored number to its original display spelling produces no PATCH", () => {
    const save = vi.fn();
    const form = harness({
      originalProperty: { ...legacy(), asking_price: 500000 },
      submitLabel: "Save",
      onSubmit: save,
    });
    form.fill("asking_price", "600000");
    form.fill("asking_price", "500000");
    expect(form.submitButton().props.disabled).toBe(true);
    form.submit();
    expect(save).not.toHaveBeenCalled();
  });
  it("shows scalar counters, allows oversized paste, associates errors, and prevents submit", () => {
    const save = vi.fn();
    const form = harness({ submitLabel: "Save", onSubmit: save });
    form.fill("project_name", "😀".repeat(200));
    expect(form.text()).toContain("200 / 200 Unicode characters");
    expect(form.input("project_name").props.maxLength).toBeUndefined();
    form.fill("project_name", "😀".repeat(201));
    expect(form.input("project_name").props.value).toBe("😀".repeat(201));
    expect(form.input("project_name").props["aria-invalid"]).toBe(true);
    expect(form.input("project_name").props["aria-describedby"]).toContain("project_name-error");
    expect(form.render().find((node) => node.props.id === "project_name-error")?.props.role).toBe(
      "alert",
    );
    expect(
      form.render().find((node) => node.props.id === "project_name-counter")?.props["aria-live"],
    ).toBe("polite");
    form.submit();
    expect(save).not.toHaveBeenCalled();
    form.fill("project_name", "😀".repeat(200));
    form.submit();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ project_name: "😀".repeat(200), country: "Malaysia" }),
    );
  });
  it("counts the prospective trimmed value and saves blank optional text as null", () => {
    const save = vi.fn();
    const form = harness({ submitLabel: "Save", onSubmit: save });
    form.fill("project_name", " Sample ");
    form.fill("city", ` ${"中".repeat(100)} `);
    form.fill("country", "   ");
    expect(form.text()).toContain("100 / 100 Unicode characters");
    expect(form.text()).toContain("Count after trimming");
    form.submit();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ project_name: "Sample", city: "中".repeat(100), country: null }),
    );
  });
  it.each(["\ud800", "\u0000"])(
    "rejects invalid Unicode/NUL %j without changing the draft",
    (text) => {
      const save = vi.fn();
      const form = harness({ submitLabel: "Save", onSubmit: save });
      form.fill("project_name", "Sample");
      form.fill("full_address", text);
      form.submit();
      expect(save).not.toHaveBeenCalled();
      expect(form.input("full_address").props.value).toBe(text);
      expect(form.input("full_address").props["aria-invalid"]).toBe(true);
    },
  );
  it("keeps the state dropdown and requires a five-ASCII-digit postcode", () => {
    const save = vi.fn();
    const form = harness({ submitLabel: "Save", onSubmit: save });
    expect(
      form.render().filter((node) => node.type === Input && node.props.id === "state"),
    ).toHaveLength(0);
    expect(
      form.render().find((node) => node.type === SelectTrigger && node.props.id === "state")?.props[
        "aria-describedby"
      ],
    ).toContain("state-counter");
    form.fill("project_name", "Sample");
    form.fill("postcode", "１２３４５");
    form.submit();
    expect(save).not.toHaveBeenCalled();
    form.fill("postcode", "50470");
    form.choose("state", "Selangor");
    form.submit();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ state: "Selangor", postcode: "50470" }),
    );
  });
  it("open/cancel does not submit, rewrite, or validate legacy values", () => {
    const original = legacy();
    const snapshot = { ...original };
    const save = vi.fn(),
      cancel = vi.fn();
    const form = harness({
      originalProperty: original,
      submitLabel: "Save",
      onSubmit: save,
      onCancel: cancel,
    });
    expect(form.submitButton().props.disabled).toBe(true);
    expect(form.input("country").props.value).toBe("");
    expect(form.input("postcode").props.value).toBe("OLD");
    expect(form.text()).toContain("Existing value is preserved until changed");
    const option = form
      .render()
      .find((node) => node.type === SelectItem && node.props.value === "Legacy state");
    expect(option?.props.disabled).toBe(true);
    form.submit();
    (
      form.render().find((node) => node.type === Button && node.props.children === "Cancel")!.props
        .onClick as () => void
    )();
    expect(cancel).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    expect(original).toEqual(snapshot);
  });
  it("edits a purchase price while legacy fields are oversized/out of vocabulary", () => {
    const original = legacy(),
      save = vi.fn();
    const form = harness({ originalProperty: original, submitLabel: "Save", onSubmit: save });
    form.fill("target_purchase_price", "600,000");
    form.submit();
    expect(save).toHaveBeenCalledWith({ target_purchase_price: 600000 }, original);
  });
  it("displays a legacy state equal to the blank-option sentinel without duplicate option values", () => {
    const original = { ...legacy(), state: "__blank__" };
    const save = vi.fn();
    const form = harness({ originalProperty: original, submitLabel: "Save", onSubmit: save });
    const stateSelect = form
      .render()
      .find(
        (node) =>
          node.type === Select &&
          elements(node.props.children).some((child) => child.props.id === "state"),
      )!;
    const options = elements(stateSelect.props.children).filter((node) => node.type === SelectItem);
    expect(options.filter((node) => node.props.value === "__blank__")).toHaveLength(1);
    expect(options.find((node) => node.props.value === "__blank__")?.props.disabled).toBe(true);
    form.fill("asking_price", "500000");
    form.submit();
    expect(save).toHaveBeenCalledWith({ asking_price: 500000 }, original);
  });
  it("rejects changed oversized fields, allows correction, and clears reverted legacy errors", () => {
    const original = legacy(),
      save = vi.fn();
    const form = harness({ originalProperty: original, submitLabel: "Save", onSubmit: save });
    form.fill("full_address", "y".repeat(501));
    form.submit();
    expect(save).not.toHaveBeenCalled();
    form.fill("full_address", original.full_address!);
    expect(form.input("full_address").props["aria-invalid"]).toBe(false);
    expect(form.submitButton().props.disabled).toBe(true);
    form.fill("full_address", " Fixed ");
    form.submit();
    expect(save).toHaveBeenCalledWith({ full_address: "Fixed" }, original);
  });
  it("retains the original stored baseline across a background refresh and a rejected save", () => {
    const original = legacy(),
      save = vi.fn();
    const form = harness({ originalProperty: original, submitLabel: "Save", onSubmit: save });
    form.fill("city", "Draft");
    form.render({
      originalProperty: { ...original, updated_at: "2026-10-22T11:00:00+00:00", city: "Remote" },
      submitLabel: "Save",
      onSubmit: save,
    });
    form.submit();
    expect(save).toHaveBeenCalledWith({ city: "Draft" }, original);
    expect(form.input("city").props.value).toBe("Draft");
  });
  it("does not submit while a save is pending", () => {
    const save = vi.fn();
    const form = harness({ submitLabel: "Save", onSubmit: save, busy: true });
    form.fill("project_name", "Sample");
    form.submit();
    expect(save).not.toHaveBeenCalled();
  });
});
