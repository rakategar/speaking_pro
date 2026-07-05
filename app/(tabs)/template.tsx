/**
 * Re-mounts on every navigation inside the tab group, so the incoming
 * page fades in while the layout-owned bottom nav stays put.
 */
export default function TabsTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-enter flex-1 flex flex-col">{children}</div>;
}
