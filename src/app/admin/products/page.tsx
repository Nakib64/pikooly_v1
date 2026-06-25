"use client";
import { Suspense } from "react";
import AdminProducts from "@/views/admin/AdminProducts";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminProducts />
    </Suspense>
  );
}
