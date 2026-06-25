"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminAffiliates = dynamic(() => import("@/views/admin/AdminAffiliates"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminAffiliates />
    </Suspense>
  );
}
