"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminMigrate = dynamic(() => import("@/views/admin/AdminMigrate"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminMigrate />
    </Suspense>
  );
}
