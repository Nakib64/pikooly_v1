"use client";
import { Suspense } from "react";
import AdminPopularGifting from "@/views/admin/AdminPopularGifting";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPopularGifting />
    </Suspense>
  );
}
