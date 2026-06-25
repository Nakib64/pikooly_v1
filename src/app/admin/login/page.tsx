"use client";
import { Suspense } from "react";
import AdminLogin from "@/views/AdminLogin";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}
