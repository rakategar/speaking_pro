import { PageTransition } from "@/components/nav/PageTransition";

/**
 * Re-mounts on every navigation inside the tab group, so the incoming
 * page slides in while the layout-owned bottom nav stays put.
 */
export default function TabsTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageTransition className="flex-1 flex flex-col">
      {children}
    </PageTransition>
  );
}
