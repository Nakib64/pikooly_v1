"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerSignup = dynamic(() => import("@/views/seller/SellerSignup"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerSignup />
    </Suspense>
  );
}
