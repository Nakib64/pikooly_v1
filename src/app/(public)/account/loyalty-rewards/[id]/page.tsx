"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const LoyaltyRewardDetail = dynamic(() => import("@/views/LoyaltyRewardDetail"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoyaltyRewardDetail />
    </Suspense>
  );
}
