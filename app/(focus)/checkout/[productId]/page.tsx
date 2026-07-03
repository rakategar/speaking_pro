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
  const { data: product } = await supabase
    .from("coaching_products")
    .select("id, title, type, price_idr, description, coaches(name)")
    .eq("id", productId)
    .maybeSingle();
  if (!product) notFound();

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
    />
  );
}
