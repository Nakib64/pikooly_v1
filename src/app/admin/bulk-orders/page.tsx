"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminBulkOrders = dynamic(() => import("@/views/admin/AdminBulkOrders"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminBulkOrders />
    </Suspense>
  );
}
