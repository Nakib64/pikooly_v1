"use client";
import { Suspense } from "react";
import AdminLoyaltyGifts from "@/views/admin/AdminLoyaltyGifts";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoyaltyGifts />
    </Suspense>
  );
}
