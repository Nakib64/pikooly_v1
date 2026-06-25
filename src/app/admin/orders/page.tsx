"use client";
import { Suspense } from "react";
import AdminOrders from "@/views/admin/AdminOrders";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminOrders />
    </Suspense>
  );
}
