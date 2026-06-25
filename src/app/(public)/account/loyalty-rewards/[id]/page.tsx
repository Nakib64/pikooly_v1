"use client";
import { Suspense } from "react";
import LoyaltyRewardDetail from "@/views/LoyaltyRewardDetail";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoyaltyRewardDetail />
    </Suspense>
  );
}
