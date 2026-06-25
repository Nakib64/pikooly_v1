"use client";
import { Suspense } from "react";
import AdminReviews from "@/views/admin/AdminReviews";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminReviews />
    </Suspense>
  );
}
