import { Metadata } from "next";
import { Suspense } from "react";
import Blog from "@/views/Blog";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Blog", "Discover flower care tips, gift ideas, and event decoration trends on our official blog.", "/blog");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Blog />
    </Suspense>
  );
}
