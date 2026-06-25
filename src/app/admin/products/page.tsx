"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminProducts = dynamic(() => import("@/views/admin/AdminProducts"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminProducts />
    </Suspense>
  );
}
