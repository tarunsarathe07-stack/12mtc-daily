/**
 * Admin authorization for pipeline mutation routes and admin pages.
 *
 * Production (Supabase configured, mock mode off):
 *   - Logged-in user must have role 'admin' or 'editor' in user_roles.
 *
 * Development (explicit mock mode): access is allowed and flagged as
 * dev-open so it is never mistaken for production protection.
 */

import { isSupabaseConfigured, isMockMode } from "@/lib/content/config";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sameOriginError } from "@/lib/security/request";

export type AdminCheck =
  | { ok: true; via: "supabase-role" | "dev-open"; userId?: string }
  | { ok: false; status: number; error: string };

export async function requireAdmin(request: Request): Promise<AdminCheck> {
  if (!["GET", "HEAD"].includes(request.method) && sameOriginError(request)) {
    return { ok: false, status: 403, error: "Cross-origin request rejected" };
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

      const { data: isAdminOrEditor, error } = await supabase.rpc("is_admin_or_editor");

      if (error) {
        return { ok: false, status: 500, error: "Role check failed" };
      }
      if (!isAdminOrEditor) {
        return { ok: false, status: 403, error: "Admin or editor role required" };
      }

      const rateLimit = await checkRateLimit(request, {
        bucket: `admin-${request.method.toLowerCase()}`,
        limit: request.method === "GET" ? 300 : 30,
        windowSeconds: 600,
        userId: user.id,
      });
      if (!rateLimit.allowed) {
        return { ok: false, status: 429, error: "Too many admin requests" };
      }
      return { ok: true, via: "supabase-role", userId: user.id };
    } catch {
      return { ok: false, status: 500, error: "Auth check failed" };
    }
  }

  // Explicit local demo mode only.
  if (isMockMode()) {
    return { ok: true, via: "dev-open" };
  }

  // Mock mode OFF + Supabase not configured + no key: fail CLOSED.
  // A misconfigured production deploy must never expose mutations.
  return {
    ok: false,
    status: 503,
    error:
      "Admin actions unavailable: server is not configured.",
  };
}

/** Convenience: 401/403 JSON response for a failed check. */
export function adminDenied(check: Extract<AdminCheck, { ok: false }>): Response {
  return Response.json({ error: check.error }, { status: check.status });
}
