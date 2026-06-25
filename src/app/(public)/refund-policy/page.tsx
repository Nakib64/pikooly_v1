"use client";
import { Suspense } from "react";
import RefundPolicy from "@/views/RefundPolicy";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <RefundPolicy />
    </Suspense>
  );
}
