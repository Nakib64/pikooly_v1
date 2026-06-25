"use client";
import { Suspense } from "react";
import AdminShipping from "@/views/admin/AdminShipping";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminShipping />
    </Suspense>
  );
}
