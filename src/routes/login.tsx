import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Sign in to review your Malaysian rental property investment analyses.",
      },
      { property: "og:title", content: "Sign In — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Access your saved Malaysian property investment analyses.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Accounts are not connected yet — this screen is the shell only."
      footer={
        <div className="flex flex-col gap-1">
          <span>
            No account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </span>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot your password?
          </Link>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled>
          Sign in (not enabled yet)
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link to="/">Continue to dashboard preview</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
