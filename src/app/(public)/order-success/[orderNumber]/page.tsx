"use client";
import { Suspense } from "react";
import OrderSuccess from "@/views/OrderSuccess";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrderSuccess />
    </Suspense>
  );
}
