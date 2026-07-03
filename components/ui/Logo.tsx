import { cn } from "@/lib/utils";

/**
 * Speaking Pro mark: navy play-triangle with a soundwave cut-out,
 * recreated from design-reference/login_speaking_pro/screen.png.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("size-16", className)}
      aria-hidden="true"
    >
      <path
        d="M14 10c0-4.6 5-7.5 9-5.2l32.5 18.8c4 2.3 4 8.1 0 10.4L23 52.8c-4 2.3-9-.6-9-5.2V10z"
        fill="#0d1c32"
        transform="translate(2 6)"
      />
      {/* soundwave bars */}
      <g fill="#ffffff" transform="translate(2 6)">
        <rect x="20" y="24" width="4" height="10" rx="2" />
        <rect x="27" y="19" width="4" height="20" rx="2" />
        <rect x="34" y="23" width="4" height="12" rx="2" />
        <rect x="41" y="26" width="3" height="6" rx="1.5" />
      </g>
    </svg>
  );
}
