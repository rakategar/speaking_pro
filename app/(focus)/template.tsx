export default function FocusTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-enter flex-1 flex flex-col">{children}</div>;
}
