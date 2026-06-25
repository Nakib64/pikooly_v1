"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerProductEdit = dynamic(() => import("@/views/seller/SellerProductEdit"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerProductEdit />
    </Suspense>
  );
}
