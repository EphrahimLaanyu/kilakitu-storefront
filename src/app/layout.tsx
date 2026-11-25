import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/storefront/CartContext";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { AccountGateModal } from "@/components/storefront/AccountGateModal";
import { ProfileSetupModal } from "@/components/storefront/ProfileSetupModal";
import { StorefrontRealtimeListener } from "@/components/storefront/StorefrontRealtimeListener";
import { StorefrontNavbar } from "@/components/storefront/StorefrontNavbar";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import {
  getActiveStoreBySlug,
  getStorefrontCategories,
  type StorefrontStoreInfo,
} from "@/lib/db/storefront";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KilaKitu.co.ke — Genuine Electronics & Tech Store Kenya",
    template: "%s | KilaKitu.co.ke",
  },
  description:
    "Shop genuine phones, laptops, TVs, and electronics in Kenya with verified warranties, transparent delivery fees, and secure handover PINs.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const revalidate = 30;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";

  let categories: { id: string; name: string; slug: string }[] = [];
  let store: StorefrontStoreInfo | null = null;
  try {
    const [rows, storeRow] = await Promise.all([
      getStorefrontCategories(),
      getActiveStoreBySlug(storeSlug),
    ]);
    categories = rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    store = storeRow;
  } catch {
    categories = [];
    store = null;
  }

  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#F8FAFC] text-slate-900 overflow-x-hidden min-h-screen flex flex-col`}
      >
        <CartProvider>
          <StorefrontRealtimeListener />
          <StorefrontNavbar categories={categories} />
          <div className="flex-1">{children}</div>
          <StorefrontFooter store={store} />
          <CartDrawer />
          <AccountGateModal />
          <ProfileSetupModal />
        </CartProvider>
      </body>
    </html>
  );
}
