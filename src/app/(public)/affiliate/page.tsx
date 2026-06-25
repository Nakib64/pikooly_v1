"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Affiliate = dynamic(() => import("@/views/Affiliate"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Affiliate />
    </Suspense>
  );
}
