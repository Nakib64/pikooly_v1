"use client";
import { Suspense } from "react";
import AdminSettings from "@/views/admin/AdminSettings";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSettings />
    </Suspense>
  );
}
