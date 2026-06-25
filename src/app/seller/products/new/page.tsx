"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerProductDetail = dynamic(() => import("@/views/seller/SellerProductDetail"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerProductDetail />
    </Suspense>
  );
}
