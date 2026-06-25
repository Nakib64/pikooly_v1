"use client";
import { Suspense } from "react";
import RemittancePayment from "@/views/RemittancePayment";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <RemittancePayment />
    </Suspense>
  );
}
