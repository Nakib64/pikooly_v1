"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminBouquet = dynamic(() => import("@/views/admin/AdminBouquet"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminBouquet />
    </Suspense>
  );
}
