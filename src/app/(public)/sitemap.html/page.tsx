"use client";
import { Suspense } from "react";
import Sitemap from "@/views/Sitemap";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Sitemap />
    </Suspense>
  );
}
