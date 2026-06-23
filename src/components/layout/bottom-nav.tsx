"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Newspaper, Zap, Swords, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", label: "Today", icon: Newspaper },
  { href: "/shorts", label: "News", icon: Zap },
  { href: "/battle", label: "Quiz", icon: Swords },
  { href: "/profile", label: "Profile", icon: UserCircle },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="mx-auto max-w-lg px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-2 flex items-center justify-around rounded-[1.25rem] border border-primary/10 bg-card/95 shadow-2xl shadow-ink/10 backdrop-blur-xl">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-4 py-2.5 text-[11px] font-semibold transition-colors",
                  isActive ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -top-px inset-x-3 h-0.5 rounded-full bg-saffron"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <motion.span whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-0.5">
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                  <span>{label}</span>
                </motion.span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
