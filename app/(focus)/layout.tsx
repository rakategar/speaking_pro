/**
 * Route group for linear/transactional flows where the bottom nav is
 * intentionally suppressed (Recording Studio, Breathing, Pro Shop,
 * Checkout, Rapor Analisis) -- matches the explicit HTML comment found
 * in the original recording_studio mockup.
 */
export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex-1 flex flex-col">{children}</div>;
}
