"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminDashboard = dynamic(() => import("@/views/AdminDashboard"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
