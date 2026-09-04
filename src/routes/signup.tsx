import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Create an account to analyse Malaysian residential rental property investments.",
      },
      { property: "og:title", content: "Create Account — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Start analysing Malaysian rental properties with transparent data statuses.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <AuthLayout
      title="Create your account"
      description="Sign-up is not connected yet — this screen is the shell only."
      footer={
        <span>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Your name" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full" disabled>
          Create account (not enabled yet)
        </Button>
      </form>
    </AuthLayout>
  );
}
