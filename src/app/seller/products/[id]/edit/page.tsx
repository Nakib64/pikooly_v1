"use client";
import { Suspense } from "react";
import SellerProductEdit from "@/views/seller/SellerProductEdit";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerProductEdit />
    </Suspense>
  );
}
