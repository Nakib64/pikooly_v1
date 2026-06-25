"use client";
import { Suspense } from "react";
import AdminEvents from "@/views/admin/AdminEvents";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminEvents />
    </Suspense>
  );
}
