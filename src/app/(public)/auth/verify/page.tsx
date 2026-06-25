"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AuthVerify = dynamic(() => import("@/views/AuthVerify"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthVerify />
    </Suspense>
  );
}
