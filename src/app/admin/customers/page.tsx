"use client";
import { Suspense } from "react";
import AdminCustomers from "@/views/admin/AdminCustomers";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCustomers />
    </Suspense>
  );
}
