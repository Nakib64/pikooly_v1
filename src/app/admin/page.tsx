"use client";
import { Suspense } from "react";
import AdminDashboard from "@/views/AdminDashboard";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
