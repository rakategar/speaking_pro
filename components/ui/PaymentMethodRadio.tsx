"use client";

import { cn } from "@/lib/utils";

export const PAYMENT_METHODS = [
  {
    value: "qris",
    label: "QRIS",
    description: "Pembayaran instan via aplikasi apa pun",
    icon: "qr_code_scanner",
  },
  {
    value: "bank",
    label: "Bank Transfer",
    description: "Virtual Account",
    icon: "account_balance",
  },
  {
    value: "ewallet",
    label: "E-Wallet",
    description: "GoPay, OVO, Dana",
    icon: "account_balance_wallet",
  },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

type PaymentMethodRadioProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled?: boolean;
};

/**
 * The QRIS / Bank Transfer / E-Wallet radio card group shared by all
 * three checkout variants.
 */
export function PaymentMethodRadio({
  value,
  onChange,
  disabled,
}: PaymentMethodRadioProps) {
  return (
    <div className="flex flex-col gap-3">
      {PAYMENT_METHODS.map((m) => {
        const selected = value === m.value;
        return (
          <label key={m.value} className="relative cursor-pointer group">
            <input
              type="radio"
              name="payment_method"
              value={m.value}
              checked={selected}
              onChange={() => onChange(m.value)}
              disabled={disabled}
              className="sr-only"
            />
            <div
              className={cn(
                "bento-card p-4 flex items-center gap-4 transition-all duration-200",
                selected && "border-secondary-container ring-1 ring-secondary-container/40",
              )}
            >
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary">
                  {m.icon}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-label-md text-label-md text-on-background">
                  {m.label}
                </h4>
                <p className="font-label-sm text-label-sm text-text-secondary">
                  {m.description}
                </p>
              </div>
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  selected
                    ? "border-secondary-container"
                    : "border-outline-variant",
                )}
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full transition-colors duration-200",
                    selected && "bg-secondary-container",
                  )}
                />
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
