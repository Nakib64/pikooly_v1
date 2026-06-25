import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pikooly",
    short_name: "Pikooly",
    description: "Order fresh flowers, beautiful gifts, and delicious cakes online in Bangladesh.",
    theme_color: "#5c6b3a",
    background_color: "#ffffff",
    display: "standalone",
    start_url: "/",
    scope: "/",
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
