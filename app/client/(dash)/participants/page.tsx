import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { listParticipants } from "@/lib/client/analytics";
import { PeriodPicker } from "@/components/client/PeriodPicker";
import { ParticipantTable } from "@/components/client/ParticipantTable";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 30, 90];

function readDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return ALLOWED_DAYS.includes(n) ? n : 30;
}

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const days = readDays((await searchParams).days);
  const participants = await listParticipants(session.orgId, days);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Peserta</h1>
          <p className="text-sm text-text-secondary">
            {participants.length} peserta · angka dihitung dari {days} hari terakhir.
          </p>
        </div>
        <PeriodPicker days={days} />
      </div>
      <ParticipantTable participants={participants} days={days} />
    </div>
  );
}
