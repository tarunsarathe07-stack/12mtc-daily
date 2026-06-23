/**
 * The 12MD bar-crown — our original achievement mark.
 * The crown's three points are rising progress bars: progress IS the
 * royalty. Deep-blue body, saffron tips. No mascots, no borrowed icons.
 */

import { cn } from "@/lib/utils";

export function Crown({
  size = 40,
  className,
  animateTips = false,
}: {
  size?: number;
  className?: string;
  /** Gentle tip shimmer for celebration moments. */
  animateTips?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 44 36"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {/* Rising-bar points: heights 14 / 22 / 18 */}
      <rect x="4" y="14" width="8" height="14" rx="2" className="fill-primary" />
      <rect x="18" y="6" width="8" height="22" rx="2" className="fill-primary" />
      <rect x="32" y="10" width="8" height="18" rx="2" className="fill-primary" />
      {/* Saffron tips — the gems */}
      <rect x="4" y="14" width="8" height="4" rx="2" className={cn("fill-saffron", animateTips && "animate-pulse")} />
      <rect x="18" y="6" width="8" height="4" rx="2" className={cn("fill-saffron", animateTips && "animate-pulse")} />
      <rect x="32" y="10" width="8" height="4" rx="2" className={cn("fill-saffron", animateTips && "animate-pulse")} />
      {/* Band */}
      <rect x="4" y="30" width="36" height="5" rx="2.5" className="fill-primary" />
    </svg>
  );
}

/** Crown + level chip, for league/rank rows. */
export function CrownLevel({
  label,
  sublabel,
  size = 36,
  className,
}: {
  label: string;
  sublabel?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Crown size={size} />
      <span className="leading-tight">
        <span className="block text-sm font-bold">{label}</span>
        {sublabel && (
          <span className="block text-[11px] text-muted-foreground">{sublabel}</span>
        )}
      </span>
    </span>
  );
}
