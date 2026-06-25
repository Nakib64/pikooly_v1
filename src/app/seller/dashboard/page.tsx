"use client";
import { Suspense } from "react";
import SellerDashboard from "@/views/seller/SellerDashboard";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerDashboard />
    </Suspense>
  );
}
