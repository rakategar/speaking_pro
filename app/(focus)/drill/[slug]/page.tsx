import { notFound } from "next/navigation";
import { DRILLS } from "@/lib/drills/content";
import { DrillPlayer } from "@/components/drill/DrillPlayer";
import { guardModuleAccess } from "@/lib/trial/guard";

export function generateStaticParams() {
  return Object.keys(DRILLS).map((slug) => ({ slug }));
}

export default async function DrillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = DRILLS[slug];
  if (!config) notFound();
  await guardModuleAccess(slug);
  return <DrillPlayer config={config} />;
}
