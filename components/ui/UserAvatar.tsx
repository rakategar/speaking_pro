import { cn } from "@/lib/utils";

// One avatar shape for every place the signed-in user's photo appears
// (TopAppBar "home", /settings, /profile), each of which previously had its
// own copy with its own initial-letter fallback.
//
// Deliberately a plain <img> rather than next/image: the src is a Supabase
// Storage URL on a host that would otherwise have to stay listed in
// next.config.ts images.remotePatterns forever, and a config drift there
// throws at render time instead of degrading. The upload route already
// cache-busts the URL with ?v=<ts>, so there's nothing for the optimizer to
// buy us here.
export function UserAvatar({
  src,
  name,
  size,
  className,
}: {
  src: string | null | undefined;
  /** Used for the fallback initial when there's no photo. */
  name: string | null | undefined;
  /** Rendered size in px. */
  size: number;
  className?: string;
}) {
  const initial = (name ?? "").trim().charAt(0).toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-secondary-container font-heading font-bold text-on-secondary",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
