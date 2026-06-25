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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/pwa-icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
        <link rel="preconnect" href="https://uizdqqyiqxkcjufkksrc.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://static-assets-prod.fnp.com" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0}
          body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif;background:hsl(0,0%,100%);color:hsl(0,0%,7%);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
          h1,h2,h3,h4{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.02em}
          #__next{min-height:100vh}
          .section-container{max-width:80rem;margin-left:auto;margin-right:auto;padding-left:1rem;padding-right:1rem}
          @media(min-width:640px){.section-container{padding-left:1.5rem;padding-right:1.5rem}}
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
