"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminAccount = dynamic(() => import("@/views/admin/AdminAccount"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminAccount />
    </Suspense>
  );
}
