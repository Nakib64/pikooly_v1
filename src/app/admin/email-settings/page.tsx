"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminEmailSettings = dynamic(() => import("@/views/admin/AdminEmailSettings"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminEmailSettings />
    </Suspense>
  );
}
