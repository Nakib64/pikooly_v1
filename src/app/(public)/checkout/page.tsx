"use client";
import { Suspense } from "react";
import Checkout from "@/views/Checkout";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  );
}
