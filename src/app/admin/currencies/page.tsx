"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminCurrencies = dynamic(() => import("@/views/admin/AdminCurrencies"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCurrencies />
    </Suspense>
  );
}
