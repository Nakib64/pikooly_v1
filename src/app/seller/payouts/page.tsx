"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerPayouts = dynamic(() => import("@/views/seller/SellerPayouts"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerPayouts />
    </Suspense>
  );
}
