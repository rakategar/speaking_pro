import { BottomNavBar } from "@/components/layout/BottomNavBar";

/**
 * Route group for screens that show the glassmorphic bottom nav
 * (Dashboard, Library, Profile). Each page renders its own <TopAppBar/>
 * since the title/avatar differs per screen; this layout only owns the
 * bottom nav and the padding needed to clear it.
 */
export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col pb-32">
      {children}
      <BottomNavBar />
    </div>
  );
}
