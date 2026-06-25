"use client";
import { Suspense } from "react";
import SellerProducts from "@/views/seller/SellerProducts";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerProducts />
    </Suspense>
  );
}
