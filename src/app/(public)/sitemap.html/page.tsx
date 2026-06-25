import { Metadata } from "next";
import { Suspense } from "react";
import Sitemap from "@/views/Sitemap";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Sitemap", "View the sitemap of Pikooly to easily navigate our products, categories, blogs, and pages.", "/sitemap.html");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Sitemap />
    </Suspense>
  );
}
