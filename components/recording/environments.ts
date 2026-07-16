export type Environment = {
  slug: string;
  label: string;
  /** CSS background for the POV visual area -- fallback when `image` is
   * absent or fails to load. */
  background: string;
  /** Optional real photo (public/environments/*.jpg), first-person POV.
   * Falls back to `background` if unset or if the file fails to load. */
  image?: string;
  icon: string;
  description: string;
};

/**
 * The four simulated speaking atmospheres from the Recording Studio
 * mockup's environment chips. Each can use a real POV photo (image) once
 * supplied under public/environments/ -- until then, or if the file is
 * missing/fails to load, the gradient renders instead so the studio still
 * works offline and loads instantly.
 */
export const ENVIRONMENTS: Environment[] = [
  {
    slug: "ceo-stage",
    label: "CEO Stage",
    background:
      "radial-gradient(ellipse at 50% 110%, rgba(0,162,253,0.45) 0%, rgba(13,28,50,0.95) 55%, #060d18 100%)",
    image: "/environments/ceo-stage.jpg",
    icon: "podium",
    description: "Panggung keynote dengan sorot lampu ke arah Anda.",
  },
  {
    slug: "boardroom",
    label: "Boardroom",
    background:
      "linear-gradient(160deg, #16283f 0%, #0d1c32 55%, #091422 100%)",
    image: "/environments/boardroom.jpg",
    icon: "meeting_room",
    description: "Rapat dewan direksi yang formal dan intim.",
  },
  {
    slug: "grand-forum",
    label: "Grand Forum",
    background:
      "radial-gradient(circle at 80% 0%, rgba(0,229,255,0.25) 0%, #0d1c32 45%, #071120 100%)",
    image: "/environments/grand-forum.jpg",
    icon: "groups",
    description: "Auditorium besar dengan ratusan audiens.",
  },
  {
    slug: "wedding",
    label: "Wedding",
    background:
      "linear-gradient(180deg, rgba(255,218,214,0.25) 0%, #1d2a44 40%, #0d1c32 100%)",
    image: "/environments/wedding.jpg",
    icon: "favorite",
    description: "Momen sambutan hangat di acara pernikahan.",
  },
];
