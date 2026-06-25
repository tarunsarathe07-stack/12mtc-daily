/**
 * GET /api/content/runs — return pipeline run history
 */

import { getPipelineRunsWithStaleCleanup } from "@/lib/content/data";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  const { runs, staleFixed } = await getPipelineRunsWithStaleCleanup();
  return Response.json({ authVia: auth.via, staleFixed, runs: [...runs].reverse() });
}
