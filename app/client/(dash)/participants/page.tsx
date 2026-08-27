import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { listParticipants } from "@/lib/client/analytics";
import { readPeriodFromParams } from "@/lib/client/period";
import { PeriodPicker } from "@/components/client/PeriodPicker";
import { PeriodError } from "@/components/client/PeriodError";
import { AutoRefresh } from "@/components/client/AutoRefresh";
import { ParticipantTable } from "@/components/client/ParticipantTable";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const { period, error: periodError } = readPeriodFromParams(await searchParams);
  const participants = await listParticipants(session.orgId, period);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Peserta</h1>
          <p className="text-sm text-text-secondary">
            {participants.length} peserta · angka dihitung dari periode {period.label}.
          </p>
        </div>
        <PeriodPicker period={period} />
      </div>

      <PeriodError message={periodError} />
      <AutoRefresh renderedAt={new Date().toISOString()} />

      <ParticipantTable participants={participants} period={period} />
    </div>
  );
}
