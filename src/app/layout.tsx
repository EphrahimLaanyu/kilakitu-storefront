import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/storefront/CartContext";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { AccountGateModal } from "@/components/storefront/AccountGateModal";
import { StorefrontRealtimeListener } from "@/components/storefront/StorefrontRealtimeListener";
import { StorefrontNavbar } from "@/components/storefront/StorefrontNavbar";
import { getStorefrontCategories } from "@/lib/db/storefront";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    const rows = await getStorefrontCategories();
    categories = rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  } catch {
    categories = [];
  }

  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#F8FAFC] text-slate-900 overflow-x-hidden`}
      >
        <CartProvider>
          <StorefrontRealtimeListener />
          <StorefrontNavbar categories={categories} />
          {children}
          <CartDrawer />
          <AccountGateModal />
        </CartProvider>
      </body>
    </html>
  );
}