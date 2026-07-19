"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UpgradeNudgeModal } from "@/components/trial/UpgradeNudgeModal";

type NudgesSeen = Record<string, boolean>;

const NUDGE_BODY: Record<string, string> = {
  day3: "Kamu sudah jalan 3 hari bareng Speaking Pro. Upgrade ke Premium untuk membuka analisis lengkap, rekaman tanpa batas, dan seluruh modul latihan.",
  day5: "Tinggal 2 hari lagi trial gratismu. Pengguna Premium berlatih dengan analisis penuh, rekaman tanpa batas, dan laporan mingguan — lanjutkan momentumnya.",
  day7: "Hari ini hari terakhir trial gratismu. Upgrade sekarang supaya latihan, rekaman, dan analisis kamu tidak terputus mulai besok.",
};

// Mounted once on the dashboard for free-tier trial users. Shows a soft
// upgrade nudge on trial day 3/5, a heavier "hard push" nudge on day 7 --
// each only once per user (tracked in profiles.trial_nudges_seen, a DB
// flag rather than localStorage so the cap holds across devices).
export function TrialNudgeGate({
  userId,
  trialDay,
  nudgesSeen,
}: {
  userId: string;
  trialDay: number;
  nudgesSeen: NudgesSeen;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);

  const key = trialDay === 3 ? "day3" : trialDay === 5 ? "day5" : trialDay === 7 ? "day7" : null;
  const shouldShow = key !== null && !nudgesSeen?.[key] && dismissed !== key;

  async function handleClose() {
    if (!key) return;
    setDismissed(key);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ trial_nudges_seen: { ...nudgesSeen, [key]: true } })
      .eq("id", userId);
  }

  if (!shouldShow) return null;

  return (
    <UpgradeNudgeModal
      variant={key === "day7" ? "hard" : "soft"}
      title={
        key === "day7"
          ? "Hari Terakhir Trial Gratis Kamu"
          : `Hari ke-${trialDay} Trial Kamu`
      }
      body={NUDGE_BODY[key]}
      onClose={handleClose}
    />
  );
}
