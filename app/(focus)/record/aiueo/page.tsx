import { guardModuleAccess } from "@/lib/trial/guard";
import { AiueoView } from "./AiueoView";

export default async function AiueoDrillPage() {
  await guardModuleAccess("aiueo-drill");
  return <AiueoView />;
}
