"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerLogin = dynamic(() => import("@/views/seller/SellerLogin"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerLogin />
    </Suspense>
  );
}
