/** @type {import('next').NextConfig} */
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: false, // manual registration via public/sw-push.js
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-cache",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "gstatic-fonts-cache",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: /^https:\/\/uizdqqyiqxkcjufkksrc\.supabase\.co\/storage\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "supabase-images",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /^https:\/\/pikooly\.com\.bd\/wp-content\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "wp-images",
        expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "cloudinary-images",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
    {
      urlPattern: /^https:\/\/static-assets-prod\.fnp\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "fnp-assets",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
    {
      urlPattern: /^https:\/\/encrypted-tbn0\.gstatic\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "gstatic-images",
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow cross-origin image loading from known domains
  images: {
    remotePatterns: [
      { protocol: "https" as const, hostname: "uizdqqyiqxkcjufkksrc.supabase.co" },
      { protocol: "https" as const, hostname: "res.cloudinary.com" },
      { protocol: "https" as const, hostname: "pikooly.com.bd" },
      { protocol: "https" as const, hostname: "static-assets-prod.fnp.com" },
      { protocol: "https" as const, hostname: "encrypted-tbn0.gstatic.com" },
    ],
  },
  // Permanent redirects (replaces WordPressRedirects component & public/_redirects)
  async redirects() {
    return [
      // Policy alias redirects
      { source: "/return-policy", destination: "/refund-policy", permanent: true },
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/terms", destination: "/terms-conditions", permanent: true },
      // WordPress legacy URL redirects
      // Note: query-string params (?p=, ?s=) are not supported in Next.js redirect source patterns.
      { source: "/index.php/:path*", destination: "/:path*", permanent: true },
      { source: "/wp-login.php", destination: "/", permanent: true },
      { source: "/wp-admin/:path*", destination: "/admin", permanent: true },
      { source: "/feed/:path*", destination: "/", permanent: true },
    ];
  },
  // Security headers (from public/_headers)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
