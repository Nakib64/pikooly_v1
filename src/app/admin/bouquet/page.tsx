"use client";
import { Suspense } from "react";
import AdminBouquet from "@/views/admin/AdminBouquet";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminBouquet />
    </Suspense>
  );
}
