import type { Metadata, Viewport } from "next";
import "../index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Pikooly",
    template: "%s | Pikooly",
  },
  description: "Fresh flowers, gifts, and cakes delivered across Bangladesh.",
  keywords: ["flowers", "gifts", "cakes", "bangladesh", "delivery"],
  authors: [{ name: "Pikooly" }],
  openGraph: {
    type: "website",
    title: "Pikooly",
    description: "Fresh flowers, gifts, and cakes delivered across Bangladesh.",
    images: ["/placeholder.svg"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@pikooly",
    title: "Pikooly",
    description: "Fresh flowers, gifts, and cakes delivered across Bangladesh.",
    images: ["/placeholder.svg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/pwa-icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
        <link rel="preconnect" href="https://uizdqqyiqxkcjufkksrc.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://static-assets-prod.fnp.com" />

      </head>
      <body translate="no">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
