"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminShipping = dynamic(() => import("@/views/admin/AdminShipping"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminShipping />
    </Suspense>
  );
}
