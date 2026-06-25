"use client";
import { Suspense } from "react";
import AdminCurrencies from "@/views/admin/AdminCurrencies";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCurrencies />
    </Suspense>
  );
}
