"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UpgradeNudgeModal } from "@/components/trial/UpgradeNudgeModal";

type NudgesSeen = Record<string, boolean>;

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
      body={`[Upgrade nudge copy — day ${trialDay}]`}
      onClose={handleClose}
    />
  );
}
