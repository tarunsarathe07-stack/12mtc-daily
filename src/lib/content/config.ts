/**
 * Content source configuration.
 *
 * Production path: Supabase Postgres (daily current affairs, questions,
 * pipeline runs, blog posts — appended by content_date, never deleted).
 *
 * Development fallback: local JSON store + hardcoded mock data,
 * active when Supabase credentials are placeholders or mock mode is on.
 */

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return (
    url.startsWith("https://") &&
    !url.includes("your-project") &&
    anonKey.length > 20 &&
    !anonKey.startsWith("your-") &&
    serviceKey.length > 20 &&
    !serviceKey.startsWith("your-")
  );
}

export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
}

/** True when reads/writes should go to Supabase (production path). */
export function useSupabaseStore(): boolean {
  return isSupabaseConfigured() && !isMockMode();
}

/** Daily edition size — the product's core number. */
export const DAILY_TARGET = 12;
