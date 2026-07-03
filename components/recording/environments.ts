export type Environment = {
  slug: string;
  label: string;
  /** CSS background for the POV visual area */
  background: string;
  icon: string;
  description: string;
};

/**
 * The four simulated speaking atmospheres from the Recording Studio
 * mockup's environment chips. The mockup used remote POV photos; we
 * render self-contained gradient scenes instead so the studio works
 * offline and loads instantly.
 */
export const ENVIRONMENTS: Environment[] = [
  {
    slug: "ceo-stage",
    label: "CEO Stage",
    background:
      "radial-gradient(ellipse at 50% 110%, rgba(0,162,253,0.45) 0%, rgba(13,28,50,0.95) 55%, #060d18 100%)",
    icon: "podium",
    description: "Panggung keynote dengan sorot lampu ke arah Anda.",
  },
  {
    slug: "boardroom",
    label: "Boardroom",
    background:
      "linear-gradient(160deg, #16283f 0%, #0d1c32 55%, #091422 100%)",
    icon: "meeting_room",
    description: "Rapat dewan direksi yang formal dan intim.",
  },
  {
    slug: "grand-forum",
    label: "Grand Forum",
    background:
      "radial-gradient(circle at 80% 0%, rgba(0,229,255,0.25) 0%, #0d1c32 45%, #071120 100%)",
    icon: "groups",
    description: "Auditorium besar dengan ratusan audiens.",
  },
  {
    slug: "wedding",
    label: "Wedding",
    background:
      "linear-gradient(180deg, rgba(255,218,214,0.25) 0%, #1d2a44 40%, #0d1c32 100%)",
    icon: "favorite",
    description: "Momen sambutan hangat di acara pernikahan.",
  },
];
