import { cache } from "react";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

function createPublicClient() {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

const PRODUCT_CARD_COLUMNS = `
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
  is_featured,
  created_at
`;

type RawProductCardRow = {
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
  warranty_type: string;
  warranty_months: number;
  stock_status: string;
  stock_quantity: number;
  is_bulky: boolean;
  is_featured: boolean;
  created_at?: string;
};

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export type StorefrontProductImage = {
  id: string;
  public_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type StorefrontStoreInfo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string | null;
  phone: string;
  whatsapp_number: string;
  pickup_address: string;
  opening_hours: string | null;
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
  images: StorefrontProductImage[];
  store: StorefrontStoreInfo;
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

export type StorefrontPolicy = {
  id: string;
  policy_type: "returns" | "warranty" | "delivery" | "privacy" | "terms";
  title: string;
  content_markdown: string;
};

export type StorefrontCatalogSort =
  | "featured"
  | "deals"
  | "newest"
  | "price_asc"
  | "price_desc";

export type StorefrontCatalogFilter = {
  search?: string;
  categorySlug?: string;
  brand?: string;
  maxPriceKes?: number;
  onlyAvailable?: boolean;
  onlyFeatured?: boolean;
  onlyDeals?: boolean;
  sort?: StorefrontCatalogSort;
  page?: number;
  pageSize?: number;
};

export type PaginatedStorefrontCatalog = {
  products: StorefrontProductCard[];
  brands: string[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function compareByHottestDeal(a: RawProductCardRow, b: RawProductCardRow): number {
  const aCompare = a.compare_at_price_kes ?? 0;
  const bCompare = b.compare_at_price_kes ?? 0;
  const aSavings = Math.max(0, aCompare - a.price_kes);
  const bSavings = Math.max(0, bCompare - b.price_kes);
  const aPct = aCompare > 0 ? aSavings / aCompare : 0;
  const bPct = bCompare > 0 ? bSavings / bCompare : 0;

  if (Math.abs(bPct - aPct) > 1e-9) {
    return bPct - aPct;
  }
  if (bSavings !== aSavings) {
    return bSavings - aSavings;
  }
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}

function hasValidDiscount(row: RawProductCardRow): boolean {
  return (
    typeof row.compare_at_price_kes === "number" &&
    row.compare_at_price_kes > row.price_kes
  );
}

async function fetchPrimaryImageMap(
  productIds: string[]
): Promise<Map<string, { public_url: string; alt_text: string | null }>> {
  const imageMap = new Map<
    string,
    { public_url: string; alt_text: string | null }
  >();
  if (productIds.length === 0) return imageMap;

  const supabase = createPublicClient();
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, public_url, alt_text, sort_order")
    .in("product_id", productIds)
    .eq("is_primary", true)
    .order("sort_order", { ascending: true });

  for (const img of images ?? []) {
    if (!imageMap.has(img.product_id)) {
      imageMap.set(img.product_id, {
        public_url: img.public_url,
        alt_text: img.alt_text,
      });
    }
  }

  return imageMap;
}

function mapProductCards(
  rows: RawProductCardRow[],
  categoryById: Map<string, StorefrontCategory>,
  imageMap: Map<string, { public_url: string; alt_text: string | null }>
): StorefrontProductCard[] {
  return rows.map((p) => {
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
      primary_image_url: primaryImg?.public_url ?? null,
      primary_image_alt: primaryImg?.alt_text ?? p.name,
      category_name: cat?.name ?? null,
      category_slug: cat?.slug ?? null,
    };
  });
}

export const getActiveStoreBySlug = cache(
  async (slug: string): Promise<StorefrontStoreInfo | null> => {
    const supabase = createPublicClient();
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

    return data as StorefrontStoreInfo;
  }
);

export const getStorefrontCategories = cache(
  async (): Promise<StorefrontCategory[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to load storefront categories: ${error.message}`);
    }

    return (data ?? []) as StorefrontCategory[];
  }
);

export const getStorefrontBrands = cache(
  async (storeId: string): Promise<string[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("products")
      .select("brand")
      .eq("store_id", storeId)
      .eq("is_published", true)
      .is("deleted_at", null);

    const brandSet = new Set<string>();
    for (const row of data ?? []) {
      if (row.brand?.trim()) {
        brandSet.add(row.brand.trim());
      }
    }
    return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
  }
);

export async function getFeaturedStorefrontProducts(
  storeId: string,
  limit = 4
): Promise<StorefrontProductCard[]> {
  const supabase = createPublicClient();
  const [categories, { data, error }] = await Promise.all([
    getStorefrontCategories(),
    supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("store_id", storeId)
      .eq("is_published", true)
      .eq("is_featured", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (error) {
    throw new Error(`Failed to load featured products: ${error.message}`);
  }

  const rows = (data ?? []) as RawProductCardRow[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const imageMap = await fetchPrimaryImageMap(rows.map((r) => r.id));
  return mapProductCards(rows, categoryById, imageMap);
}

export async function getHottestDealsProducts(
  storeId: string,
  limit = 4
): Promise<StorefrontProductCard[]> {
  const supabase = createPublicClient();
  const [categories, { data, error }] = await Promise.all([
    getStorefrontCategories(),
    supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("store_id", storeId)
      .eq("is_published", true)
      .is("deleted_at", null)
      .not("compare_at_price_kes", "is", null),
  ]);

  if (error) {
    throw new Error(`Failed to load hottest deals: ${error.message}`);
  }

  const dealRows = ((data ?? []) as RawProductCardRow[])
    .filter(hasValidDiscount)
    .sort(compareByHottestDeal)
    .slice(0, limit);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const imageMap = await fetchPrimaryImageMap(dealRows.map((r) => r.id));
  return mapProductCards(dealRows, categoryById, imageMap);
}

export async function getNewArrivalsProducts(
  storeId: string,
  limit = 8
): Promise<StorefrontProductCard[]> {
  const supabase = createPublicClient();
  const [categories, { data, error }] = await Promise.all([
    getStorefrontCategories(),
    supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("store_id", storeId)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (error) {
    throw new Error(`Failed to load new arrivals: ${error.message}`);
  }

  const rows = (data ?? []) as RawProductCardRow[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const imageMap = await fetchPrimaryImageMap(rows.map((r) => r.id));
  return mapProductCards(rows, categoryById, imageMap);
}

/**
 * Fetches all three curated homepage sections in parallel with a single
 * batched primary-image lookup across all unique displayed product IDs.
 */
export async function getHomepageCuratedSections(
  storeId: string,
  limits: { featured?: number; deals?: number; arrivals?: number } = {}
): Promise<{
  featured: StorefrontProductCard[];
  hottestDeals: StorefrontProductCard[];
  newArrivals: StorefrontProductCard[];
}> {
  const featuredLimit = limits.featured ?? 4;
  const dealsLimit = limits.deals ?? 4;
  const arrivalsLimit = limits.arrivals ?? 8;

  const supabase = createPublicClient();

  const [categories, featuredRes, dealsRes, arrivalsRes] = await Promise.all([
    getStorefrontCategories(),
    supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("store_id", storeId)
      .eq("is_published", true)
      .eq("is_featured", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(featuredLimit),
    supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("store_id", storeId)
      .eq("is_published", true)
      .is("deleted_at", null)
      .not("compare_at_price_kes", "is", null),
    supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("store_id", storeId)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(arrivalsLimit),
  ]);

  if (featuredRes.error) {
    throw new Error(
      `Failed to load featured products: ${featuredRes.error.message}`
    );
  }
  if (dealsRes.error) {
    throw new Error(`Failed to load hottest deals: ${dealsRes.error.message}`);
  }
  if (arrivalsRes.error) {
    throw new Error(
      `Failed to load new arrivals: ${arrivalsRes.error.message}`
    );
  }

  const featuredRows = (featuredRes.data ?? []) as RawProductCardRow[];
  const dealRows = ((dealsRes.data ?? []) as RawProductCardRow[])
    .filter(hasValidDiscount)
    .sort(compareByHottestDeal)
    .slice(0, dealsLimit);
  const arrivalRows = (arrivalsRes.data ?? []) as RawProductCardRow[];

  const uniqueIds = Array.from(
    new Set([
      ...featuredRows.map((r) => r.id),
      ...dealRows.map((r) => r.id),
      ...arrivalRows.map((r) => r.id),
    ])
  );

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const imageMap = await fetchPrimaryImageMap(uniqueIds);

  return {
    featured: mapProductCards(featuredRows, categoryById, imageMap),
    hottestDeals: mapProductCards(dealRows, categoryById, imageMap),
    newArrivals: mapProductCards(arrivalRows, categoryById, imageMap),
  };
}

export async function getPaginatedStorefrontCatalog(
  storeId: string,
  filters: StorefrontCatalogFilter = {}
): Promise<PaginatedStorefrontCatalog> {
  const supabase = createPublicClient();
  const pageSize = Math.max(1, Math.min(48, Math.round(filters.pageSize ?? 16)));
  const requestedPage = Math.max(1, Math.round(filters.page ?? 1));
  const sort: StorefrontCatalogSort = filters.sort ?? "featured";

  const [categories, brands] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontBrands(storeId),
  ]);

  const categoryById = new Map<string, StorefrontCategory>();
  const categoryBySlug = new Map<string, StorefrontCategory>();
  for (const cat of categories) {
    categoryById.set(cat.id, cat);
    categoryBySlug.set(cat.slug, cat);
  }

  const needsInMemoryDealSort = Boolean(filters.onlyDeals) || sort === "deals";

  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_COLUMNS, {
      count: needsInMemoryDealSort ? undefined : "exact",
    })
    .eq("store_id", storeId)
    .eq("is_published", true)
    .is("deleted_at", null);

  if (filters.categorySlug && filters.categorySlug !== "all") {
    const matchedCat = categoryBySlug.get(filters.categorySlug);
    if (matchedCat) {
      query = query.eq("category_id", matchedCat.id);
    } else {
      return {
        products: [],
        brands,
        totalCount: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      };
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

  if (filters.onlyFeatured) {
    query = query.eq("is_featured", true);
  }

  if (needsInMemoryDealSort) {
    query = query.not("compare_at_price_kes", "is", null);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const cleanedTerm = filters.search.trim().replaceAll(",", " ");
    query = query.or(
      `name.ilike.%${cleanedTerm}%,brand.ilike.%${cleanedTerm}%,model_number.ilike.%${cleanedTerm}%,short_description.ilike.%${cleanedTerm}%`
    );
  }

  if (needsInMemoryDealSort) {
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load storefront deals: ${error.message}`);
    }

    const sortedDeals = ((data ?? []) as RawProductCardRow[])
      .filter(hasValidDiscount)
      .sort(compareByHottestDeal);

    const totalCount = sortedDeals.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * pageSize;
    const pageRows = sortedDeals.slice(start, start + pageSize);

    const imageMap = await fetchPrimaryImageMap(pageRows.map((r) => r.id));

    return {
      products: mapProductCards(pageRows, categoryById, imageMap),
      brands,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  switch (sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_asc":
      query = query
        .order("price_kes", { ascending: true })
        .order("created_at", { ascending: false });
      break;
    case "price_desc":
      query = query
        .order("price_kes", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      break;
  }

  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: rows, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(`Failed to load storefront catalog: ${error.message}`);
  }

  const totalCount = count ?? (rows?.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, totalPages);

  // If user requested a page past totalPages, return the clamped final page cleanly.
  let pageRows = (rows ?? []) as RawProductCardRow[];
  if (requestedPage > totalPages && totalCount > 0) {
    const clampedFrom = (totalPages - 1) * pageSize;
    const clampedTo = clampedFrom + pageSize - 1;
    const { data: clampedRows } = await query.range(clampedFrom, clampedTo);
    pageRows = (clampedRows ?? []) as RawProductCardRow[];
  }

  const imageMap = await fetchPrimaryImageMap(pageRows.map((r) => r.id));

  return {
    products: mapProductCards(pageRows, categoryById, imageMap),
    brands,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getStorefrontProducts(
  storeId: string,
  filters: StorefrontCatalogFilter = {}
): Promise<{
  products: StorefrontProductCard[];
  brands: string[];
}> {
  const result = await getPaginatedStorefrontCatalog(storeId, {
    ...filters,
    page: 1,
    pageSize: 48,
  });
  return { products: result.products, brands: result.brands };
}

export async function getStorefrontProductBySlug(
  store: StorefrontStoreInfo,
  slug: string
): Promise<StorefrontProductDetail | null> {
  const supabase = createPublicClient();

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
    .eq("store_id", store.id)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (error || !product) {
    return null;
  }

  const { data: images } = await supabase
    .from("product_images")
    .select("id, public_url, alt_text, is_primary, sort_order")
    .eq("product_id", product.id)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

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

  const gallery = (images ?? []) as StorefrontProductImage[];
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
    primary_image_alt: primaryImg?.alt_text ?? product.name,
    category_name: null,
    category_slug: null,
    images: gallery,
    store,
  };
}

export async function getPublishedStorePolicies(
  storeId: string
): Promise<StorefrontPolicy[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("store_policies")
    .select("id, policy_type, title, content_markdown")
    .eq("store_id", storeId)
    .eq("is_published", true)
    .order("policy_type", { ascending: true });

  if (error) {
    throw new Error(`Failed to load store policies: ${error.message}`);
  }

  return (data ?? []) as StorefrontPolicy[];
}
