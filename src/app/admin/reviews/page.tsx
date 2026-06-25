"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminReviews = dynamic(() => import("@/views/admin/AdminReviews"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminReviews />
    </Suspense>
  );
}
