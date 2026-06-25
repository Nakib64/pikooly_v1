"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminLoyaltyGifts = dynamic(() => import("@/views/admin/AdminLoyaltyGifts"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoyaltyGifts />
    </Suspense>
  );
}
