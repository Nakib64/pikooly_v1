"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerProducts = dynamic(() => import("@/views/seller/SellerProducts"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerProducts />
    </Suspense>
  );
}
