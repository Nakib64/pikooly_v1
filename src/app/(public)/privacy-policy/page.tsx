"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const PrivacyPolicy = dynamic(() => import("@/views/PrivacyPolicy"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrivacyPolicy />
    </Suspense>
  );
}
