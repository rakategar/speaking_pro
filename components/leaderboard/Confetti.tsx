"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#00a2fd", "#f5b731", "#22c55e", "#ef4444", "#a855f7", "#0d1c32"];

// A one-shot confetti burst for the leaderboard entrance. No library: each
// piece is a <span> driven by the `confetti-fall` keyframe in globals.css,
// with its drift, spin and timing varied per piece via CSS custom properties.
//
// The scatter is a pure hash of the piece index rather than Math.random() so
// the component stays render-pure (React's compiler rules reject impure calls
// during render) and server and client markup agree. It reads as random and
// it is stable, which is all the effect needs.
//
// Reduced motion is handled entirely in CSS -- the same media block that
// stops the animation also hides the pieces, so there is nothing to
// special-case here.
function scatter(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

// Chrome's CSSOM rounds inline style values when it parses them back, so a
// full-precision float renders as "56.43951276688313%" in the server HTML but
// reads as "56.4395%" from the DOM -- which React reports as a hydration
// mismatch. Two decimals is well inside what the browser keeps.
const round2 = (n: number) => Math.round(n * 100) / 100;

export function Confetti({
  pieces = 60,
  durationMs = 6000,
}: {
  pieces?: number;
  durationMs?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  const shapes = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        key: i,
        left: round2(scatter(i, 1) * 100),
        drift: Math.round((scatter(i, 2) - 0.5) * 220),
        spin: Math.round(360 + scatter(i, 3) * 900),
        delay: round2(scatter(i, 4) * 2.2),
        duration: round2(3.2 + scatter(i, 5) * 1.6),
        color: COLORS[i % COLORS.length],
        round: scatter(i, 6) > 0.65,
      })),
    [pieces],
  );

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
    >
      {shapes.map((s) => (
        <span
          key={s.key}
          className="confetti-piece"
          style={
            {
              left: `${s.left}%`,
              backgroundColor: s.color,
              borderRadius: s.round ? "50%" : undefined,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              "--drift": `${s.drift}px`,
              "--spin": `${s.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
