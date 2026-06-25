"use client";
import { Suspense } from "react";
import AdminBlog from "@/views/admin/AdminBlog";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminBlog />
    </Suspense>
  );
}
