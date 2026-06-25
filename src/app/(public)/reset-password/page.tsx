"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const ResetPassword = dynamic(() => import("@/views/ResetPassword"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
