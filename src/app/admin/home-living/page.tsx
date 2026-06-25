"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminHomeLiving = dynamic(() => import("@/views/admin/AdminHomeLiving"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminHomeLiving />
    </Suspense>
  );
}
