"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const Index = dynamic(() => import("@/views/Index"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Index />
    </Suspense>
  );
}
