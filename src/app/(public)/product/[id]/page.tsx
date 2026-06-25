"use client";
import { Suspense } from "react";
import ProductDetail from "@/views/ProductDetail";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductDetail />
    </Suspense>
  );
}
