"use client";
import { Suspense } from "react";
import AdminSellers from "@/views/admin/AdminSellers";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSellers />
    </Suspense>
  );
}
