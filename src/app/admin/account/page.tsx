"use client";
import { Suspense } from "react";
import AdminAccount from "@/views/admin/AdminAccount";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminAccount />
    </Suspense>
  );
}
