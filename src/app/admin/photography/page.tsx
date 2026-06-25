"use client";
import { Suspense } from "react";
import AdminPhotography from "@/views/admin/AdminPhotography";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPhotography />
    </Suspense>
  );
}
