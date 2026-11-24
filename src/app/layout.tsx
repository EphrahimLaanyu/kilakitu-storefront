import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/storefront/CartContext";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { AccountGateModal } from "@/components/storefront/AccountGateModal";
import { StorefrontRealtimeListener } from "@/components/storefront/StorefrontRealtimeListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KilaKitu Storefront",
  description: "Shop genuine electronics with verified warranties and fast delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartProvider>
          <StorefrontRealtimeListener />
          {children}
          <CartDrawer />
          <AccountGateModal />
        </CartProvider>
      </body>
    </html>
  );
}