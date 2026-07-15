import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How 12 Minutes Daily handles account and learning data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-12 text-foreground sm:py-16">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-bold text-primary hover:underline">
          12 Minutes Daily
        </Link>
        <h1 className="mt-8 text-4xl font-black tracking-tight">Privacy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: 15 July 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-bold text-foreground">Data we store</h2>
            <p className="mt-2">
              Account data includes your email address, display name, target exam year, and
              authentication identifiers. Learning data includes read cards, bookmarks, quiz
              answers, battle results, rating, XP, streaks, and topic mastery.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-foreground">How it is used</h2>
            <p className="mt-2">
              We use this data to authenticate your account, save progress, calculate results,
              personalize revision, protect the service from abuse, and understand aggregate
              product usage. We do not sell student personal data.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-foreground">Service providers</h2>
            <p className="mt-2">
              The application is hosted on Vercel and uses Supabase for authentication and
              database storage. Content-generation providers process public news material for the
              editorial pipeline; quiz answers and private student profiles are not sent to that
              pipeline.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-foreground">Control and deletion</h2>
            <p className="mt-2">
              You can permanently delete your account and linked learning records from the Profile
              page. Data may remain briefly in encrypted service backups until their normal backup
              retention period expires.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-foreground">Security</h2>
            <p className="mt-2">
              Access is restricted by authenticated server routes, database permissions, and
              per-account authorization. No internet service can guarantee absolute security, so
              we continue to monitor and update these controls.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
