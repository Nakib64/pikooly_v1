"use client";
import { Suspense } from "react";
import AdminAffiliates from "@/views/admin/AdminAffiliates";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminAffiliates />
    </Suspense>
  );
}
