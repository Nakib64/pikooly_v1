"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminSellers = dynamic(() => import("@/views/admin/AdminSellers"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSellers />
    </Suspense>
  );
}
