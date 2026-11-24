import { createClient } from "@/lib/supabase/server";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export type StorefrontProductCard = {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string;
  model_number: string | null;
  price_kes: number;
  compare_at_price_kes: number | null;
  short_description: string | null;
  warranty_type: "manufacturer" | "shop" | "none";
  warranty_months: number;
  stock_status:
    | "in_stock"
    | "low_stock"
    | "confirm_availability"
    | "out_of_stock";
  stock_quantity: number;
  is_bulky: boolean;
  is_featured: boolean;
  primary_image_url: string | null;
  primary_image_alt: string | null;
  category_name: string | null;
  category_slug: string | null;
};

export type StorefrontProductDetail = StorefrontProductCard & {
  sku: string | null;
  description: string | null;
  specs: Record<string, string>;
  warranty_notes: string | null;
  requires_insured_courier: boolean;
  images: {
    id: string;
    public_url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
  }[];
  store: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    whatsapp_number: string;
    pickup_address: string;
    opening_hours: string | null;
  };
};

export type StorefrontDeliveryZone = {
  id: string;
  name: string;
  description: string | null;
  fulfillment_type: "shop_pickup" | "boda_rider" | "on_demand_app" | "courier";
  fee_kes: number;
  bulky_surcharge_kes: number;
  estimated_delivery_text: string;
  cutoff_time_text: string | null;
};

export type StorefrontCatalogFilter = {
  search?: string;
  categorySlug?: string;
  brand?: string;
  maxPriceKes?: number;
  onlyAvailable?: boolean;
};

export async function getActiveStoreBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, slug, description, logo_url, primary_color, phone, whatsapp_number, pickup_address, opening_hours"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load storefront categories: ${error.message}`);
  }
  return data ?? [];
}

export async function getStorefrontProducts(
  storeId: string,
  filters: StorefrontCatalogFilter = {}
): Promise<{
  products: StorefrontProductCard[];
  brands: string[];
}> {
  const supabase = await createClient();
  const categories = await getStorefrontCategories();

  const categoryById = new Map<string, StorefrontCategory>();
  const categoryBySlug = new Map<string, StorefrontCategory>();
  for (const cat of categories) {
    categoryById.set(cat.id, cat);
    categoryBySlug.set(cat.slug, cat);
  }

  let query = supabase
    .from("products")
    .select(
      `
      id,
      store_id,
      category_id,
      name,
      slug,
      brand,
      model_number,
      price_kes,
      compare_at_price_kes,
      short_description,
      warranty_type,
      warranty_months,
      stock_status,
      stock_quantity,
      is_bulky,
      is_featured
    `
    )
    .eq("store_id", storeId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.categorySlug && filters.categorySlug !== "all") {
    const matchedCat = categoryBySlug.get(filters.categorySlug);
    if (matchedCat) {
      query = query.eq("category_id", matchedCat.id);
    } else {
      return { products: [], brands: [] };
    }
  }

  if (filters.brand && filters.brand !== "all") {
    query = query.ilike("brand", filters.brand.trim());
  }

  if (
    typeof filters.maxPriceKes === "number" &&
    Number.isFinite(filters.maxPriceKes) &&
    filters.maxPriceKes > 0
  ) {
    query = query.lte("price_kes", Math.round(filters.maxPriceKes));
  }

  if (filters.onlyAvailable) {
    query = query.neq("stock_status", "out_of_stock");
  }

  if (filters.search && filters.search.trim().length > 0) {
    const cleanedTerm = filters.search.trim().replaceAll(",", " ");
    query = query.or(
      `name.ilike.%${cleanedTerm}%,brand.ilike.%${cleanedTerm}%,model_number.ilike.%${cleanedTerm}%,short_description.ilike.%${cleanedTerm}%`
    );
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(`Failed to load storefront products: ${error.message}`);
  }

  const productRows = rows ?? [];

  const { data: brandRows } = await supabase
    .from("products")
    .select("brand")
    .eq("store_id", storeId)
    .eq("is_published", true)
    .is("deleted_at", null);

  const brandSet = new Set<string>();
  for (const b of brandRows ?? []) {
    if (b.brand?.trim()) {
      brandSet.add(b.brand.trim());
    }
  }
  const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b));

  const productIds = productRows.map((p) => p.id);
  const imageMap = new Map<string, { url: string; alt: string | null }>();

  if (productIds.length > 0) {
    const { data: images } = await supabase
      .from("product_images")
      .select("product_id, public_url, alt_text, is_primary, sort_order")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    for (const img of images ?? []) {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, {
          url: img.public_url,
          alt: img.alt_text,
        });
      }
    }
  }

  const products: StorefrontProductCard[] = productRows.map((p) => {
    const cat = p.category_id ? categoryById.get(p.category_id) : undefined;
    const primaryImg = imageMap.get(p.id);
    return {
      id: p.id,
      store_id: p.store_id,
      category_id: p.category_id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      model_number: p.model_number,
      price_kes: p.price_kes,
      compare_at_price_kes: p.compare_at_price_kes,
      short_description: p.short_description,
      warranty_type: p.warranty_type as "manufacturer" | "shop" | "none",
      warranty_months: p.warranty_months,
      stock_status: p.stock_status as
        | "in_stock"
        | "low_stock"
        | "confirm_availability"
        | "out_of_stock",
      stock_quantity: p.stock_quantity,
      is_bulky: p.is_bulky,
      is_featured: p.is_featured,
      primary_image_url: primaryImg?.url ?? null,
      primary_image_alt: primaryImg?.alt ?? p.name,
      category_name: cat?.name ?? null,
      category_slug: cat?.slug ?? null,
    };
  });

  return { products, brands };
}

export async function getStorefrontProductBySlug(
  storeId: string,
  slug: string
): Promise<StorefrontProductDetail | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      id,
      store_id,
      category_id,
      sku,
      name,
      slug,
      brand,
      model_number,
      price_kes,
      compare_at_price_kes,
      short_description,
      description,
      specs,
      warranty_type,
      warranty_months,
      warranty_notes,
      stock_quantity,
      stock_status,
      is_bulky,
      requires_insured_courier,
      is_featured
    `
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (error || !product) {
    return null;
  }

  const [store, { data: images }, categories] = await Promise.all([
    getActiveStoreBySlug(
      process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics"
    ),
    supabase
      .from("product_images")
      .select("id, public_url, alt_text, is_primary, sort_order")
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
    getStorefrontCategories(),
  ]);

  if (!store) {
    return null;
  }

  const cat = product.category_id
    ? categories.find((c) => c.id === product.category_id)
    : undefined;

  const rawSpecs =
    product.specs &&
    typeof product.specs === "object" &&
    !Array.isArray(product.specs)
      ? (product.specs as Record<string, unknown>)
      : {};

  const normalizedSpecs: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSpecs)) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      normalizedSpecs[k] = String(v);
    }
  }

  const gallery = images ?? [];
  const primaryImg = gallery[0] ?? null;

  return {
    id: product.id,
    store_id: product.store_id,
    category_id: product.category_id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    model_number: product.model_number,
    price_kes: product.price_kes,
    compare_at_price_kes: product.compare_at_price_kes,
    short_description: product.short_description,
    description: product.description,
    specs: normalizedSpecs,
    warranty_type: product.warranty_type as "manufacturer" | "shop" | "none",
    warranty_months: product.warranty_months,
    warranty_notes: product.warranty_notes,
    stock_quantity: product.stock_quantity,
    stock_status: product.stock_status as
      | "in_stock"
      | "low_stock"
      | "confirm_availability"
      | "out_of_stock",
    is_bulky: product.is_bulky,
    requires_insured_courier: product.requires_insured_courier,
    is_featured: product.is_featured,
    primary_image_url: primaryImg?.public_url ?? null,
    primary_image_alt: primaryImg?.alt ?? product.name,
    category_name: cat?.name ?? null,
    category_slug: cat?.slug ?? null,
    images: gallery,
    store,
  };
}