"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const RefundPolicy = dynamic(() => import("@/views/RefundPolicy"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <RefundPolicy />
    </Suspense>
  );
}
