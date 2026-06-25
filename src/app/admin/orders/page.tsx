"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminOrders = dynamic(() => import("@/views/admin/AdminOrders"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminOrders />
    </Suspense>
  );
}
