import { createHmac } from "node:crypto";
import { shouldUseSupabaseStore } from "@/lib/content/config";
import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitOptions = {
  bucket: string;
  limit: number;
  windowSeconds: number;
  userId?: string | null;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type LocalWindow = { count: number; startedAt: number };

const localWindows = new Map<string, LocalWindow>();

function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateKey(request: Request, options: RateLimitOptions): string {
  const identity = options.userId ? `user:${options.userId}` : `ip:${requestIp(request)}`;
  const secret =
    process.env.RATE_LIMIT_SALT ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-rate-limit";
  return createHmac("sha256", secret)
    .update(`${options.bucket}:${identity}`)
    .digest("hex");
}

function localRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const current = localWindows.get(key);
  const windowMs = windowSeconds * 1000;
  const window = !current || current.startedAt + windowMs <= now
    ? { count: 1, startedAt: now }
    : { count: current.count + 1, startedAt: current.startedAt };
  localWindows.set(key, window);

  return {
    allowed: window.count <= limit,
    remaining: Math.max(limit - window.count, 0),
    resetAt: Math.ceil((window.startedAt + windowMs) / 1000),
  };
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = rateKey(request, options);
  if (!shouldUseSupabaseStore()) {
    return localRateLimit(key, options.limit, options.windowSeconds);
  }

  const { data, error } = await createAdminClient().rpc("check_api_rate_limit", {
    p_rate_key: key,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });
  if (error || !data || typeof data !== "object") {
    console.error("Rate-limit check failed", error);
    return { allowed: false, remaining: 0, resetAt: Math.ceil(Date.now() / 1000) + 60 };
  }

  const result = data as Record<string, unknown>;
  return {
    allowed: result.allowed === true,
    remaining: Number(result.remaining) || 0,
    resetAt: Number(result.resetAt) || Math.ceil(Date.now() / 1000) + options.windowSeconds,
  };
}

export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) return null;
  const retryAfter = Math.max(result.resetAt - Math.floor(Date.now() / 1000), 1);
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
