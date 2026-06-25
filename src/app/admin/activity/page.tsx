"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminActivityLog = dynamic(() => import("@/views/admin/AdminActivityLog"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminActivityLog />
    </Suspense>
  );
}
