/**
 * Lightweight request guards for our own API routes.
 *
 * - rateLimit: in-memory sliding window keyed by client IP + bucket. This is
 *   per-serverless-instance (not globally consistent), but it's a real first
 *   line of defense against scripted abuse and costs nothing. For stronger
 *   guarantees later, swap the store for Upstash/Vercel KV behind the same API.
 * - assertSameOrigin: rejects cross-site POSTs (CSRF) by checking the Origin
 *   header against the request host.
 *
 * Note: login/signup run through Supabase Auth directly from the client, which
 * already rate-limits on Supabase's side — these guards cover the routes we own.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Opportunistic cleanup so the Map doesn't grow unbounded on a warm instance.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // seconds until the window resets
}

/**
 * Allow `limit` requests per `windowMs` for a given (ip, bucket) pair.
 * Returns ok=false with a retryAfter once the window is exhausted.
 */
export function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = `${bucket}:${getClientIp(request)}`;
  const hit = buckets.get(key);

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (hit.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }

  hit.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** 429 response with a Retry-After header. */
export function tooManyRequests(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * CSRF guard for state-changing requests. Browsers always send Origin on
 * cross-origin (and most same-origin) POSTs; we accept only requests whose
 * Origin matches the Host. Server-to-server callers (cron) send no Origin and
 * authenticate with a key instead, so they're allowed through here.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser caller (cron/CI) — auth handled elsewhere
  try {
    const originHost = new URL(origin).host;
    const host = request.headers.get("host");
    return !!host && originHost === host;
  } catch {
    return false;
  }
}

export function forbiddenOrigin(): Response {
  return Response.json({ error: "Cross-origin request blocked" }, { status: 403 });
}

/**
 * Combined guard for mutation routes: same-origin + rate limit.
 * Returns a Response to short-circuit with, or null to proceed.
 */
export function guardMutation(
  request: Request,
  opts: { bucket: string; limit: number; windowMs: number }
): Response | null {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const rl = rateLimit(request, opts.bucket, opts.limit, opts.windowMs);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  return null;
}
