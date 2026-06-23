import { BottomNav } from "@/components/layout/bottom-nav";
import { TopNav } from "@/components/layout/top-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <TopNav />
      <main className="min-h-dvh pb-20 lg:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
