"use client";

/**
 * Animated number ticker — counts from 0 (or `from`) to `value` on mount.
 * Used for XP, rating, and score reveals.
 */

import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  from = 0,
  duration = 900,
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  from?: number;
  duration?: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(from);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, from, duration]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
    </span>
  );
}
