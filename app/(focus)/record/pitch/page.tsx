import { guardModuleAccess } from "@/lib/trial/guard";
import { DynamicPitchView } from "./DynamicPitchView";

export default async function DynamicPitchPage() {
  await guardModuleAccess("dynamic-pitch");
  return <DynamicPitchView />;
}
