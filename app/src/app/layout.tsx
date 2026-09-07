import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyCta } from "@/components/StickyCta";
import { AnalyticsScripts } from "@/components/Analytics";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Online & Distance Degree Programs, Compared`, template: `%s | ${site.name}` },
  description: "Explore Online & Distance degree programs from partner universities. Compare courses, fees and eligibility in one place, then apply with guidance from admission to degree completion.",
  icons: { icon: "/favicon.png" },
  openGraph: { siteName: site.name, type: "website", locale: "en_IN" },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#1B2A4A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <StickyCta />
        <AnalyticsScripts />
      </body>
    </html>
  );
}
