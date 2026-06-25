"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminBlog = dynamic(() => import("@/views/admin/AdminBlog"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminBlog />
    </Suspense>
  );
}
