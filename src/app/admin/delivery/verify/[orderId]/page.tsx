"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const DeliveryOTPVerify = dynamic(() => import("@/views/admin/DeliveryOTPVerify"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeliveryOTPVerify />
    </Suspense>
  );
}
