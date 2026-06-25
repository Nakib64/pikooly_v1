"use client";
import { Suspense } from "react";
import SellerProductDetail from "@/views/seller/SellerProductDetail";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerProductDetail />
    </Suspense>
  );
}
