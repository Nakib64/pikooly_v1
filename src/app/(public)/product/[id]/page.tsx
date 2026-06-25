"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const ProductDetail = dynamic(() => import("@/views/ProductDetail"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductDetail />
    </Suspense>
  );
}
