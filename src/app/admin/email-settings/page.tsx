"use client";
import { Suspense } from "react";
import AdminEmailSettings from "@/views/admin/AdminEmailSettings";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminEmailSettings />
    </Suspense>
  );
}
