"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminCategories = dynamic(() => import("@/views/admin/AdminCategories"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCategories />
    </Suspense>
  );
}
