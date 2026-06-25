"use client";

import { Suspense } from "react";
import PageLoader from "@/components/layout/PageLoader";
import ProtectedAdminRoute from "@/components/admin/ProtectedAdminRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAdminRoute>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ProtectedAdminRoute>
  );
}
