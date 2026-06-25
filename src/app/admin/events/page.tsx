"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminEvents = dynamic(() => import("@/views/admin/AdminEvents"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminEvents />
    </Suspense>
  );
}
