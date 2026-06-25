"use client";
import { Suspense } from "react";
import AdminMigrate from "@/views/admin/AdminMigrate";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminMigrate />
    </Suspense>
  );
}
