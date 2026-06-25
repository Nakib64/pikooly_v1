"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminCoupons = dynamic(() => import("@/views/admin/AdminCoupons"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCoupons />
    </Suspense>
  );
}
