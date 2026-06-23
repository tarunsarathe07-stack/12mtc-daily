"use client";

/**
 * Tracked funnel link — records a conversion event, then navigates.
 * External links (12minutestoclat.com with UTMs) open in a new tab;
 * internal links use Next navigation.
 */

import Link from "next/link";
import type { ConversionEventType } from "@/lib/types/database";

interface FunnelLinkProps {
  href: string;
  label: string; // canonical CTA label, stored as cta_label
  eventType?: ConversionEventType;
  className?: string;
  children: React.ReactNode;
}

function track(eventType: ConversionEventType, label: string, href: string) {
  try {
    const body = JSON.stringify({
      eventType,
      ctaLabel: label,
      meta: { href },
      path: window.location.pathname,
    });
    // sendBeacon survives the page navigating away
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // tracking must never break navigation
  }
}

export function FunnelLink({
  href,
  label,
  eventType = "profile_cta_click",
  className,
  children,
}: FunnelLinkProps) {
  const isExternal = href.startsWith("http");
  const onClick = () => track(eventType, label, href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
