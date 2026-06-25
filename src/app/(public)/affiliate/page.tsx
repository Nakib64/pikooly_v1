"use client";
import { Suspense } from "react";
import Affiliate from "@/views/Affiliate";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Affiliate />
    </Suspense>
  );
}
