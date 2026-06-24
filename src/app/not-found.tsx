/**
 * Custom 404. Keeps students inside the brand instead of the default
 * Next.js not-found screen.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
        12
      </div>
      <p className="editorial-kicker mt-6 text-saffron">Page not found</p>
      <h1 className="display-title mt-3 text-3xl sm:text-4xl">This page took a day off</h1>
      <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
        The link may be old or the card moved to the archive. Let&apos;s get you back to today&apos;s 12.
      </p>
      <div className="mt-7 flex items-center gap-3">
        <Link
          href="/today"
          className="rounded-full bg-saffron px-6 py-3 text-sm font-black text-ink shadow-sm shadow-saffron/25 transition hover:-translate-y-0.5"
        >
          Back to today
        </Link>
        <Link
          href="/shorts"
          className="rounded-full border border-primary px-6 py-3 text-sm font-black text-primary transition hover:bg-primary hover:text-white"
        >
          Read the news
        </Link>
      </div>
    </main>
  );
}
