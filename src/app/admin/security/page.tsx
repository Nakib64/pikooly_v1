"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminSecurity = dynamic(() => import("@/views/admin/AdminSecurity"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSecurity />
    </Suspense>
  );
}
