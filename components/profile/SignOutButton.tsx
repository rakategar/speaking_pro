"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={cn(
        "font-label-md text-label-md text-error flex items-center justify-center gap-2 transition-all disabled:opacity-60",
        variant === "outline" &&
          "w-full border border-error rounded-full py-4 hover:bg-error-container/20 active:scale-95",
        variant === "ghost" &&
          "px-6 py-3 rounded-full hover:bg-error-container/50 border border-transparent hover:border-error/20",
      )}
    >
      <span className="material-symbols-outlined">logout</span>
      {busy ? "Keluar..." : variant === "outline" ? "Logout" : "Sign Out of Speaking Pro"}
    </button>
  );
}
