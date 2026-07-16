import { PageTransition } from "@/components/nav/PageTransition";

export default function FocusTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageTransition className="flex-1 flex flex-col">
      {children}
    </PageTransition>
  );
}
