"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminSubscribers = dynamic(() => import("@/views/admin/AdminSubscribers"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSubscribers />
    </Suspense>
  );
}
