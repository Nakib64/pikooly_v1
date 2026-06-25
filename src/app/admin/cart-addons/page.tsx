"use client";
import { Suspense } from "react";
import AdminCartAddons from "@/views/admin/AdminCartAddons";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCartAddons />
    </Suspense>
  );
}
