"use client";

/**
 * Global error boundary. Catches render/runtime errors in any route so
 * students never see a raw Next.js stack trace in production.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console so it still shows up in Vercel logs.
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
        12
      </div>
      <h1 className="display-title mt-6 text-3xl sm:text-4xl">Something broke on our end</h1>
      <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
        This one is on us, not you. Try again — your streak and progress are safe.
      </p>
      <div className="mt-7 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-saffron px-6 py-3 text-sm font-black text-ink shadow-sm shadow-saffron/25 transition hover:-translate-y-0.5"
        >
          Try again
        </button>
        <Link
          href="/today"
          className="rounded-full border border-primary px-6 py-3 text-sm font-black text-primary transition hover:bg-primary hover:text-white"
        >
          Back to today
        </Link>
      </div>
    </main>
  );
}
