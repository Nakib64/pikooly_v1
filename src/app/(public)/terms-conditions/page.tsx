"use client";
import { Suspense } from "react";
import TermsConditions from "@/views/TermsConditions";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TermsConditions />
    </Suspense>
  );
}
