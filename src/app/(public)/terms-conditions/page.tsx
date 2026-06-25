"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const TermsConditions = dynamic(() => import("@/views/TermsConditions"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TermsConditions />
    </Suspense>
  );
}
