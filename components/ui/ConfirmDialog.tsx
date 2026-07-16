"use client";

import { FaisalAvatar, type FaisalExpression } from "@/components/ui/FaisalAvatar";

type Props = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  sticker?: FaisalExpression;
  onConfirm: () => void;
  onCancel: () => void;
};

// Friendly in-app replacement for window.confirm(). Follows the same overlay
// pattern as UpgradeNudgeModal (components/trial/UpgradeNudgeModal.tsx) but
// sits a layer above it (z-[60]) so it can be shown on top of full-screen
// phase overlays like the recording review screen.
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  icon = "auto_awesome",
  sticker,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm overlay-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {sticker ? (
            <FaisalAvatar expression={sticker} size={72} />
          ) : (
            <span className="material-symbols-outlined text-[40px] text-brand-cyan">
              {icon}
            </span>
          )}
          <h3 className="font-title-lg text-title-lg text-on-surface">
            {title}
          </h3>
          {body && (
            <p className="text-body-md text-text-secondary">{body}</p>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-full bg-primary-container py-3.5 font-label-md text-label-md font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.99]"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full py-3 font-label-md text-label-md font-medium text-text-secondary transition hover:opacity-80"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
