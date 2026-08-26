import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { Logo } from "@/components/ui/Logo";
import { ChangePasswordForm } from "@/components/client/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ClientPasswordPage() {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-3xl border border-stroke-subtle bg-surface-card p-8 shadow-soft">
        <div className="mb-4 flex justify-center">
          <Logo className="h-8 w-auto" />
        </div>
        <h1 className="text-xl font-extrabold text-primary">
          {session.mustChangePassword ? "Ganti Password" : "Ubah Password"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {session.mustChangePassword
            ? "Password sementara dari surat kredensial harus diganti sebelum dashboard bisa dibuka."
            : "Masukkan password lama dan password baru Anda."}
        </p>
        <ChangePasswordForm mustChange={session.mustChangePassword} />
      </div>
    </div>
  );
}
