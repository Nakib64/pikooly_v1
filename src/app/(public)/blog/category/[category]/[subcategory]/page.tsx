"use client";
import { Suspense } from "react";
import Blog from "@/views/Blog";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Blog />
    </Suspense>
  );
}
