"use client";
import { Suspense } from "react";
import PrivacyPolicy from "@/views/PrivacyPolicy";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrivacyPolicy />
    </Suspense>
  );
}
