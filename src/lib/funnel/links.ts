/**
 * Outbound funnel links to the parent brand site (12minutestoclat.com),
 * always stamped with UTM params so conversions are attributable to the app.
 */

const TMC_BASE = "https://www.12minutestoclat.com/";

/**
 * Build a UTM-tagged link to 12minutestoclat.com.
 * @param campaign  where in the app the click happened, e.g. "results-join"
 * @param content   optional CTA variant, e.g. "counselling-call"
 */
export function tmcLink(campaign: string, content?: string): string {
  const params = new URLSearchParams({
    utm_source: "12minutesdaily",
    utm_medium: "app",
    utm_campaign: campaign,
  });
  if (content) params.set("utm_content", content);
  return `${TMC_BASE}?${params.toString()}`;
}

/** Canonical CTA labels — keep analytics consistent across surfaces. */
export const CTA_LABELS = {
  join: "Join 12 Minutes to CLAT",
  counselling: "Book a counselling call",
  prepPlan: "Get full CLAT prep plan",
  saveStreak: "Save your streak",
} as const;
