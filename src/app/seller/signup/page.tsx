"use client";
import { Suspense } from "react";
import SellerSignup from "@/views/seller/SellerSignup";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerSignup />
    </Suspense>
  );
}
