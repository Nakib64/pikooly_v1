"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminPhotography = dynamic(() => import("@/views/admin/AdminPhotography"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPhotography />
    </Suspense>
  );
}
