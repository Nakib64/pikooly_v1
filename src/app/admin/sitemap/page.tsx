"use client";
import { Suspense } from "react";
import AdminSitemap from "@/views/admin/AdminSitemap";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSitemap />
    </Suspense>
  );
}
