"use client";
import { Suspense } from "react";
import AdminSellerPayouts from "@/views/admin/AdminSellerPayouts";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSellerPayouts />
    </Suspense>
  );
}
