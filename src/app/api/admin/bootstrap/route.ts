/**
 * POST /api/admin/bootstrap — assign the FIRST admin/editor role.
 *
 * Security model (no public self-escalation, ever):
 *   - ADMIN_DEV_KEY must be SET on the server AND the request must carry
 *     a matching `x-admin-key` header. There is no mock-mode bypass here.
 *   - Requires real Supabase credentials (the role lives in user_roles).
 *   - Uses the service-role client; user_roles has no RLS write policies,
 *     so this route (or SQL in the Supabase dashboard) is the only path.
 *
 * Body: { "email": "person@example.com", "role": "admin" | "editor" }
 *
 * Usage (after the user has signed up in the app):
 *   curl -X POST https://<host>/api/admin/bootstrap \
 *     -H "x-admin-key: $ADMIN_DEV_KEY" \
 *     -H "content-type: application/json" \
 *     -d '{"email":"you@example.com","role":"admin"}'
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/content/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const devKey = process.env.ADMIN_DEV_KEY;
  const headerKey = request.headers.get("x-admin-key");

  // Hard requirement — key must exist server-side AND match. No fallback.
  if (!devKey) {
    return Response.json(
      { error: "ADMIN_DEV_KEY is not set on the server. Set it before bootstrapping." },
      { status: 503 }
    );
  }
  if (!headerKey || headerKey !== devKey) {
    return Response.json({ error: "Invalid x-admin-key" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase is not configured. Roles require real credentials and migrations." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || !role || !["admin", "editor"].includes(role)) {
      return Response.json(
        { error: "Body must be { email, role: 'admin' | 'editor' }" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find the auth user by email (they must have signed up first)
    let userId: string | null = null;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      const match = data.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (match) userId = match.id;
      if (data.users.length < 100) break; // last page
    }

    if (!userId) {
      return Response.json(
        { error: `No user with email ${email}. They must sign up in the app first.` },
        { status: 404 }
      );
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
    if (roleError) throw roleError;

    return Response.json({
      success: true,
      message: `${email} is now ${role}. They can access /admin after next login.`,
      userId,
      role,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed" },
      { status: 500 }
    );
  }
}
