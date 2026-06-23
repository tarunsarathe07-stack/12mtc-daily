/**
 * GET /auth/callback — OAuth/email-confirmation code exchange.
 * Google login and email confirmation links land here, then continue
 * to the student dashboard.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/today";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
