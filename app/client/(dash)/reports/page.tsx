import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { listParticipants } from "@/lib/client/analytics";
import { periodFromDays } from "@/lib/client/period";
import { ReportRangePicker } from "@/components/client/ReportRangePicker";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const participants = await listParticipants(session.orgId, periodFromDays(30));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">Laporan</h1>
        <p className="text-sm text-text-secondary">
          Unduh rekap program dalam format PDF, siap dibagikan ke pimpinan atau
          diarsipkan.
        </p>
      </div>

      <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Rekap Program
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Berisi ringkasan periode, rata-rata per metrik, aktivitas harian,
          proyeksi, daftar peserta yang perlu perhatian, rincian seluruh{" "}
          {participants.length} peserta, dan analisis naratif terakhir bila sudah
          pernah dibuat di halaman Analitik AI.
        </p>
        <div className="mt-4">
          <ReportRangePicker />
        </div>
      </section>

      <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Rekap per Peserta
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Buka halaman detail peserta, lalu gunakan tombol &ldquo;Unduh PDF&rdquo;
          di sana.
        </p>
      </section>

      <p className="px-2 text-xs text-text-secondary">
        Laporan memuat nama, email, skor, dan aktivitas latihan peserta. Isi
        rekaman maupun transkrip ucapan peserta tidak pernah disertakan.
      </p>
    </div>
  );
}
