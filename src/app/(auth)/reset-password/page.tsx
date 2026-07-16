"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("This reset link may have expired. Request a new one and try again.");
      return;
    }
    setUpdated(true);
  }

  if (updated) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your new password is active and your progress is right where you left it.
            </p>
          </div>
          <Link href="/today">
            <Button className="w-full">Continue to today&apos;s 12</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
            12
          </div>
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Use at least 10 characters and avoid a password you use elsewhere.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmation" className="text-sm font-medium">Confirm password</label>
            <input
              id="confirmation"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating password..." : "Update password"}
          </Button>
        </form>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Link expired?{" "}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Request another reset email</Link>
        </p>
      </div>
    </main>
  );
}
