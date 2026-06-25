"use client";
import { Suspense } from "react";
import BlogDetail from "@/views/BlogDetail";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <BlogDetail />
    </Suspense>
  );
}
