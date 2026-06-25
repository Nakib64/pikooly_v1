"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const BlogDetail = dynamic(() => import("@/views/BlogDetail"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <BlogDetail />
    </Suspense>
  );
}
