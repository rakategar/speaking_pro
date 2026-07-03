/**
 * Centered card shell for auth screens (Login) -- no top bar, no bottom nav.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-margin-mobile py-12 bg-background">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
