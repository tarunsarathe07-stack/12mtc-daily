import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isMockMode } from "@/lib/content/config";

export const metadata = { title: "Access Denied" };

export default async function AccessDeniedPage() {
  let email: string | null = null;

  try {
    if (isSupabaseConfigured() && !isMockMode()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      email = user?.email ?? null;
    }
  } catch {}

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="mx-auto max-w-sm space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldOff className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Admin access required</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            This page is restricted to admin and editor accounts.
            {email && (
              <>
                {" "}You are signed in as{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/today"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Back to Today
          </Link>
          {email && (
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in with a different account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
