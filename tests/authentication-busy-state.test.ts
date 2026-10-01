import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Children, isValidElement, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Route as login } from "@/routes/login";
import { Route as signup } from "@/routes/signup";
import { Route as recovery } from "@/routes/forgot-password";
import { Route as reset } from "@/routes/reset-password";

const mocks = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  navigate: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  state: [] as unknown[],
  cursor: 0,
}));

// Exercise the actual route handlers and element props in the Node test runner.
// Persist state across explicit renders without introducing a DOM dependency.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.state)) mocks.state[index] = initial;
    return [
      mocks.state[index],
      (value: unknown) => {
        mocks.state[index] = value;
      },
    ];
  },
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: { auth: mocks.auth } }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));

function elements(node: ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as ReactNode)];
  });
}

function formFor(route: typeof login | typeof signup | typeof recovery | typeof reset) {
  function render() {
    mocks.cursor = 0;
    return elements((route.options.component as () => ReactNode)());
  }
  function fill(id: string, value: string) {
    const input = render().find((node) => node.type === Input && node.props.id === id);
    if (!input) return;
    (input.props.onChange as (event: unknown) => void)({ target: { value } });
  }
  fill("email", "tester@example.com");
  fill("name", "Test User");
  fill("password", "synthetic-password");
  fill("confirm", "synthetic-password");
  return {
    render,
    fill,
    button: () => render().find((node) => node.type === Button && node.props.type === "submit"),
    submit: () => {
      const form = render().find((node) => node.type === "form")!;
      const preventDefault = vi.fn();
      const pending = (form.props.onSubmit as (event: FormEvent) => Promise<void>)({
        preventDefault,
      } as unknown as FormEvent);
      expect(preventDefault).toHaveBeenCalledOnce();
      return pending;
    },
  };
}

const cases = [
  {
    name: "login",
    route: login,
    request: mocks.auth.signInWithPassword,
    fallback: "Unable to sign in. Please try again.",
    success: "Signed in",
    args: [{ email: "tester@example.com", password: "synthetic-password" }],
  },
  {
    name: "signup",
    route: signup,
    request: mocks.auth.signUp,
    fallback: "Unable to create your account. Please try again.",
    success: "Account created",
    args: [
      {
        email: "tester@example.com",
        password: "synthetic-password",
        options: { emailRedirectTo: "https://example.com", data: { full_name: "Test User" } },
      },
    ],
  },
  {
    name: "password recovery",
    route: recovery,
    request: mocks.auth.resetPasswordForEmail,
    fallback: "Unable to send the reset link. Please try again.",
    success: null,
    args: ["tester@example.com", { redirectTo: "https://example.com/reset-password" }],
  },
  {
    name: "password reset",
    route: reset,
    request: mocks.auth.updateUser,
    fallback: "Unable to update your password. Please try again.",
    success: "Password updated",
    args: [{ password: "synthetic-password" }],
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.state = [];
  mocks.cursor = 0;
  vi.stubGlobal("window", { location: { origin: "https://example.com" } });
});
afterEach(() => vi.unstubAllGlobals());

describe.each(cases)("$name busy state", ({ route, request, fallback, success, args }) => {
  it.each([new Error("Internal transport details"), "non-Error rejection", null])(
    "clears busy state after unexpected rejection (%s) and permits retry",
    async (reason) => {
      let reject!: (reason: unknown) => void;
      request.mockReturnValueOnce(
        new Promise((_, fail) => {
          reject = fail;
        }),
      );
      const form = formFor(route);
      const pending = form.submit();
      expect(request).toHaveBeenCalledExactlyOnceWith(...args);
      expect(form.button()?.props.disabled).toBe(true);

      reject(reason);
      await expect(pending).resolves.toBeUndefined();
      expect(form.button()?.props.disabled).toBe(false);
      expect(mocks.error).toHaveBeenCalledExactlyOnceWith(fallback);
      expect(mocks.success).not.toHaveBeenCalled();
      expect(mocks.navigate).not.toHaveBeenCalled();

      request.mockResolvedValueOnce({ data: { session: {} }, error: null });
      await form.submit();
      expect(request).toHaveBeenCalledTimes(2);
      expect(mocks.error).toHaveBeenCalledOnce();
    },
  );

  it("preserves returned Supabase errors and re-enables submission", async () => {
    request.mockResolvedValueOnce({ data: null, error: { message: "Supabase request rejected" } });
    const form = formFor(route);
    await form.submit();
    expect(form.button()?.props.disabled).toBe(false);
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith("Supabase request rejected");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("preserves successful completion and clears busy state", async () => {
    request.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const form = formFor(route);
    await form.submit();
    expect(request).toHaveBeenCalledExactlyOnceWith(...args);
    expect(mocks.error).not.toHaveBeenCalled();
    if (success) {
      expect(mocks.success).toHaveBeenCalledExactlyOnceWith(success);
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({ to: "/dashboard" });
      expect(form.button()?.props.disabled).toBe(false);
    } else {
      expect(form.button()).toBeUndefined();
      expect(mocks.success).not.toHaveBeenCalled();
      expect(mocks.navigate).not.toHaveBeenCalled();
      expect(
        form.render().some(
          (node) =>
            node.type === "p" &&
            Children.toArray(node.props.children as ReactNode)
              .join("")
              .includes("a reset link is on its way"),
        ),
      ).toBe(true);
      expect(mocks.state[1]).toBe(false);
    }
  });

  if (success) {
    it("handles a navigation rejection and clears busy state", async () => {
      request.mockResolvedValueOnce({ data: { session: {} }, error: null });
      mocks.navigate.mockRejectedValueOnce(new Error("Navigation failed"));
      const form = formFor(route);
      await expect(form.submit()).resolves.toBeUndefined();
      expect(form.button()?.props.disabled).toBe(false);
      expect(mocks.error).toHaveBeenCalledExactlyOnceWith(fallback);
    });
  }
});

it("signup still requires email confirmation when no session is returned", async () => {
  mocks.auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
  const form = formFor(signup);
  await form.submit();
  expect(form.render()[0]?.props.title).toBe("Check your email");
  expect(form.button()).toBeUndefined();
  expect(mocks.state[3]).toBe(false);
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.error).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});

it("password mismatch still prevents submission without entering busy state", async () => {
  const form = formFor(reset);
  form.fill("confirm", "different-password");
  await form.submit();
  expect(form.button()?.props.disabled).toBe(false);
  expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  expect(mocks.error).toHaveBeenCalledExactlyOnceWith("The two passwords do not match.");
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
