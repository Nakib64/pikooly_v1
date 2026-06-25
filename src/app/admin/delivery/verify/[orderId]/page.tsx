"use client";
import { Suspense } from "react";
import DeliveryOTPVerify from "@/views/admin/DeliveryOTPVerify";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeliveryOTPVerify />
    </Suspense>
  );
}
