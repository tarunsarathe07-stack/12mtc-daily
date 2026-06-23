/**
 * Admin authorization for pipeline mutation routes and admin pages.
 *
 * Production (Supabase configured, mock mode off):
 *   - Logged-in user must have role 'admin' or 'editor' in user_roles, OR
 *   - the request carries an `x-admin-key` header matching ADMIN_DEV_KEY
 *     (for cron/CI triggers).
 *
 * Development (mock mode / placeholder credentials):
 *   - If ADMIN_DEV_KEY is set, the `x-admin-key` header must match.
 *   - If unset, access is allowed (local demo) — flagged in the response
 *     so it's never mistaken for real protection.
 */

import { isSupabaseConfigured, isMockMode } from "@/lib/content/config";

export type AdminCheck =
  | { ok: true; via: "supabase-role" | "admin-key" | "dev-open"; userId?: string }
  | { ok: false; status: number; error: string };

export async function requireAdmin(request: Request): Promise<AdminCheck> {
  const headerKey = request.headers.get("x-admin-key");
  const devKey = process.env.ADMIN_DEV_KEY;

  // Shared-key path (cron jobs, CI, curl) — valid in any mode when configured
  if (devKey && headerKey && headerKey === devKey) {
    return { ok: true, via: "admin-key" };
  }

  // Production path: Supabase session + role check
  if (isSupabaseConfigured() && !isMockMode()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { ok: false, status: 401, error: "Not authenticated" };
      }

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "editor"]);

      if (error) {
        return { ok: false, status: 500, error: "Role check failed" };
      }
      if (!roles || roles.length === 0) {
        return { ok: false, status: 403, error: "Admin or editor role required" };
      }
      return { ok: true, via: "supabase-role", userId: user.id };
    } catch {
      return { ok: false, status: 500, error: "Auth check failed" };
    }
  }

  // Dev mode with a key set: enforce it
  if (devKey) {
    return { ok: false, status: 401, error: "Missing or invalid x-admin-key header" };
  }

  // Pure local demo (mock mode, no key): allow, but say so
  if (isMockMode()) {
    return { ok: true, via: "dev-open" };
  }

  // Mock mode OFF + Supabase not configured + no key: fail CLOSED.
  // A misconfigured production deploy must never expose mutations.
  return {
    ok: false,
    status: 503,
    error:
      "Admin actions unavailable: server is not configured. Set Supabase credentials (and run migrations) or set ADMIN_DEV_KEY.",
  };
}

/** Convenience: 401/403 JSON response for a failed check. */
export function adminDenied(check: Extract<AdminCheck, { ok: false }>): Response {
  return Response.json({ error: check.error }, { status: check.status });
}
