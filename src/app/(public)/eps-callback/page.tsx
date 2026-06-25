"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const EpsCallback = dynamic(() => import("@/views/EpsCallback"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <EpsCallback />
    </Suspense>
  );
}
