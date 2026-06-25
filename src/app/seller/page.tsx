"use client";
import { Suspense } from "react";
import SellerLogin from "@/views/seller/SellerLogin";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerLogin />
    </Suspense>
  );
}
