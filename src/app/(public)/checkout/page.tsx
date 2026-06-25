"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Checkout = dynamic(() => import("@/views/Checkout"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  );
}
