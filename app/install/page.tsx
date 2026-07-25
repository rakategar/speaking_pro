import type { Metadata } from "next";
import { InstallLanding } from "@/components/pwa/InstallLanding";

export const metadata: Metadata = {
  title: "Install Speaking Pro",
};

export default function InstallPage() {
  return <InstallLanding />;
}
