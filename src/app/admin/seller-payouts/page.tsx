"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminSellerPayouts = dynamic(() => import("@/views/admin/AdminSellerPayouts"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSellerPayouts />
    </Suspense>
  );
}
