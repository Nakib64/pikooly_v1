"use client";
import { Suspense } from "react";
import AdminCoupons from "@/views/admin/AdminCoupons";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCoupons />
    </Suspense>
  );
}
