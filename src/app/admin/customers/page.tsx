"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminCustomers = dynamic(() => import("@/views/admin/AdminCustomers"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCustomers />
    </Suspense>
  );
}
