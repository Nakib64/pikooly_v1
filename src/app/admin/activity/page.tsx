"use client";
import { Suspense } from "react";
import AdminActivityLog from "@/views/admin/AdminActivityLog";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminActivityLog />
    </Suspense>
  );
}
