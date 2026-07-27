"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Globe, Phone, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { FunnelLink } from "@/components/funnel/funnel-link";
import { tmcLink } from "@/lib/funnel/links";
import { BrandMark } from "@/components/brand/brand-mark";

const NAV = [
  { href: "/today", label: "Today" },
  { href: "/shorts", label: "News" },
  { href: "/battle", label: "Quiz" },
  { href: "/archive", label: "Archive" },
  { href: "/blog", label: "Guides" },
  { href: "/profile", label: "Profile" },
] as const;

export function TopNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const youtube = process.env.NEXT_PUBLIC_YOUTUBE_URL;
  const isActiveQuiz = /^\/battle\/[^/]+$/.test(pathname);

  if (isActiveQuiz) return null;

  return (
    <header className="sticky top-0 z-50 hidden border-b border-border bg-white lg:block">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-6 xl:px-8">
        <Link href="/today" className="flex shrink-0 items-center gap-2.5">
          <BrandMark size={40} priority />
          <span className="leading-none">
            <span className="block text-[15px] font-bold text-foreground">12 Minutes Daily</span>
            <span className="block text-[10px] font-medium text-muted-foreground">
              by 12 Minutes to CLAT
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="topnav-active"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-saffron"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={cn(
                "relative px-3.5 py-2 text-sm font-semibold transition-colors",
                pathname.startsWith("/admin")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pathname.startsWith("/admin") && (
                <motion.span
                  layoutId="topnav-active"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-saffron"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative">Admin</span>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <FunnelLink
            href={tmcLink("nav-site")}
            label="12minutestoclat.com"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            12minutestoclat.com
          </FunnelLink>
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          )}
          {youtube && (
            <a
              href={youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube channel"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-coral"
            >
              <MonitorPlay className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
