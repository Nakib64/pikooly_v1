"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AuthReset = dynamic(() => import("@/views/AuthReset"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthReset />
    </Suspense>
  );
}
