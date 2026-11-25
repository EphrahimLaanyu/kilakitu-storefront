import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const supabase = await createClient();
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .single();

  if (!store) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const cleaned = q.replaceAll(",", " ");

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, brand, price_kes")
      .eq("store_id", store.id)
      .eq("is_published", true)
      .is("deleted_at", null)
      .or(
        `name.ilike.%${cleaned}%,brand.ilike.%${cleaned}%,model_number.ilike.%${cleaned}%`
      )
      .order("is_featured", { ascending: false })
      .limit(5),
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .ilike("name", `%${cleaned}%`)
      .order("sort_order", { ascending: true })
      .limit(3),
  ]);

  const productList = products ?? [];
  const productIds = productList.map((p) => p.id);
  const imageMap = new Map<string, string>();

  if (productIds.length > 0) {
    const { data: imgs } = await supabase
      .from("product_images")
      .select("product_id, public_url")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    for (const img of imgs ?? []) {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img.public_url);
      }
    }
  }

  return NextResponse.json({
    products: productList.map((p) => ({
      ...p,
      image_url: imageMap.get(p.id) ?? null,
    })),
    categories: categories ?? [],
  });
}