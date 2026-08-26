"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/client", label: "Ringkasan" },
  { href: "/client/participants", label: "Peserta" },
  { href: "/client/insights", label: "Analitik AI" },
  { href: "/client/notify", label: "Notifikasi" },
  { href: "/client/reports", label: "Laporan" },
];

export function ClientNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/client/login", { method: "DELETE" });
    router.replace("/client/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav className="flex flex-wrap gap-1">
        {LINKS.map((l) => {
          // Exact match for the overview, prefix match for the rest -- so
          // /client/participants/<id> keeps "Peserta" highlighted.
          const active =
            l.href === "/client"
              ? pathname === "/client"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                active
                  ? "rounded-full bg-primary-container px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full px-3 py-1.5 text-sm font-semibold text-text-secondary hover:text-primary"
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <span className="hidden text-xs text-text-secondary sm:inline">{email}</span>
      <button
        onClick={signOut}
        className="rounded-full border border-stroke-subtle px-3 py-1.5 text-sm font-semibold text-text-secondary hover:text-primary"
      >
        Keluar
      </button>
    </div>
  );
}
