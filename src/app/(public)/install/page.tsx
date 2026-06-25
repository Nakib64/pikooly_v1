"use client";
import { Suspense } from "react";
import Install from "@/views/Install";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Install />
    </Suspense>
  );
}
