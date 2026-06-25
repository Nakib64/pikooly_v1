"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Sitemap = dynamic(() => import("@/views/Sitemap"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Sitemap />
    </Suspense>
  );
}
