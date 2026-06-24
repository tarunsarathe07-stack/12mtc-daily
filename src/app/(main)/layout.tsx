import { BottomNav } from "@/components/layout/bottom-nav";
import { TopNav } from "@/components/layout/top-nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isMockMode } from "@/lib/content/config";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAdmin = false;

  try {
    if (isSupabaseConfigured() && !isMockMode()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "editor"]);
        isAdmin = (roles?.length ?? 0) > 0;
      }
    }
  } catch {}

  return (
    <div className="min-h-dvh">
      <TopNav isAdmin={isAdmin} />
      <main className="min-h-dvh pb-20 lg:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
