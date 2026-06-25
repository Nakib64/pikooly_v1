"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Cart = dynamic(() => import("@/views/Cart"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Cart />
    </Suspense>
  );
}
