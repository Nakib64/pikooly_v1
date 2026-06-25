"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminLogin = dynamic(() => import("@/views/AdminLogin"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}
