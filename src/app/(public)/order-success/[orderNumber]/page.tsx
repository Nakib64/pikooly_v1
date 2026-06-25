"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const OrderSuccess = dynamic(() => import("@/views/OrderSuccess"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrderSuccess />
    </Suspense>
  );
}
