"use client";
import { Suspense } from "react";
import SellerPayouts from "@/views/seller/SellerPayouts";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerPayouts />
    </Suspense>
  );
}
