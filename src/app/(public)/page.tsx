"use client";
import { Suspense } from "react";

import Index from "@/views/Index";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Index />
    </Suspense>
  );
}
