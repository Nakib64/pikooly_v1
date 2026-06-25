"use client";
import { Suspense } from "react";
import EpsCallback from "@/views/EpsCallback";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <EpsCallback />
    </Suspense>
  );
}
