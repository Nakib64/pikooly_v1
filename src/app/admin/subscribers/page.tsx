"use client";
import { Suspense } from "react";
import AdminSubscribers from "@/views/admin/AdminSubscribers";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSubscribers />
    </Suspense>
  );
}
