"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const SellerDashboard = dynamic(() => import("@/views/seller/SellerDashboard"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerDashboard />
    </Suspense>
  );
}
