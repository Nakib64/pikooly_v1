"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminSitemap = dynamic(() => import("@/views/admin/AdminSitemap"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSitemap />
    </Suspense>
  );
}
