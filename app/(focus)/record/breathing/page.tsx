import { guardModuleAccess } from "@/lib/trial/guard";
import { BreathingControlView } from "./BreathingControlView";

export default async function BreathingControlPage() {
  await guardModuleAccess("breathing-control");
  return <BreathingControlView />;
}
