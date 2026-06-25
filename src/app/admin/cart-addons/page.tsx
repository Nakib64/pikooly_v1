"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminCartAddons = dynamic(() => import("@/views/admin/AdminCartAddons"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCartAddons />
    </Suspense>
  );
}
