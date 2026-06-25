"use client";
import { Suspense } from "react";
import AdminBulkOrders from "@/views/admin/AdminBulkOrders";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminBulkOrders />
    </Suspense>
  );
}
