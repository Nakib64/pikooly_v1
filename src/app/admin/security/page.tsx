"use client";
import { Suspense } from "react";
import AdminSecurity from "@/views/admin/AdminSecurity";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSecurity />
    </Suspense>
  );
}
