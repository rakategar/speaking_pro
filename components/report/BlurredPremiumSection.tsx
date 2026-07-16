"use client";

import { useState } from "react";
import { UpgradeNudgeModal } from "@/components/trial/UpgradeNudgeModal";
import { FaisalAvatar } from "@/components/ui/FaisalAvatar";

// Wraps score/insight sections of the report page for non-premium users:
// visually blurred (a curiosity tease, not server-side redaction -- the
// real values are still in the rendered HTML) with a lock overlay that
// opens the subscribe modal on click. Pass active={false} (premium users)
// to render children through untouched.
export function BlurredPremiumSection({
  active = true,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!active) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-breathe">
        {children}
      </div>
      <button
        type="button"
        onClick={() => setShowUpgrade(true)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-3xl bg-black/10 backdrop-blur-[1px]"
      >
        <FaisalAvatar expression="doubtful" size={56} className="drop-shadow" />
        <span className="wiggle-lock material-symbols-outlined text-[28px] text-white drop-shadow">
          lock
        </span>
        <span className="rounded-full bg-black/50 px-4 py-2 text-label-md font-label-md text-white">
          Upgrade untuk melihat hasil analisa lengkap
        </span>
      </button>

      {showUpgrade && (
        <UpgradeNudgeModal
          variant="soft"
          body="Hasil analisa AI, skor 10 parameter, dan rekomendasi latihan personal tersedia di Premium."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
