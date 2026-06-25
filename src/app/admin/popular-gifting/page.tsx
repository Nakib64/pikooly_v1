"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminPopularGifting = dynamic(() => import("@/views/admin/AdminPopularGifting"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPopularGifting />
    </Suspense>
  );
}
