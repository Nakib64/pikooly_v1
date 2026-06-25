"use client";
import { Suspense } from "react";
import AdminHomepageContent from "@/views/admin/AdminHomepageContent";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminHomepageContent />
    </Suspense>
  );
}
