import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/external-client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Malaysia Property Investment Analyzer" },
      {
        name: "description",
        content: "View and update the name and contact email linked to your analyzer account.",
      },
      { property: "og:title", content: "Your Profile — Malaysia Property Investment Analyzer" },
      {
        property: "og:description",
        content: "Manage the account details used across your property analyses.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, contact_email")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      setFullName(data?.full_name ?? "");
      setContactEmail(data?.contact_email ?? user.email ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, contact_email: contactEmail });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
  }

  return (
    <AppShell
      title="Your Profile"
      description="These details belong to your account only. No other user can read or change them."
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Account details</CardTitle>
            <CardDescription>Signed in as {user?.email ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  disabled={loading}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  disabled={loading}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={busy || loading}>
                  {busy ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign-in email</CardTitle>
            <CardDescription>
              The email used to sign in cannot be changed here yet. Use password recovery if you
              need a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
