"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AdminNotificationLogs = dynamic(() => import("@/views/admin/AdminNotificationLogs"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminNotificationLogs />
    </Suspense>
  );
}
