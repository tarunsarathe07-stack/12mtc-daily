/**
 * Date helpers — all "news days" use the Asia/Kolkata calendar date.
 * A daily edition belongs to the IST day it was generated/published on.
 */

const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Current date in IST as YYYY-MM-DD. */
export function istToday(): string {
  return IST_FORMATTER.format(new Date());
}

/** IST date N days ago as YYYY-MM-DD. */
export function istDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return IST_FORMATTER.format(d);
}

/** Convert any Date/ISO string to its IST calendar date (YYYY-MM-DD). */
export function toIstDate(value: string | Date): string {
  return IST_FORMATTER.format(typeof value === "string" ? new Date(value) : value);
}

/** Human label for an IST date: Today / Yesterday / "9 Jun". */
export function istDateLabel(date: string): string {
  if (date === istToday()) return "Today";
  if (date === istDaysAgo(1)) return "Yesterday";
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
