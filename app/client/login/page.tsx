import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { Logo } from "@/components/ui/Logo";
import { ClientLoginForm } from "@/components/client/ClientLoginForm";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage() {
  const session = await readClientSession();
  if (session) redirect(session.mustChangePassword ? "/client/password" : "/client");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-3xl border border-stroke-subtle bg-surface-card p-8 shadow-soft">
        <div className="mb-4 flex justify-center">
          <Logo className="h-8 w-auto" />
        </div>
        <h1 className="text-xl font-extrabold text-primary">Dashboard Client</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Monitoring perkembangan peserta training organisasi Anda.
        </p>
        <ClientLoginForm />
        <p className="mt-6 text-xs text-text-secondary">
          Kredensial diberikan oleh tim Speaking Pro. Belum menerima atau lupa
          password? Hubungi tim Speaking Pro untuk penerbitan ulang.
        </p>
      </div>
    </div>
  );
}
