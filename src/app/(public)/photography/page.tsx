"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Photography = dynamic(() => import("@/views/Photography"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Photography />
    </Suspense>
  );
}
