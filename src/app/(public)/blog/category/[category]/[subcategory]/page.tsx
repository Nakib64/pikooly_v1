"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Blog = dynamic(() => import("@/views/Blog"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Blog />
    </Suspense>
  );
}
