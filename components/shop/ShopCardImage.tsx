"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Pro Shop card image with a graceful icon fallback: if the product photo
// hasn't been uploaded yet (or fails to load) it shows the type's Material
// Symbol instead of a broken image. Mirrors the record-page env-image pattern.
export function ShopCardImage({
  src,
  icon,
  exclusive,
}: {
  src: string | null;
  icon: string;
  exclusive: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <div
      className={cn(
        "w-full h-40 rounded-xl mb-6 relative overflow-hidden flex items-center justify-center",
        exclusive
          ? "bg-white/5 border border-white/10"
          : "bg-surface-container-low",
      )}
    >
      {showImage ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "material-symbols-outlined text-[64px]",
            exclusive ? "text-tertiary-fixed-dim" : "text-secondary-container",
          )}
        >
          {icon}
        </span>
      )}
    </div>
  );
}
