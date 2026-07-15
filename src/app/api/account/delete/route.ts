import { getStudentId } from "@/lib/student/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { readJson, routeErrorResponse, sameOriginError } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitResponse(
    await checkRateLimit(request, {
      bucket: "account-delete",
      limit: 3,
      windowSeconds: 3600,
      userId,
    })
  );
  if (limited) return limited;

  try {
    const { confirmation } = await readJson<{ confirmation?: string }>(request, 1024);
    if (confirmation !== "DELETE") {
      return Response.json({ error: "Account deletion was not confirmed" }, { status: 400 });
    }

    const { error } = await createAdminClient().auth.admin.deleteUser(userId);
    if (error) throw error;
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeErrorResponse(error, "Failed to delete account", "Account deletion failed");
  }
}
