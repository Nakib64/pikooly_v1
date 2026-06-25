"use client";

import { Suspense } from "react";
import PageLoader from "@/components/layout/PageLoader";
import ProtectedSellerRoute from "@/components/seller/ProtectedSellerRoute";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedSellerRoute>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ProtectedSellerRoute>
  );
}
