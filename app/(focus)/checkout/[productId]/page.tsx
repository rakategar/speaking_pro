import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: product } = await supabase
    .from("coaching_products")
    .select("id, title, type, price_idr, description, coaches(name)")
    .eq("id", productId)
    .maybeSingle();
  if (!product) notFound();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <CheckoutForm
      product={{
        id: product.id,
        title: product.title,
        type: product.type,
        price_idr: product.price_idr,
        description: product.description,
        coachName: product.coaches?.name ?? null,
      }}
      defaultName={profile?.full_name ?? ""}
      defaultEmail={user?.email ?? ""}
    />
  );
}
