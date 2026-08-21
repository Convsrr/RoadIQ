import { BottomNavigation } from "@/components/roadiq/bottom-navigation";
import { DesktopRail } from "@/components/roadiq/desktop-rail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopRail />
      <main id="main-content" className="min-h-dvh pb-24 lg:pb-8 xl:pl-[16.5rem]">
        {children}
      </main>
      <BottomNavigation />
    </>
  );
}
