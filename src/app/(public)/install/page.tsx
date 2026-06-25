"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Install = dynamic(() => import("@/views/Install"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Install />
    </Suspense>
  );
}
