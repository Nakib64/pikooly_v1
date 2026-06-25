"use client";
import { Suspense } from "react";
import Events from "@/views/Events";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Events />
    </Suspense>
  );
}
