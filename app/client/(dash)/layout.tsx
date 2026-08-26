import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { Logo } from "@/components/ui/Logo";
import { ClientNav } from "@/components/client/ClientNav";

export const dynamic = "force-dynamic";

// Shell + gate for the B2B dashboard.
//
// The gate lives in a layout so a page cannot be added to this area without
// one; middleware deliberately skips /client (see lib/supabase/middleware.ts),
// which makes this the only thing between the internet and one organization's
// participant data. /client/login and /client/password sit OUTSIDE this route
// group precisely so they are reachable before a full session exists.
export default async function ClientDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");
  // The first password arrives by PDF, so nothing else opens until it is
  // replaced.
  if (session.mustChangePassword) redirect("/client/password");

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-stroke-subtle bg-surface-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-auto" />
            <div className="h-6 w-px bg-stroke-subtle" />
            <div>
              <p className="text-sm font-extrabold text-primary">{session.orgName}</p>
              <p className="text-xs text-text-secondary">Dashboard Peserta Training</p>
            </div>
          </div>
          <ClientNav email={session.email} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
