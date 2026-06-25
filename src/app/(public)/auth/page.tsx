"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Auth = dynamic(() => import("@/views/Auth"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Auth />
    </Suspense>
  );
}
