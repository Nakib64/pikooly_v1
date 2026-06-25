"use client";
import { Suspense } from "react";
import AdminHomeLiving from "@/views/admin/AdminHomeLiving";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminHomeLiving />
    </Suspense>
  );
}
