"use client";
import { Suspense } from "react";
import AdminNotificationLogs from "@/views/admin/AdminNotificationLogs";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminNotificationLogs />
    </Suspense>
  );
}
