"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const RemittancePayment = dynamic(() => import("@/views/RemittancePayment"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <RemittancePayment />
    </Suspense>
  );
}
