"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminHomepageContent = dynamic(() => import("@/views/admin/AdminHomepageContent"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminHomepageContent />
    </Suspense>
  );
}
