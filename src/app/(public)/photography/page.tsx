"use client";
import { Suspense } from "react";
import Photography from "@/views/Photography";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Photography />
    </Suspense>
  );
}
