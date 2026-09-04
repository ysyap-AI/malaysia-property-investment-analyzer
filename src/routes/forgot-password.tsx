import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Password Recovery — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "Request a password reset link for your property investment analyzer account.",
      },
      { property: "og:title", content: "Password Recovery — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Recover access to your Malaysian property investment analyses.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Password recovery"
      description="Recovery emails are not connected yet — this screen is the shell only."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
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
        <Button type="submit" className="w-full" disabled>
          Send reset link (not enabled yet)
        </Button>
      </form>
    </AuthLayout>
  );
}
