"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Account = dynamic(() => import("@/views/Account"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Account />
    </Suspense>
  );
}
