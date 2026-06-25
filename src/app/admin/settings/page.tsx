"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminSettings = dynamic(() => import("@/views/admin/AdminSettings"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSettings />
    </Suspense>
  );
}
