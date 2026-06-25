"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const ResetPasswordPhone = dynamic(() => import("@/views/ResetPasswordPhone"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPhone />
    </Suspense>
  );
}
