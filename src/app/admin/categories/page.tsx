"use client";
import { Suspense } from "react";
import AdminCategories from "@/views/admin/AdminCategories";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCategories />
    </Suspense>
  );
}
